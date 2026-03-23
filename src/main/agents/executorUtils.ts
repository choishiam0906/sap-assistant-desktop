import type { AgentStep, PipelineContext, StepCondition } from "../types/agent.js";

/** JSON 파싱 시도, 실패 시 null */
export function tryParseJson(text: string): Record<string, unknown> | null {
  try {
    const result = JSON.parse(text);
    return typeof result === "object" && result !== null ? result : null;
  } catch {
    return null;
  }
}

/** StepCondition 평가 */
export function evaluateCondition(
  condition: StepCondition,
  ctx: PipelineContext,
): boolean {
  const refData = ctx.steps.get(condition.reference);
  if (!refData) return false;

  let actual: string;
  if (condition.field && refData.parsed) {
    const fieldValue = getNestedValue(refData.parsed, condition.field);
    actual = fieldValue != null ? String(fieldValue) : "";
  } else {
    actual = refData.raw;
  }

  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "notEquals":
      return actual !== condition.value;
    case "contains":
      return actual.includes(condition.value ?? "");
    case "exists":
      return actual.length > 0;
    default:
      return true;
  }
}

/** 점 표기법으로 중첩 객체 값 접근 (예: "risk.level") */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * DAG 기반 실행 레벨 추출 (위상 정렬).
 * 의존성이 없는 스텝들을 같은 레벨로 그룹화하여 병렬 실행 가능하게 한다.
 */
export function buildExecutionLevels(steps: AgentStep[]): AgentStep[][] {
  const completed = new Set<string>();
  const levels: AgentStep[][] = [];

  while (completed.size < steps.length) {
    const ready = steps.filter((s) => {
      if (completed.has(s.id)) return false;
      const deps = s.dependsOn ?? [];
      return deps.every((d) => completed.has(d));
    });

    if (ready.length === 0) {
      // 순환 의존성 감지 — 남은 스텝을 순차 실행
      const remaining = steps.filter((s) => !completed.has(s.id));
      levels.push(remaining);
      break;
    }

    levels.push(ready);
    for (const s of ready) {
      completed.add(s.id);
    }
  }

  return levels;
}
