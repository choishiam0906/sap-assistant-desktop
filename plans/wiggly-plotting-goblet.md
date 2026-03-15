# v6.0 고도화: UI · 안정성 · 테스트 · DX 전반 개선

## Context

v5.0 기능 구현 + v5.0 코드 정리(Phase 1~4)가 완료된 상태에서, **신규 기능 추가 없이** UI 대형 컴포넌트 분할, 접근성 강화, 캐싱 전략 최적화, Main Process 안정성, 테스트 커버리지 확대, 상태 관리 통일을 수행한다.

**기능 변경 0%** — 동작은 100% 동일하게 유지하면서 코드 품질만 개선.

### 현재 기술 부채 요약
- ProcessHub.tsx 1,149줄 (God Component)
- AgentsCatalog.tsx 430줄, knowledge/SourcesPage.tsx 527줄
- SettingsPage.css 1,353줄 단일 파일
- Main Process 테스트 1/12 (skills/registry.test.ts만 존재)
- React Query staleTime/gcTime 미설정 (전체 기본값)
- Zustand persist 전략 혼재 (수동 localStorage vs persist 미들웨어)
- console.log 직접 사용 2곳 (oauthManager, githubDeviceCode)
- IPC 채널명 문자열 리터럴 분산 (타입 안전성 없음)

---

## Phase A: UI 대형 컴포넌트 분할

### A-1. ProcessHub.tsx (1,149줄 → 8개 모듈)

현재 구조: 6개 인터페이스, 10개 useState, 8개 useQuery/useMutation, 1,100줄 JSX 혼재

**신규 파일:**
- `src/renderer/pages/knowledge/process/ProcessFilterBar.tsx` (~120줄) — 빈도/상태 필터 UI
- `src/renderer/pages/knowledge/process/ProcessListSection.tsx` (~180줄) — 프로세스 목록
- `src/renderer/pages/knowledge/process/ProcessDetailSection.tsx` (~200줄) — 선택 프로세스 상세
- `src/renderer/pages/knowledge/process/ProcessEditorModal.tsx` (~250줄) — 생성/편집 모달 + 스텝 폼
- `src/renderer/pages/knowledge/process/RelatedKnowledgePanel.tsx` (~150줄) — Vault/문서 연결 패널
- `src/renderer/pages/knowledge/process/useProcessHub.ts` (~100줄) — 데이터 페칭 훅 추출

**수정 파일:**
- `src/renderer/pages/knowledge/ProcessHub.tsx` — 1,149줄 → ~150줄 (오케스트레이션 + 레이아웃)

**원칙:** 인터페이스(`ProcessDraft`, `ProcessDetail` 등)와 상수(`MODULE_OPTIONS`)는 부모에 유지, props로 전달.

### A-2. AgentsCatalog.tsx (430줄 → 4개 모듈)

**신규 파일:**
- `src/renderer/pages/knowledge/agents/AgentListSection.tsx` (~120줄) — 프리셋/커스텀 탭 + 목록
- `src/renderer/pages/knowledge/agents/AgentDetailPanel.tsx` (~100줄) — 선택 에이전트 상세 + 실행
- `src/renderer/pages/knowledge/agents/AgentExecutionList.tsx` (~80줄) — 실행 이력

**수정 파일:**
- `src/renderer/pages/knowledge/AgentsCatalog.tsx` — 430줄 → ~130줄

### A-3. knowledge/SourcesPage.tsx (527줄 → 3개 모듈)

현재: 로컬 폴더 + MCP 탭이 하나의 컴포넌트에 혼재, useState 12개

**신규 파일:**
- `src/renderer/pages/knowledge/sources/KnLocalFolderTab.tsx` (~200줄) — 로컬 폴더 관리
- `src/renderer/pages/knowledge/sources/KnMcpTab.tsx` (~200줄) — MCP 서버 관리

**수정 파일:**
- `src/renderer/pages/knowledge/SourcesPage.tsx` — 527줄 → ~80줄 (탭 라우터)

**주의:** `pages/sources/` (SapAssistant 소스 탭)과 네이밍 충돌 방지 → `Kn` 접두사 사용

### A-4. SettingsPage.css 모듈화 (1,353줄)

**신규 파일:**
- `src/renderer/pages/settings/settings-common.css` (~200줄) — 공유 레이아웃
- `src/renderer/pages/settings/PolicySettingsPage.css` (~250줄) — 정책 페이지 전용
- `src/renderer/pages/settings/AiSettingsPage.css` (~100줄) — AI 설정 전용
- 기타 설정 페이지별 CSS (6~8개, 각 60~100줄)

