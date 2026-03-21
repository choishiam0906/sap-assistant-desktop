/**
 * contracts.ts — 하위 호환성 래퍼
 * 모든 타입과 상수는 types/ 모듈에서 정의되며, 이 파일은 re-export만 담당합니다.
 * 기존 `import { ... } from '../main/contracts.js'` 경로가 깨지지 않도록 유지합니다.
 */
export * from './types/index.js';

// ─── Deprecated aliases (하위 호환) ───
import type { SkillDefinition, SourceDefinition, SourceKind, SourceAvailability } from './types/source.js';
import type { DomainLabel } from './types/session.js';
import { DOMAIN_LABELS } from './types/session.js';

/** @deprecated Use SkillDefinition */
export type SapSkillDefinition = SkillDefinition;
/** @deprecated Use SourceDefinition */
export type SapSourceDefinition = SourceDefinition;
/** @deprecated Use SourceKind */
export type SapSourceKind = SourceKind;
/** @deprecated Use SourceAvailability */
export type SapSourceAvailability = SourceAvailability;
/** @deprecated Use DomainLabel */
export type SapLabel = DomainLabel;
/** @deprecated Use DOMAIN_LABELS */
export const SAP_LABELS = DOMAIN_LABELS;
