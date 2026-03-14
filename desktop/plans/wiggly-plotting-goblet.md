# v5.0 통합 계획: GitHub 원격 커밋 머지 + 소스 검색 고도화

## Context

### 현재 상황
- **로컬 (HEAD=2d1de1c)**: v5.0 기능 구현 완료 (미커밋, 28+12 파일)
  - DB 마이그레이션, LLM 스트리밍, 스케줄 자동실행, 정책 엔진, 에러 복원력
- **원격 (origin/main=49cd70a)**: 1커밋 앞서있음 — `feat: expand knowledge workflows and source handoff`
  - 코드랩 → Knowledge 메뉴 이동 (이미 완료!)
  - ProcessHub 1149줄 신규 컴포넌트
  - RoutineKnowledgeLink 시스템 (DB + Repository + IPC + UI)
  - **Skill Registry 소스 검색 고도화** (핵심! 소스 원문 포함 + 키워드 랭킹)

### 해결할 문제
1. 로컬 v5.0 변경과 원격 커밋 충돌 해소 (10+ 파일 충돌 예상)
2. 코드랩 소스를 Chat에서 찾지 못하는 문제 → 원격의 registry 개선 반영
3. 원격 커밋의 미완성/개선 가능 영역 보완

---

## Phase 1: v5.0 로컬 변경 커밋

v5.0 작업을 먼저 커밋하여 merge 기반을 확보한다.

```bash
git add -A
git commit -m "feat(v5.0): DB 마이그레이션 + 스트리밍 + 스케줄 + 정책엔진 + 에러복원력"
```

---

## Phase 2: 원격 머지 + 충돌 해소

```bash
git merge origin/main --no-ff
```

### 충돌 파일별 해소 전략 (10개)

| # | 파일 | 로컬 변경 | 원격 변경 | 해소 전략 |
|---|------|----------|----------|----------|
| 1 | `src/main/index.ts` | schedule/policy repos 추가 | knowledgeLink repo 추가 | **양쪽 모두 유지** — knowledgeLink repo를 initRuntime()에 추가 |
| 2 | `src/main/ipc/types.ts` | schedule/policy 타입 | knowledgeLink 타입 | **양쪽 모두 유지** — IpcContext에 `routineKnowledgeLinkRepo` 추가 |
| 3 | `src/main/storage/sqlite.ts` | migration runner 도입 | knowledge_links 인라인 스키마 | **migration 004 생성** — 인라인 대신 `004_v5_knowledge_links.ts` 마이그레이션으로 전환 |
| 4 | `src/main/storage/repositories.ts` | schedule repos export | knowledgeLink export | **양쪽 모두 유지** |
| 5 | `src/preload/index.ts` | streaming/schedule/policy API | knowledge link API | **양쪽 모두 유지** |
| 6 | `src/renderer/components/Sidebar.tsx` | v4.0→v5.0 버전 | 코드랩 Knowledge로 이동 | **원격 구조 채택 + v5.0 유지** |
| 7 | `src/renderer/__tests__/setup.ts` | v5.0 mock 추가 | knowledge link mock 추가 | **양쪽 mock 모두 추가** |
| 8 | `package.json` | node-cron, version 5.0.0 | scripts, deps | **양쪽 모두 유지** |
| 9 | `CLAUDE.md` | v5.0 문서 | README/docs 변경 | **v5.0 문서 우선, 원격 추가사항 병합** |
| 10 | `src/main/ipc/routineHandlers.ts` | (없음) | knowledge:link/unlink 핸들러 | **원격 채택** |

### 원격에서 가져오는 신규 파일 (충돌 없음)

| 파일 | 설명 |
|------|------|
| `src/renderer/pages/knowledge/ProcessHub.tsx` (1149줄) | 프로세스 관리 UI |
| `src/renderer/pages/knowledge/ProcessHub.css` (698줄) | ProcessHub 스타일 |
| `src/main/storage/repositories/routineKnowledgeLinkRepository.ts` | Knowledge 연결 CRUD |
| `src/renderer/hooks/useRoutineTemplates.ts` | Routine 관련 React hooks |
| `src/renderer/pages/__tests__/KnowledgePage.test.tsx` | Knowledge 페이지 테스트 |
| `src/main/skills/__tests__/registry.test.ts` | Skill registry 테스트 |
| `scripts/check-runtime.mjs`, `scripts/start-electron.mjs` | 실행 스크립트 |
| `.node-version`, `.nvmrc` | Node 버전 파일 |

---

## Phase 3: 핵심 통합 작업

### 3-1. Knowledge 메뉴 네비게이션 통합

**파일**: `src/renderer/components/Sidebar.tsx`

원격의 구조를 채택하되 v5.0 변경(버전 표시, ChatMode 탭 버그 수정)을 유지:

```
SAP 어시스턴트
  ├─ 대화
  ├─ 중요 세션
  └─ 보관함

Knowledge (defaultSubPage: 'code-lab')
  ├─ 프로세스      ← 원격 신규
  ├─ 코드 랩       ← SAP 어시스턴트에서 이동
  ├─ 스킬
  ├─ 에이전트
  └─ 볼트
```

**파일**: `src/renderer/stores/appShellStore.ts` — 원격 버전 채택 (KnowledgeSubPage에 'process', CodeLabSubPage 포함)

**파일**: `src/renderer/pages/KnowledgePage.tsx` — 원격 버전 채택 (ProcessHub + CodeLabMode 렌더링)

