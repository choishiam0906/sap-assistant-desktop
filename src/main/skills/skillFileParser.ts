// ─── skill.md 파일 파싱: YAML frontmatter → SkillDefinition 변환 ───

import matter from "gray-matter";
import type { SkillDefinition, SkillOutputFormat } from "../types/source.js";

const VALID_OUTPUT_FORMATS: SkillOutputFormat[] = ["chat-answer", "structured-report", "checklist", "explanation"];
const VALID_DATA_TYPES = ["chat", "cbo"] as const;

export interface SkillParseResult {
  success: boolean;
  skill?: SkillDefinition;
  errors: string[];
}

export function parseSkillFile(content: string, filePath: string): SkillParseResult {
  const errors: string[] = [];

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (err) {
    return { success: false, errors: [`YAML 파싱 실패 (${filePath}): ${String(err)}`] };
  }

  const data = parsed.data as Record<string, unknown>;

  // 필수 필드 검증
  if (!data.id || typeof data.id !== "string") {
    errors.push("id 필드가 없거나 문자열이 아닙니다.");
  }
  if (!data.title || typeof data.title !== "string") {
    errors.push("title 필드가 없거나 문자열이 아닙니다.");
  }
  if (!data.description || typeof data.description !== "string") {
    errors.push("description 필드가 없거나 문자열이 아닙니다.");
  }

  // supportedDataTypes 검증
  if (!Array.isArray(data.supportedDataTypes) || data.supportedDataTypes.length === 0) {
    errors.push("supportedDataTypes 필드가 없거나 빈 배열입니다.");
  } else {
    for (const dt of data.supportedDataTypes) {
      if (!VALID_DATA_TYPES.includes(dt as typeof VALID_DATA_TYPES[number])) {
        errors.push(`유효하지 않은 dataType: ${String(dt)}`);
      }
    }
  }

  // defaultPromptTemplate 검증
  if (!data.defaultPromptTemplate || typeof data.defaultPromptTemplate !== "string") {
    errors.push("defaultPromptTemplate 필드가 없거나 문자열이 아닙니다.");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // outputFormat 검증 (선택 필드, 기본값 있음)
  const outputFormat =
    data.outputFormat && VALID_OUTPUT_FORMATS.includes(data.outputFormat as SkillOutputFormat)
      ? (data.outputFormat as SkillOutputFormat)
      : "chat-answer";

  const skill: SkillDefinition = {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description),
    supportedDataTypes: data.supportedDataTypes as Array<"chat" | "cbo">,
    defaultPromptTemplate: String(data.defaultPromptTemplate),
    outputFormat,
    requiredSources: Array.isArray(data.requiredSources)
      ? (data.requiredSources as string[])
      : [],
    suggestedInputs: Array.isArray(data.suggestedInputs)
      ? (data.suggestedInputs as string[])
      : [],
    domainCodes: Array.isArray(data.domainCodes)
      ? (data.domainCodes as string[])
      : [],
    isCustom: true,
  };

  return { success: true, skill, errors: [] };
}
