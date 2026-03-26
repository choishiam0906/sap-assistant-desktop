// ─── Agent (스킬 조합 워크플로우 자동화) ───

import type { ProviderType } from "./provider.js";

export type AgentCategory = "analysis" | "documentation" | "validation" | "automation";

// ─── 구조화 컨텍스트 ───

/** 스텝 결과를 구조화하여 다음 스텝에 전달 */
export interface StepContextData {
  /** LLM 원본 응답 텍스트 */
  raw: string;
  /** JSON 파싱 성공 시 구조화 데이터, 실패 시 null */
  parsed: Record<string, unknown> | null;
  /** 스텝 메타데이터 */
  metadata: {
    stepId: string;
    skillId: string;
    completedAt: string;
    durationMs: number;
  };
}

/** 파이프라인 전체 컨텍스트 */
export interface PipelineContext {
  /** 스텝별 결과 맵 */
  steps: Map<string, StepContextData>;
  /** 전역 컨텍스트 (에이전트 설정 등) */
  globalContext: Record<string, unknown>;
}

// ─── 조건분기 ───

export type StepConditionOperator = "equals" | "notEquals" | "contains" | "exists";

/** 이전 스텝 결과를 기반으로 실행 여부를 결정 */
export interface StepCondition {
  /** 참조할 스텝 ID */
  reference: string;
  /** 비교 연산자 */
  operator: StepConditionOperator;
  /** 비교 대상 값 (exists 연산자에서는 불필요) */
  value?: string;
  /** parsed 데이터의 JSON 경로 (예: "risk.level"). 없으면 raw 텍스트 사용 */
  field?: string;
}

// ─── 스텝 재시도 ───

export interface StepRetryConfig {
  /** 최대 재시도 횟수 (기본값: 1) */
  maxAttempts: number;
}

// ─── AgentStep 확장 ───

export interface AgentDefinition {
  id: string;
  title: string;
  description: string;
  category: AgentCategory;
  estimatedDuration: number; // seconds
  steps: AgentStep[];
  isCustom?: boolean;
}

export interface AgentStep {
  id: string;
  skillId: string;
  label: string;
  description?: string;
  config: Record<string, unknown>;
  sortOrder: number;
  dependsOn?: string[];
  /** 조건분기 — false 평가 시 "skipped" 처리 */
  executeIf?: StepCondition;
  /** 스텝별 재시도 설정 */
  retry?: StepRetryConfig;
  /** 스텝 타임아웃 (밀리초, 기본: 300_000) */
  timeoutMs?: number;
  /** Provider 오버라이드 (세션 기본값 대신 사용) */
  providerOverride?: ProviderType;
  /** 모델 오버라이드 */
  modelOverride?: string;
  /** 실패 시 대체 스킬 ID */
  fallbackSkillId?: string;
}

// ─── 실행 상태 ───

export type AgentExecutionStatus = "running" | "completed" | "failed" | "cancelled";
export type AgentStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface AgentExecution {
  id: string;
  agentId: string;
  status: AgentExecutionStatus;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  stepResults: AgentStepResult[];
}

export interface AgentStepResult {
  stepId: string;
  skillId: string;
  status: AgentStepStatus;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export interface AgentExecutionSummary {
  id: string;
  agentId: string;
  agentTitle: string;
  status: AgentExecutionStatus;
  startedAt: string;
  completedAt?: string;
  stepCount: number;
  completedSteps: number;
}

// ─── Agent Tool-Use (ReAct) ───

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export interface ReActExecutionInput {
  query: string;
  provider: ProviderType;
  model: string;
  sessionId?: string;
  maxIterations?: number;
}

export interface ReActStepEvent {
  iteration: number;
  thought: string;
  action?: { tool: string; params: Record<string, unknown> };
  observation?: string;
  isFinal: boolean;
  finalAnswer?: string;
}

export interface ReActExecutionResult {
  finalAnswer: string;
  steps: ReActStepEvent[];
  totalDurationMs: number;
  toolsUsed: string[];
}

// ─── 대화형 에이전트 ───

/** 대화형 에이전트 실행 입력 */
export interface InteractiveAgentInput {
  agentId: string;
  /** 사용자가 제공한 초기 입력 데이터 (첫 스텝에 전달) */
  userMessage: string;
  provider: ProviderType;
  model: string;
  /** 기존 채팅 세션에 이어서 실행할 경우 */
  sessionId?: string;
}

/** 스텝 시작 이벤트 (Renderer로 전송) */
export interface AgentStepStartedEvent {
  executionId: string;
  stepId: string;
  stepLabel: string;
  stepIndex: number;
  totalSteps: number;
}

/** 스텝 완료 이벤트 */
export interface AgentStepCompletedEvent {
  executionId: string;
  stepId: string;
  stepLabel: string;
  output: string;
  stepIndex: number;
  totalSteps: number;
  session: unknown;
  assistantMessage: unknown;
  meta: unknown;
}

/** 대화형 실행 완료/실패 이벤트 */
export interface AgentExecutionDoneEvent {
  executionId: string;
  agentId: string;
  status: "completed" | "failed";
  errorMessage?: string;
  sessionId: string;
}

// ─── 진행률 이벤트 (IPC로 Renderer에 전송) ───

export interface AgentExecutionProgress {
  executionId: string;
  agentId: string;
  /** 전체 스텝 수 */
  totalSteps: number;
  /** 완료된 스텝 수 (skipped 포함) */
  completedSteps: number;
  /** 현재 실행 중인 스텝 ID 목록 (병렬 실행 시 여러 개) */
  runningStepIds: string[];
  /** 현재 단계 레이블 요약 */
  currentLabel: string;
}
