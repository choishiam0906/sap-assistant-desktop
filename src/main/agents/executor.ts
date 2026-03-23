import type { BrowserWindow } from "electron";

import type { ChatRuntime } from "../chatRuntime.js";
import type { SkillSourceRegistry } from "../skills/registry.js";
import type { AgentExecutionRepository } from "../storage/repositories/agentExecutionRepository.js";
import type {
  AgentExecution,
  AgentExecutionProgress,
  AgentStep,
  AgentStepStartedEvent,
  AgentStepCompletedEvent,
  AgentExecutionDoneEvent,
  InteractiveAgentInput,
  PipelineContext,
} from "../types/agent.js";
import { DEFAULT_MODELS } from "../types/provider.js";
import { logger } from "../logger.js";
import { IPC } from "../ipc/channels.js";
import { getAgentDefinition } from "./registry.js";
import { tryParseJson, evaluateCondition, buildExecutionLevels } from "./executorUtils.js";

// re-export: 기존 import 호환성 유지
export { buildExecutionLevels } from "./executorUtils.js";

const DEFAULT_TIMEOUT_MS = 300_000; // 5분
const DEFAULT_PROVIDER = "copilot" as const;

export class AgentExecutor {
  private readonly runningExecutions = new Set<string>();

  constructor(
    private readonly chatRuntime: ChatRuntime,
    private readonly skillRegistry: SkillSourceRegistry,
    private readonly executionRepo: AgentExecutionRepository,
    private readonly getMainWindow?: () => BrowserWindow | null,
  ) {}

  async startExecution(agentId: string): Promise<string> {
    const agent = getAgentDefinition(agentId);
    if (!agent) throw new Error(`에이전트를 찾을 수 없습니다: ${agentId}`);

    const execution = this.executionRepo.create(agentId);
    this.runningExecutions.add(execution.id);

    const sortedSteps = [...agent.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const step of sortedSteps) {
      this.executionRepo.upsertStepResult(execution.id, {
        stepId: step.id,
        skillId: step.skillId,
        status: "pending",
      });
    }

    void this.runPipeline(execution.id, agentId).catch(() => {
      // runPipeline 내부에서 에러 처리 완료
    });

    return execution.id;
  }

  getStatus(executionId: string): AgentExecution | null {
    return this.executionRepo.getById(executionId);
  }

  async cancelExecution(executionId: string): Promise<void> {
    this.runningExecutions.delete(executionId);
    this.executionRepo.updateStatus(executionId, "cancelled");
  }

  // ─── 대화형 에이전트 실행 ───

