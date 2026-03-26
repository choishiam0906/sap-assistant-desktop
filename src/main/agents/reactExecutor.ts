/**
 * ReAct Executor — Thought/Action/Observation 루프 기반 에이전트 실행
 *
 * 1. LLM에 도구 목록 + 사용자 질문 전달
 * 2. LLM 응답에서 Action 파싱 (```action\n{tool, params}\n```)
 * 3. 도구 실행 → Observation 생성
 * 4. Observation을 LLM에 피드백
 * 5. Final Answer 도달 시 종료 (최대 maxIterations회)
 */

import type { ChatRuntime } from "../chatRuntime.js";
import type { AgentToolkit, AgentToolResult } from "./toolkit.js";
import type { ProviderType } from "../types/provider.js";
import { logger } from "../logger.js";

export interface ReActConfig {
  maxIterations: number;
  toolkit: AgentToolkit;
  provider: ProviderType;
  model: string;
}

export interface ReActStep {
  iteration: number;
  thought: string;
  action?: { tool: string; params: Record<string, unknown> };
  observation?: string;
  isFinal: boolean;
  finalAnswer?: string;
}

export interface ReActResult {
  steps: ReActStep[];
  finalAnswer: string;
  totalDurationMs: number;
  toolsUsed: string[];
}

const DEFAULT_MAX_ITERATIONS = 5;

export class ReActExecutor {
  constructor(
    private readonly chatRuntime: ChatRuntime,
    private readonly config: ReActConfig,
  ) {}