**수정 파일:**
- `src/renderer/pages/SettingsPage.css` — **삭제**
- `src/renderer/pages/SettingsPage.tsx` — import 경로 수정
- 각 설정 페이지 .tsx — 자기 CSS import 추가

**예상: 수정 ~5, 신규 ~20, 삭제 1**

---

## Phase B: 접근성(a11y) 강화

### B-1. ARIA 속성 보강

**수정 파일 (모든 UI 컴포넌트 + 페이지):**
- 모달 → `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- 드롭다운 → `aria-expanded`, `aria-haspopup`
- 로딩 영역 → `aria-busy`, `aria-live="polite"`
- 인터랙티브 아이콘 버튼 → `aria-label` 추가

**대상 파일:** ~15개 (ProcessHub, AgentsCatalog, SourcesPage, CockpitPage, ChatPage 등)

### B-2. 키보드 네비게이션 & 포커스 관리

**신규 파일:**
- `src/renderer/hooks/useFocusTrap.ts` (~60줄) — 모달 포커스 갇히기
- `src/renderer/hooks/useKeyboardNav.ts` (~50줄) — 리스트 화살표 키 탐색

**수정 파일:**
- 모달 사용 컴포넌트 — useFocusTrap 통합
- ActionMenu, DropdownSelect — useKeyboardNav 통합

**예상: 수정 ~15, 신규 2**

---

## Phase C: React Query 캐싱 전략

### C-1. queryKey 팩토리 패턴

**신규 파일:**
- `src/renderer/hooks/queryKeys.ts` (~80줄)

```typescript
export const queryKeys = {
  sessions: { all: ['sessions'] as const, list: (limit: number) => ['sessions', limit] as const },
  messages: { all: (sid: string) => ['messages', sid] as const },
  routines: { templates: () => ['routine:templates'] as const, ... },
  closing:  { plans: () => ['closing:plans'] as const, ... },
  agents:   { all: () => ['agents'] as const, ... },
  // ...
}
```

### C-2. staleTime/gcTime 도메인별 명시

**수정 파일 (11개 훅):**

| 훅 | staleTime | gcTime | 근거 |
|----|-----------|--------|------|
| useMessages | 24시간 | 7일 | 과거 메시지 불변 |
| useSessions | 30초 | 5분 | 중간 빈도 갱신 |
| useRoutineTemplates | 60초 | 10분 | 정의 변경 드묾 |
| useClosingPlans | 60초 | 10분 | 계획 변경 드묾 |
| useAuditLogs | 30초 | 2분 | 빠른 갱신 필요 |
| useCboRuns | 15초 | 5분 | 분석 중 갱신 |
| useVault | 60초 | 10분 | 변경 드묾 |

### C-3. QueryClient 기본값 + 전역 에러 핸들러

**신규 파일:**
- `src/renderer/lib/queryClient.ts` (~30줄) — QueryClient 생성 + 기본 옵션

**수정 파일:**
- `src/renderer/main.tsx` — 인라인 QueryClient → import로 교체

**예상: 수정 ~12, 신규 2**

---

## Phase D: Main Process 안정성

### D-1. console.log → logger 전환

**수정 파일:**
- `src/main/auth/oauthManager.ts` — console.log 6곳 → logger.debug/info
- `src/main/auth/githubDeviceCode.ts` — console.log → logger.debug

### D-2. IPC 채널명 타입 상수화

**신규 파일:**
- `src/main/ipc/channels.ts` (~120줄) — 전체 IPC 채널명 상수 + 타입

```typescript
export const IPC = {
  AUTH_SET_API_KEY: 'auth:setApiKey',
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream-message',
  // ... 119개 채널
} as const
export type IpcChannel = typeof IPC[keyof typeof IPC]
```

**수정 파일:**
- `src/main/ipc/*.ts` (11개 핸들러) — 문자열 → `IPC.CHANNEL_NAME`
- `src/preload/index.ts` — 문자열 → `IPC.CHANNEL_NAME`

### D-3. 마이그레이션 에러 처리

**수정 파일:**
- `src/main/storage/migrationRunner.ts` — run() 내 개별 마이그레이션 try-catch + 로깅

**예상: 수정 ~15, 신규 1**

---

## Phase E: 테스트 커버리지 확대

### E-1. Main Process 테스트 추가

**신규 파일:**
- `src/main/auth/__tests__/oauthManager.test.ts` (~150줄)
- `src/main/auth/__tests__/secureStore.test.ts` (~100줄)
- `src/main/auth/__tests__/pkce.test.ts` (~80줄)
- `src/main/policy/__tests__/policyEngine.test.ts` (~120줄)
- `src/main/storage/__tests__/migrationRunner.test.ts` (~100줄)
- `src/main/services/__tests__/routineExecutor.test.ts` (~100줄)

### E-2. vitest coverage threshold 설정

**수정 파일:**
- `vitest.config.ts` — coverage 섹션에 threshold 추가

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json-summary'],
  thresholds: { lines: 40, functions: 40, branches: 30 },
}
```

### E-3. Main Process 테스트 환경 설정

**신규 파일:**
- `src/main/__tests__/setup.ts` (~30줄) — better-sqlite3 mock, logger mock

**수정 파일:**
- `vitest.config.ts` — Main process 테스트용 별도 설정 (environment: 'node')

**예상: 수정 2, 신규 7~8**

---

## Phase F: Zustand 전략 통일

### F-1. 수동 localStorage → persist 미들웨어 통일

**수정 파일:**
- `src/renderer/stores/workspaceStore.ts` — 수동 localStorage → persist 미들웨어
- `src/renderer/stores/settingsStore.ts` — 분산된 개별 persist → 통합 persist

**패턴:**
```typescript
// Before (수동)
const domainPack = localStorage.getItem('domainPack') || 'ops'
set({ domainPack }); localStorage.setItem('domainPack', domainPack)

// After (persist 미들웨어)
create<State>()(persist((set) => ({ domainPack: 'ops', ... }), {
  name: 'workspace-store',
  partialize: (s) => ({ domainPack: s.domainPack }),
}))
```

### F-2. partialize 패턴 확대

휘발성 상태(isLoading, error 등)는 저장하지 않도록 partialize 적용.

**수정 파일:** 5~6개 스토어

**예상: 수정 ~6, 신규 0**

---

## 실행 순서 및 의존성

```
Phase A (UI 분할) ──────────────────────┐
                                        ├─→ Phase B (a11y, A 분할 후 적용)
Phase C (React Query, A와 독립) ────────┘
Phase D (Main Process, 독립) ───────────→ Phase E (테스트, D 후)
Phase F (Zustand, 독립)
```

**병렬 실행 가능:**
- A + C + D + F는 서로 독립 (파일 겹침 없음)
- B는 A 이후 (분할된 컴포넌트에 a11y 적용)
- E는 D 이후 (logger, 채널 타입화 후 테스트 작성)

**Teammate 에이전트 병렬 전략:**
- **Agent 1**: Phase A (UI 분할) — frontend-builder
- **Agent 2**: Phase C (React Query) — frontend-builder
- **Agent 3**: Phase D (Main Process 안정성) — backend-builder
- **Agent 4**: Phase F (Zustand 통일) — frontend-builder
- 완료 후 → Agent 5: Phase B (a11y) — frontend-builder
- 완료 후 → Agent 6: Phase E (테스트) — test-writer

---

## Phase별 검증

| Phase | 검증 명령 | 기준 |
|-------|----------|------|
| A | `npm run typecheck && npm run test:run` | 83개 테스트 통과, 0 TS 에러 |
| B | `npm run typecheck && npm run lint` | a11y 속성 추가 확인 |
| C | `npm run typecheck && npm run test:run` | 기존 테스트 통과 |
| D | `npm run typecheck && npm run test:run` | 기존 테스트 통과 |
| E | `npm run test:run && npm run test:coverage` | 커버리지 40%+ |
| F | `npm run typecheck && npm run test:run` | 기존 테스트 통과 |

**최종:** `npm run verify`

---

## 수정 파일 요약

| Phase | 수정 | 신규 | 삭제 |
|-------|------|------|------|
| A | ~5 | ~20 | 1 |
| B | ~15 | 2 | 0 |
| C | ~12 | 2 | 0 |
| D | ~15 | 1 | 0 |
| E | 2 | ~8 | 0 |
| F | ~6 | 0 | 0 |
| **합계** | **~55** | **~33** | **1** |

**각 Phase 완료 후 커밋하여 원자적 롤백 가능하게 유지.**