### 3-2. DB 마이그레이션에 Knowledge Links 통합

**신규 파일**: `src/main/storage/migrations/004_v5_knowledge_links.ts`

```typescript
export const migration004: Migration = {
  version: 4,
  name: "v5_knowledge_links",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS routine_knowledge_links (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT,
        location TEXT,
        classification TEXT,
        source_type TEXT,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_routine_knowledge_target
      ON routine_knowledge_links(template_id, target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_routine_knowledge_template
      ON routine_knowledge_links(template_id, created_at DESC);
    `);
  },
};
```

`sqlite.ts`에서 원격의 인라인 스키마는 제거하고, migration runner가 처리하도록 통합.

### 3-3. Skill Registry 소스 검색 고도화 (핵심 버그 수정)

**파일**: `src/main/skills/registry.ts` — 원격 버전 전면 채택

원격이 추가한 핵심 개선:
- `buildInlineSourceContext(title, filePath, content)` — 소스 원문을 프롬프트에 포함 (최대 12K자)
- `buildConfiguredSourceContext(title, documents)` — 문서 원문 포함 + 문서당 4K자 제한
- `rankDocumentsForMessage(documents, message)` — 사용자 메시지 키워드로 관련성 정렬
- `truncateForPrompt(content, maxChars)` — 안전한 잘림 처리 ("... (생략)")
- 검색 limit 3 → 10, 랭킹 후 상위 3개 선택

**왜 이전에 소스를 못 찾았나**:
1. 기존: configured-source 문서의 경로/요약만 프롬프트에 포함 → LLM이 원문 모름
2. 개선: 문서 원문(contentText)을 직접 프롬프트 컨텍스트에 포함 → LLM이 실제 코드 참조 가능

### 3-4. CBO 분석 → Chat Handoff 개선

**파일**: `src/main/ipc/cboHandlers.ts` — 원격 채택
- `pickAndAnalyzeCboFile`: 분석 결과에 `sourceContent` 포함
- `AnalysisMode.tsx`의 `handoffToChat()`: `caseContext.sourceContent`에 원문 전달
- Chat에서 후속 질문 시 skill registry가 원문을 프롬프트에 포함

---

## Phase 4: 추가 고도화 (원격 커밋 보완)

### 4-1. ProcessHub ↔ v5.0 RoutineScheduler 연결

현재 ProcessHub는 루틴 템플릿 CRUD만 하고, v5.0의 RoutineScheduler(cron 자동실행)와 연결되지 않음.

**추가 작업**:
- ProcessHub에 "이 프로세스 자동 실행 예약" 버튼 추가
- 클릭 시 `scheduled_tasks` 테이블에 cron 등록
- ProcessHub 상세 화면에 다음 실행 시간 표시

### 4-2. 소스 검색 UX 개선

Chat에서 어떤 소스가 실제로 사용됐는지 사용자에게 피드백:
- 기존 `lastExecutionMeta.sources`에 `"(원문 포함)"` 표시 반영
- Chat 결과에 "참고한 소스 N건" badge 표시 (이미 있음, 정확도 개선)

---

## 수정 파일 전체 목록

### 충돌 해소 (Phase 2) — 10개
1. `src/main/index.ts`
2. `src/main/ipc/types.ts`
3. `src/main/storage/sqlite.ts`
4. `src/main/storage/repositories.ts`
5. `src/main/storage/repositories/index.ts`
6. `src/preload/index.ts`
7. `src/renderer/components/Sidebar.tsx`
8. `src/renderer/__tests__/setup.ts`
9. `package.json` / `package-lock.json`
10. `CLAUDE.md`

### 통합 작업 (Phase 3) — 5개
11. `src/renderer/stores/appShellStore.ts` (원격 채택)
12. `src/renderer/pages/KnowledgePage.tsx` (원격 채택 + 병합)
13. `src/main/skills/registry.ts` (원격 채택)
14. `src/main/ipc/cboHandlers.ts` (원격 채택)
15. `src/main/storage/migrations/004_v5_knowledge_links.ts` (신규)
16. `src/main/storage/migrations/index.ts` (migration004 추가)

### 원격 신규 파일 추가 — 8개
17-24. ProcessHub, ProcessHub.css, routineKnowledgeLinkRepository, useRoutineTemplates, 테스트 2개, 스크립트 2개, 버전 파일 2개

### 고도화 (Phase 4) — 2~3개
25. `src/renderer/pages/knowledge/ProcessHub.tsx` (스케줄 연결 버튼)
26. `src/main/ipc/scheduleHandlers.ts` (ProcessHub 연동)

---

## 검증 계획

### 타입 체크
```bash
npm run typecheck  # 3개 tsconfig 모두 통과 확인
```

### 테스트
```bash
npm run test:run   # 기존 78개 + 신규 테스트 모두 통과
```

### 수동 테스트
1. **소스 검색 확인**: 코드랩에 .ts 파일 추가 → Chat에서 해당 코드 질문 → 원문 기반 응답 확인
2. **네비게이션**: Knowledge → 코드랩/프로세스/스킬/에이전트/볼트 전환 확인
3. **ProcessHub**: 프로세스 생성 → Knowledge 연결 → 실행 이력 확인
4. **탭 버그 수정**: SAP 어시스턴트 → 대화/중요세션/보관함 탭 클릭 정상 작동

### 빌드
```bash
npm run dist:portable  # 포터블 exe 빌드 성공
```