  async execute(
    query: string,
    sessionId?: string,
    onStep?: (step: ReActStep) => void,
  ): Promise<ReActResult> {
    const startTime = Date.now();
    const maxIterations = this.config.maxIterations || DEFAULT_MAX_ITERATIONS;
    const steps: ReActStep[] = [];
    const toolsUsed = new Set<string>();
    let conversationHistory: Array<{ role: string; content: string }> = [];

    try {
      // 시스템 프롬프트 구성
      const systemPrompt = this.buildSystemPrompt();

      // 사용자의 초기 쿼리
      let currentQuery = query;

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const step: ReActStep = {
          iteration: iteration + 1,
          thought: "",
          isFinal: false,
        };

        // LLM 호출
        conversationHistory.push({
          role: "user",
          content: currentQuery,
        });

        let llmResponse: string;
        try {
          const result = await this.chatRuntime.sendMessage({
            provider: this.config.provider,
            model: this.config.model,
            message: this.composePrompt(systemPrompt, conversationHistory),
            skillId: "react-agent", // 기술 ID
            sessionId,
          });

          llmResponse = result.assistantMessage.content;
          conversationHistory.push({
            role: "assistant",
            content: llmResponse,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error({ iteration, error: errorMessage }, "LLM 호출 실패");
          step.thought = `오류: LLM 호출 실패 - ${errorMessage}`;
          step.isFinal = true;
          step.finalAnswer = `에이전트 실행 중 오류가 발생했어요: ${errorMessage}`;
          steps.push(step);
          onStep?.(step);
          break;
        }

        // Thought 추출
        const thoughtMatch = llmResponse.match(/생각\(Thought\):\s*([\s\S]*?)(?=\n\n|행동|$)/);
        if (thoughtMatch) {
          step.thought = thoughtMatch[1].trim();
        }

        // Final Answer 확인
        const answerMatch = llmResponse.match(/```answer\n([\s\S]*?)\n```/);
        if (answerMatch) {
          step.isFinal = true;
          step.finalAnswer = answerMatch[1].trim();
          steps.push(step);
          onStep?.(step);
          break;
        }

        // Action 파싱
        const actionMatch = llmResponse.match(/```action\n([\s\S]*?)\n```/);
        if (actionMatch) {
          try {
            const actionJson = JSON.parse(actionMatch[1].trim());
            const toolName = actionJson.tool as string;
            const toolParams = actionJson.params as Record<string, unknown>;

            step.action = {
              tool: toolName,
              params: toolParams,
            };

            // 도구 실행
            let toolResult: AgentToolResult;
            try {
              toolResult = await this.config.toolkit.executeTool(toolName, toolParams);
              toolsUsed.add(toolName);
            } catch (toolErr) {
              const toolErrorMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
              toolResult = {
                tool: toolName,
                input: toolParams,
                output: JSON.stringify({ error: toolErrorMsg }),
                durationMs: 0,
              };
            }

            step.observation = toolResult.output;
            steps.push(step);
            onStep?.(step);

            // Observation을 다음 쿼리로 사용
            currentQuery = `이전 도구 실행 결과:\n${step.observation}\n\n계속 진행하세요.`;
          } catch (parseErr) {
            logger.warn(
              { iteration, parseError: parseErr },
              "Action JSON 파싱 실패 - 다시 시도"
            );
            step.thought = llmResponse;
            step.isFinal = false;
            steps.push(step);
            onStep?.(step);
            currentQuery = `이전 응답에서 유효한 action 블록을 찾을 수 없었어요. 다시 시도하세요:\n\n${llmResponse}\n\n올바른 형식으로 응답하세요.`;
          }
        } else {
          // Action도 없고 Final Answer도 없음 — Thought만 있음
          step.thought = llmResponse;
          step.isFinal = false;
          steps.push(step);
          onStep?.(step);
          currentQuery = `이전 응답을 계속하세요. 다음 단계로 진행하거나 답변을 제공하세요.`;
        }
      }

      // Final Answer 못 찾은 경우 (최대 반복에 도달)
      if (steps[steps.length - 1] && !steps[steps.length - 1].isFinal) {
        const lastStep = steps[steps.length - 1];
        lastStep.isFinal = true;
        lastStep.finalAnswer = lastStep.thought || "최대 반복 횟수에 도달했어요";
      }

      const finalStep = steps[steps.length - 1];
      const finalAnswer = finalStep?.finalAnswer || "답변을 생성할 수 없었어요";

      return {
        steps,
        finalAnswer,
        totalDurationMs: Date.now() - startTime,
        toolsUsed: Array.from(toolsUsed),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ error: errorMessage }, "ReAct 실행 실패");

      return {
        steps,
        finalAnswer: `에이전트 실행 중 예기치 않은 오류: ${errorMessage}`,
        totalDurationMs: Date.now() - startTime,
        toolsUsed: Array.from(toolsUsed),
      };
    }
  }

  private buildSystemPrompt(): string {
    const toolDescriptions = this.config.toolkit.getToolDescriptions();

    return `당신은 도구를 사용할 수 있는 AI 에이전트입니다.

사용 가능한 도구:
${toolDescriptions}

응답 형식:
1. 생각(Thought): 현재 상황을 분석하세요. 어떤 도구를 사용할지 결정하세요.
2. 행동(Action): 도구를 사용하려면 아래 형식을 사용하세요.
\`\`\`action
{"tool": "도구이름", "params": {"key": "value"}}
\`\`\`
3. 최종 답변(Final Answer): 답변이 준비되면 아래 형식을 사용하세요.
\`\`\`answer
최종 답변 내용
\`\`\`

지침:
- 사용자의 질문을 정확히 이해한 후 도구를 사용하세요.
- 도구의 결과를 분석하고 추가 도구가 필요하면 사용하세요.
- 충분한 정보가 모이면 최종 답변을 제공하세요.
- 응답은 항상 한국어(해요체)로 작성하세요.`;
  }

  private composePrompt(
    systemPrompt: string,
    history: Array<{ role: string; content: string }>,
  ): string {
    const historyText = history
      .map((msg) => {
        const role = msg.role === "user" ? "사용자" : "어시스턴트";
        return `${role}: ${msg.content}`;
      })
      .join("\n\n");

    return `${systemPrompt}\n\n[대화 이력]\n${historyText}`;
  }
}