  async startInteractiveExecution(input: InteractiveAgentInput): Promise<string> {
    const agent = getAgentDefinition(input.agentId);
    if (!agent) throw new Error(`에이전트를 찾을 수 없습니다: ${input.agentId}`);

    const execution = this.executionRepo.create(input.agentId);
    this.runningExecutions.add(execution.id);

    const sortedSteps = [...agent.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const step of sortedSteps) {
      this.executionRepo.upsertStepResult(execution.id, {
        stepId: step.id,
        skillId: step.skillId,
        status: "pending",
      });
    }

    // 비동기 파이프라인 실행 — 에러는 IPC 이벤트로 전달
    void this.runInteractivePipeline(execution.id, input).catch((err) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ executionId: execution.id, error: errorMessage }, "대화형 파이프라인 실패");
      this.sendToRenderer(IPC.AGENT_EXECUTION_ERROR, { executionId: execution.id, error: errorMessage });
    });

    return execution.id;
  }

  private async runInteractivePipeline(
    executionId: string,
    input: InteractiveAgentInput,
  ): Promise<void> {
    const agent = getAgentDefinition(input.agentId);
    if (!agent) {
      this.executionRepo.updateStatus(executionId, "failed", "에이전트 정의를 찾을 수 없습니다.");
      this.sendDoneEvent(executionId, input.agentId, "failed", "에이전트 정의를 찾을 수 없습니다.", "");
      return;
    }

    const steps = [...agent.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    const pipelineCtx: PipelineContext = { steps: new Map(), globalContext: {} };

    // 스트리밍 충돌 방지를 위해 모든 스텝을 순차 실행
    let currentSessionId = input.sessionId ?? undefined;
    let hasFailure = false;
    let failureMessage = "";

    try {
      for (let i = 0; i < steps.length; i++) {
        if (!this.runningExecutions.has(executionId)) return;
        if (hasFailure) break;

        const step = steps[i];

        // 조건분기: executeIf 평가
        if (step.executeIf && !evaluateCondition(step.executeIf, pipelineCtx)) {
          this.executionRepo.upsertStepResult(executionId, {
            stepId: step.id,
            skillId: step.skillId,
            status: "skipped",
            completedAt: new Date().toISOString(),
          });
          continue;
        }

        // 스텝 시작 이벤트
        const startedEvent: AgentStepStartedEvent = {
          executionId,
          stepId: step.id,
          stepLabel: step.label,
          stepIndex: i,
          totalSteps: steps.length,
        };
        this.sendToRenderer(IPC.AGENT_STEP_STARTED, startedEvent);

        try {
          const result = await this.executeInteractiveStepAttempt(
            executionId, step, steps, pipelineCtx, input, currentSessionId, i === 0,
          );

          // 동일 세션에 누적
          if (result.sessionId) currentSessionId = result.sessionId;

          // 스텝 완료 이벤트
          const completedEvent: AgentStepCompletedEvent = {
            executionId,
            stepId: step.id,
            stepLabel: step.label,
            output: result.output,
            stepIndex: i,
            totalSteps: steps.length,
            session: result.session,
            assistantMessage: result.assistantMessage,
            meta: result.meta,
          };
          this.sendToRenderer(IPC.AGENT_STEP_COMPLETED, completedEvent);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error({ executionId, stepId: step.id, error: errorMessage }, "대화형 스텝 실패");

          this.executionRepo.upsertStepResult(executionId, {
            stepId: step.id,
            skillId: step.skillId,
            status: "failed",
            completedAt: new Date().toISOString(),
            error: errorMessage,
          });

          hasFailure = true;
          failureMessage = errorMessage;
        }
      }

      if (hasFailure) {
        this.executionRepo.updateStatus(executionId, "failed", failureMessage);
        this.sendDoneEvent(executionId, input.agentId, "failed", failureMessage, currentSessionId ?? "");
      } else {
        this.executionRepo.updateStatus(executionId, "completed");
        this.sendDoneEvent(executionId, input.agentId, "completed", undefined, currentSessionId ?? "");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      this.executionRepo.updateStatus(executionId, "failed", errorMessage);
      this.sendDoneEvent(executionId, input.agentId, "failed", errorMessage, currentSessionId ?? "");
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  private async executeInteractiveStepAttempt(
    executionId: string,
    step: AgentStep,
    allSteps: AgentStep[],
    pipelineCtx: PipelineContext,
    input: InteractiveAgentInput,
    sessionId: string | undefined,
    isFirstStep: boolean,
  ): Promise<{
    output: string;
    sessionId: string;
    session: unknown;
    assistantMessage: unknown;
    meta: unknown;
  }> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    this.executionRepo.upsertStepResult(executionId, {
      stepId: step.id,
      skillId: step.skillId,
      status: "running",
      startedAt: now,
    });

    // 구조화 컨텍스트 구성
    const previousContext = this.buildStructuredContext(step, allSteps, pipelineCtx);

    // 첫 스텝에는 사용자 입력을, 이후 스텝에는 스텝 레이블을 메시지로 사용
    let message: string;
    if (isFirstStep) {
      message = previousContext
        ? `${step.label}을 수행하세요.\n\n사용자 입력:\n${input.userMessage}\n\n이전 단계 결과:\n${previousContext}`
        : `${step.label}을 수행하세요.\n\n사용자 입력:\n${input.userMessage}`;
    } else {
      message = previousContext
        ? `${step.label}을 수행하세요.\n\n이전 단계 결과:\n${previousContext}`
        : `${step.label}을 수행하세요.`;
    }

    const skillDef = this.skillRegistry.resolveSkillExecution({
      skillId: step.skillId,
      context: { dataType: "chat", message },
    });

    const provider = step.providerOverride ?? input.provider;
    const model = step.modelOverride ?? input.model;

    // 타임아웃
    const timeoutMs = step.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const win = this.getMainWindow?.();

      // 스트리밍으로 실행 — 기존 CHAT_STREAM_CHUNK 재사용
      const sendPromise = this.chatRuntime.sendMessageWithStream(
        {
          sessionId,
          provider,
          model,
          message,
          skillId: step.skillId,
          sourceIds: skillDef.meta.sourceIds,
        },
        (chunk) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC.CHAT_STREAM_CHUNK, chunk);
          }
        },
      );

      const result = await Promise.race([
        sendPromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(`스텝 '${step.id}' 타임아웃 (${timeoutMs}ms)`));
          });
        }),
      ]);

      const output = result.assistantMessage.content;
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      // 구조화 컨텍스트에 결과 저장
      pipelineCtx.steps.set(step.id, {
        raw: output,
        parsed: tryParseJson(output),
        metadata: {
          stepId: step.id,
          skillId: step.skillId,
          completedAt,
          durationMs,
        },
      });

      this.executionRepo.upsertStepResult(executionId, {
        stepId: step.id,
        skillId: step.skillId,
        status: "completed",
        startedAt: now,
        completedAt,
        output,
      });

      return {
        output,
        sessionId: result.session.id,
        session: result.session,
        assistantMessage: result.assistantMessage,
        meta: result.meta,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ─── IPC 유틸 ───

  private sendToRenderer(channel: string, data: unknown): void {
    const win = this.getMainWindow?.();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }

  private sendDoneEvent(
    executionId: string,
    agentId: string,
    status: "completed" | "failed",
    errorMessage: string | undefined,
    sessionId: string,
  ): void {
    const event: AgentExecutionDoneEvent = { executionId, agentId, status, errorMessage, sessionId };
    this.sendToRenderer(IPC.AGENT_EXECUTION_DONE, event);
  }

  // ─── DAG 기반 파이프라인 ───

  private async runPipeline(
    executionId: string,
    agentId: string,
  ): Promise<void> {
    const agent = getAgentDefinition(agentId);
    if (!agent) {
      this.executionRepo.updateStatus(executionId, "failed", "에이전트 정의를 찾을 수 없습니다.");
      return;
    }

    const steps = [...agent.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    const pipelineCtx: PipelineContext = {
      steps: new Map(),
      globalContext: {},
    };

    // DAG 레벨별로 스텝 그룹 추출
    const levels = buildExecutionLevels(steps);
    let hasFailure = false;

    try {
      for (const level of levels) {
        if (!this.runningExecutions.has(executionId)) return;
        if (hasFailure) break;

        this.emitProgress(executionId, agentId, steps, pipelineCtx, level);

        // 같은 레벨의 스텝들을 병렬 실행
        const results = await Promise.allSettled(
          level.map((step) =>
            this.executeStep(executionId, step, steps, pipelineCtx),
          ),
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === "rejected") {
            const step = level[i];
            const errorMessage = result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);

            logger.error({ executionId, stepId: step.id, error: errorMessage }, "스텝 실패");

            this.executionRepo.upsertStepResult(executionId, {
              stepId: step.id,
              skillId: step.skillId,
              status: "failed",
              completedAt: new Date().toISOString(),
              error: errorMessage,
            });

            // 실패한 스텝에 의존하는 후속 스텝이 있으면 파이프라인 중단
            const hasDependents = steps.some((s) => s.dependsOn?.includes(step.id));
            if (hasDependents) {
              hasFailure = true;
            }
          }
        }
      }

      if (hasFailure) {
        this.executionRepo.updateStatus(executionId, "failed", "하나 이상의 스텝이 실패했습니다.");
      } else {
        this.executionRepo.updateStatus(executionId, "completed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      this.executionRepo.updateStatus(executionId, "failed", errorMessage);
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  // ─── 단일 스텝 실행 (재시도 + 조건분기 + 타임아웃) ───

  private async executeStep(
    executionId: string,
    step: AgentStep,
    allSteps: AgentStep[],
    pipelineCtx: PipelineContext,
  ): Promise<void> {
    // 조건분기: executeIf 평가
    if (step.executeIf && !evaluateCondition(step.executeIf, pipelineCtx)) {
      this.executionRepo.upsertStepResult(executionId, {
        stepId: step.id,
        skillId: step.skillId,
        status: "skipped",
        completedAt: new Date().toISOString(),
      });
      return;
    }

    const maxAttempts = step.retry?.maxAttempts ?? 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!this.runningExecutions.has(executionId)) return;

      try {
        await this.executeStepAttempt(executionId, step, allSteps, pipelineCtx);
        return; // 성공
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts) {
          logger.warn({ stepId: step.id, attempt }, "스텝 재시도");
        }
      }
    }

    // 모든 재시도 실패 → fallbackSkillId 시도
    if (step.fallbackSkillId) {
      try {
        const fallbackStep: AgentStep = { ...step, skillId: step.fallbackSkillId, fallbackSkillId: undefined };
        await this.executeStepAttempt(executionId, fallbackStep, allSteps, pipelineCtx);
        return;
      } catch {
        // fallback도 실패 시 원본 에러로 throw
      }
    }

    throw lastError ?? new Error(`스텝 '${step.id}' 실패`);
  }

  private async executeStepAttempt(
    executionId: string,
    step: AgentStep,
    allSteps: AgentStep[],
    pipelineCtx: PipelineContext,
  ): Promise<void> {
    const startTime = Date.now();
    const now = new Date().toISOString();

    this.executionRepo.upsertStepResult(executionId, {
      stepId: step.id,
      skillId: step.skillId,
      status: "running",
      startedAt: now,
    });

    // 구조화 컨텍스트 구성
    const previousContext = this.buildStructuredContext(step, allSteps, pipelineCtx);

    const message = previousContext
      ? `${step.label}을 수행하세요.\n\n이전 단계 결과:\n${previousContext}`
      : `${step.label}을 수행하세요.`;

    const skillDef = this.skillRegistry.resolveSkillExecution({
      skillId: step.skillId,
      context: { dataType: "chat", message },
    });

    // Provider 유연성: step override → 기본값
    const provider = step.providerOverride ?? DEFAULT_PROVIDER;
    const model = step.modelOverride ?? DEFAULT_MODELS[provider] ?? "gpt-4o";

    // 타임아웃 적용
    const timeoutMs = step.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const sendPromise = this.chatRuntime.sendMessage({
        provider,
        model,
        message,
        skillId: step.skillId,
        sourceIds: skillDef.meta.sourceIds,
      });

      // AbortSignal 기반 타임아웃 레이싱
      const result = await Promise.race([
        sendPromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(`스텝 '${step.id}' 타임아웃 (${timeoutMs}ms)`));
          });
        }),
      ]);

      const output = result.assistantMessage.content;
      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      // 구조화 컨텍스트에 결과 저장
      pipelineCtx.steps.set(step.id, {
        raw: output,
        parsed: tryParseJson(output),
        metadata: {
          stepId: step.id,
          skillId: step.skillId,
          completedAt,
          durationMs,
        },
      });

      this.executionRepo.upsertStepResult(executionId, {
        stepId: step.id,
        skillId: step.skillId,
        status: "completed",
        startedAt: now,
        completedAt,
        output,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ─── 구조화 컨텍스트 빌더 ───

  private buildStructuredContext(
    step: AgentStep,
    allSteps: AgentStep[],
    pipelineCtx: PipelineContext,
  ): string | undefined {
    if (!step.dependsOn?.length) return undefined;

    const sections: string[] = [];
    for (const depId of step.dependsOn) {
      const depStep = allSteps.find((s) => s.id === depId);
      const ctxData = pipelineCtx.steps.get(depId);
      if (!depStep || !ctxData) continue;

      const label = depStep.label;
      if (ctxData.parsed) {
        sections.push(`[${label} 결과 (구조화)]\n${JSON.stringify(ctxData.parsed, null, 2)}`);
      } else {
        sections.push(`[${label} 결과]\n${ctxData.raw}`);
      }
    }

    return sections.length > 0 ? sections.join("\n\n") : undefined;
  }

  // ─── 진행률 이벤트 ───

  private emitProgress(
    executionId: string,
    agentId: string,
    allSteps: AgentStep[],
    pipelineCtx: PipelineContext,
    currentLevel: AgentStep[],
  ): void {
    const win = this.getMainWindow?.();
    if (!win || win.isDestroyed()) return;

    const completedSteps = pipelineCtx.steps.size;
    const progress: AgentExecutionProgress = {
      executionId,
      agentId,
      totalSteps: allSteps.length,
      completedSteps,
      runningStepIds: currentLevel.map((s) => s.id),
      currentLabel: currentLevel.map((s) => s.label).join(", "),
    };

    win.webContents.send(IPC.AGENTS_EXECUTION_PROGRESS, progress);
  }
}

// 유틸리티 함수 → ./executorUtils.ts로 분리
