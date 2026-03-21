import type { SkillDefinition, SkillPackDefinition } from "./source.js";
import type { RoutineTemplateInput } from "./routine.js";

/**
 * 도메인 라벨 — 도메인별 모듈/카테고리 코드와 이름
 * 예: { code: 'FI', name: 'Financial Accounting' }
 */
export interface DomainLabelInfo {
  code: string;
  name: string;
}

/**
 * DomainPack — 도메인별 프리셋 데이터를 캡슐화하는 인터페이스.
 * SAP, Salesforce, ServiceNow 등 각 도메인을 플러그인처럼 추가할 수 있다.
 */
export interface DomainPack {
  id: string;
  name: string;
  description: string;
  labelDefinitions: DomainLabelInfo[];
  presetSkills: SkillDefinition[];
  skillPacks: SkillPackDefinition[];
  routineTemplates: RoutineTemplateInput[];
  codeAnalyzerEnabled: boolean;
}
