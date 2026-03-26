# Enterprise Knowledge Hub v9.0 — AI 검색/RAG/리포트 고도화 계획

## Context

v8.1에서 Dashboard 통합이 완료되었고, 벡터 DB(sqlite-vec) + RAG + 리포트 **백엔드 인프라**는 기술적으로 완성(95-100%)되어 있습니다.

그러나 **실제 end user 가치 전달** 측면에서 고도화가 필요합니다:
- 검색: topK/가중치 하드코딩, 쿼리 확장 없음, 중복 결과, RAG 실패 시 무음
- 임베딩: 매번 전체 재청킹, 순차 처리, 캐시 없음
- 리포트: 3종 프리셋만 존재, 섹션별 RAG 커스터마이징 불가
- Agent: 간접 RAG만 (도구 호출 불가)
- UI: Vault/코드분석이 여전히 남아있어 불필요한 인지 부하

**해결**: 6개 Phase로 나누어 검색/임베딩/리포트/Agent를 고도화하고, 불필요 UI를 정리합니다.

**핵심 원칙**: 현재 sqlite-vec 기반 유지 (외부 클라우드 DB 없음), 하위 호환성, 순수 프론트엔드+서비스 레이어 변경.

---

## Phase 의존성 그래프

```
Phase 1 (UI 정리)     ← 독립, 즉시 시작
    ↓
Phase 2 (검색/RAG)    ← Phase 1 이후
Phase 3 (임베딩)      ← Phase 1 이후, Phase 2와 병렬 가능
    ↓
Phase 4 (리포트)      ← Phase 2 완료 필요 (searchConfig 사용)
Phase 5 (Data Platform) ← Phase 3 완료 권장
    ↓
Phase 6 (Agent)       ← Phase 2,4,5 완료 필요 (도구 등록)
```

**총 LOC**: ~4,900 (테스트 포함 ~6,000)

---

## Phase 1 — UI 정리 (Vault & Code Analysis 제거)

**목표**: Sidebar/Knowledge에서 Vault, Code Analysis 탭 제거 (백엔드 코드 유지)

### 수정 파일 (3개)

| 파일 | 변경 | LOC |
|------|------|-----|
| `src/renderer/components/Sidebar.tsx` | MAIN_NAV_ITEMS Knowledge children에서 vault, code-analysis 항목 제거 (lines 69-71) | -4 |
| `src/renderer/pages/KnowledgePage.tsx` | TAB_META에서 vault, code-analysis 제거 (lines 17, 22), 렌더링 조건문 제거 (lines 43, 45), import 제거 | -8 |
| `src/renderer/stores/appShellStore.ts` | KnowledgeSubPage에서 'vault' 제거 (line 27), pageToSection vault case 제거 (line 71), sectionToPage vault case 제거 (line 84), resolveLegacySection에 vault→process 리다이렉트 추가 | ~10 |

### 레거시 호환
```typescript
// appShellStore.ts resolveLegacySection() 추가
case 'vault': return { section: 'knowledge', subPage: 'process' }
// code-analysis는 이미 리다이렉트 존재 → 제거 (UI에서 접근 불가)
```

### 영향받는 파일 (제거하지 않음, import만 정리)
- `VaultSection.tsx`, `CodeAnalysisPage.tsx` — 파일 유지, KnowledgePage에서 import만 제거
- `ProcessHub.tsx` line 180 — vault 네비게이션 버튼 → process로 변경
- `RelatedKnowledgePanel.tsx` line 60 — vault 링크 → process로 변경

**총 변경**: ~25 LOC

---

## Phase 2 — 검색 & RAG 고도화

**목표**: 검색 품질 개선 + RAG 상태 가시화 + 후속 질문 추천

### 2-1. SearchConfig 타입 + 저장소

**신규**: `src/main/search/searchConfig.ts` (~50 LOC)
```typescript
export interface SearchConfig {
  topK: number               // 1-20, default 5
  vectorWeight: number        // 0-1, default 0.7
  keywordWeight: number       // 0-1, default 0.3
  enableRecencyBoost: boolean // default true
  recencyBoostDays: number    // default 7
  enableDedup: boolean        // default true
  dedupThreshold: number      // cosine sim, default 0.85
  minScore: number            // default 0.01
}
export const DEFAULT_SEARCH_CONFIG: SearchConfig = { ... }
```

**신규**: DB 마이그레이션 `014_search_config.ts`
```sql
CREATE TABLE search_config (key TEXT PRIMARY KEY, value_json TEXT);
CREATE TABLE search_analytics (
  id TEXT PRIMARY KEY, query TEXT, result_count INTEGER,
  top_score REAL, execution_ms INTEGER, created_at TEXT
);
```

### 2-2. HybridSearchEngine 고도화

**수정**: `src/main/search/hybridSearch.ts` (+100 LOC)

추가 기능:
1. **Recency Boost**: `document_chunks.metadata_json`의 `updatedAt` 기준, 최근 N일 문서에 가중치 1.3x
2. **Deduplication**: 동일 document_id 청크 중 최고 점수만 유지 (document-level dedup)
3. **Configurable 파라미터**: `hybridSearch(query, config?: SearchConfig)` 시그니처 확장
4. **검색 분석 로깅**: 실행 시간, 결과 수 자동 기록

기존 코드 재사용:
- `vectorSearch()`, `keywordSearch()` 내부 로직 유지
- RRF 병합 로직에 recency/dedup 후처리 단계 추가

### 2-3. RAG Pipeline 고도화

**수정**: `src/main/search/ragPipeline.ts` (+60 LOC)

추가:
```typescript
export interface RagContext {
  promptContext: string[]
  sources: SourceCitation[]
  searchResults: SearchResult[]
  // 신규
  status: 'success' | 'partial' | 'failed' | 'skipped'
  metrics?: { queryTimeMs: number; resultCount: number; contextTokens: number }
}
```

- `buildContext()` 반환값에 status/metrics 추가
- 실패 시 `status: 'failed'` 반환 (기존 null 대신)

### 2-4. ChatRuntime RAG 상태 전달

**수정**: `src/main/chatRuntime.ts` (+20 LOC)
- RAG status를 스트리밍 메타데이터로 전달 (`IPC.CHAT_RAG_STATUS` 채널)
- per-message RAG on/off: `sendMessage(input, { enableRag: boolean })`

### 2-5. 후속 질문 추천

**신규**: `src/main/search/followUpGenerator.ts` (~60 LOC)
- 검색 결과 기반 후속 질문 3개 생성 (LLM 호출)
- 검색 결과의 제목/키워드에서 관련 질문 도출

### 2-6. UI 컴포넌트

**신규**: `src/renderer/components/RagStatusBadge.tsx` (~60 LOC)
- 채팅 메시지 옆 RAG 상태 아이콘 (✓ 성공 / △ 부분 / ✗ 실패)
- 클릭 시 검색 메트릭 팝오버

**신규**: `src/renderer/components/FollowUpSuggestions.tsx` (~50 LOC)
- 채팅 응답 하단에 추천 질문 칩 3개 표시

**수정**: `src/renderer/pages/dashboard/SearchWidget.tsx` (+20 LOC)
- SearchConfig 슬라이더 (topK, 가중치) 추가 옵션

### 2-7. IPC 핸들러

**신규**: `src/main/ipc/searchConfigHandlers.ts` (~60 LOC)
- `SEARCH_CONFIG_GET`, `SEARCH_CONFIG_SET`
- `SEARCH_ANALYTICS_LIST` (최근 검색 이력)

**Phase 2 총**: ~480 LOC (구현) + ~150 LOC (테스트) = **~630 LOC**

---

## Phase 3 — 임베딩 파이프라인 고도화

**목표**: Incremental 인덱싱, 병렬 처리, 임베딩 캐시

### 3-1. Content Hash 기반 Incremental 인덱싱

**신규**: DB 마이그레이션 `015_embedding_enhancements.ts`
```sql
ALTER TABLE source_documents ADD COLUMN content_hash TEXT;
CREATE TABLE embedding_cache (
  content_hash TEXT PRIMARY KEY, model TEXT,
  embedding BLOB, created_at TEXT
);
```

**수정**: `src/main/embedding/embeddingPipeline.ts` (+50 LOC)
```typescript
async indexDocument(documentId: string): Promise<number> {
  const doc = this.sourceDocRepo.getById(documentId)
  const newHash = createHash('sha256').update(doc.contentText).digest('hex')
  if (newHash === doc.contentHash) return 0  // Skip — 변경 없음
  // 기존 로직: 재청킹 + 재임베딩
  this.sourceDocRepo.updateHash(documentId, newHash)
}
```

### 3-2. 병렬 배치 처리

**수정**: `src/main/embedding/embeddingPipeline.ts` (+30 LOC)
```typescript
async indexSource(sourceId: string, onProgress?: ProgressCallback) {
  const CONCURRENCY = 5
  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const batch = docs.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(d => this.indexDocument(d.id)))
    onProgress?.(Math.min(i + CONCURRENCY, docs.length), docs.length)
  }
}
```

### 3-3. 임베딩 캐시

**신규**: `src/main/embedding/embeddingCache.ts` (~80 LOC)
- `get(contentHash, model)` → cached embedding or null
- `put(contentHash, model, embedding)` → 저장
- `stats()` → { totalEntries, hitRate }

**수정**: `src/main/embedding/embeddingService.ts` (+40 LOC)
- `embedBatch()` 호출 전 캐시 조회, 미캐시분만 API 호출

### 3-4. 메타데이터 인식 청킹

**수정**: `src/main/embedding/documentChunker.ts` (+40 LOC)
- Markdown 헤딩(`#`, `##`) 기준 섹션 분리
- 각 청크에 `{ heading, sectionTitle, lineStart }` 메타데이터 추가
- 기존 코드블록 보존 로직 유지

### 3-5. 모니터링

**신규**: `src/renderer/pages/settings/EmbeddingStatsPanel.tsx` (~80 LOC)
- 캐시 히트율, 전체 청크 수, 인덱싱 상태 표시
- 캐시 초기화 버튼

**Phase 3 총**: ~320 LOC (구현) + ~120 LOC (테스트) = **~440 LOC**

### 성능 예상

| 시나리오 | Before | After | 개선 |
|---------|--------|-------|------|
| 변경 없는 문서 재인덱싱 | 150ms/문서 | 0ms (skip) | ∞ |
| 동일 텍스트 임베딩 | API 호출 | 캐시 조회 | ~30x |
| 100문서 배치 인덱싱 | 순차 180초 | 병렬 ~45초 | ~4x |

---

## Phase 4 — 의사결정 지원 리포트 고도화

**목표**: 템플릿 확장 + 섹션별 RAG + 스트리밍 생성 + 스케줄링

### 4-1. 프리셋 템플릿 확장

**수정**: `src/main/reports/presetTemplates.ts` (+100 LOC)

추가 템플릿 3종:

| 템플릿 | 섹션 | 용도 |
|--------|------|------|
| **운영 의사결정 리포트** | 현황분석 → 옵션평가 → 비용/위험 → 권장사항 | 일상 운영 판단 지원 |
| **장애 분석 리포트** | 장애개요 → 원인분석 → 대응기록 → 개선안 | 인시던트 사후 분석 |
| **비용/성과 분석 리포트** | 성능메트릭 → 리소스 → 비용분석 → 최적화 기회 | KPI 기반 의사결정 |

### 4-2. 섹션별 RAG 커스터마이징

**수정**: `src/main/reports/reportGenerator.ts` (+80 LOC)

```typescript
interface TemplateSectionDef {
  title: string
  prompt: string
  dataSource?: 'rag' | 'static'
  ragQuery?: string        // 신규: 섹션 고유 검색 쿼리
  ragTopK?: number         // 신규: 섹션별 topK (default 5)
}
```

- 각 섹션이 독립적인 RAG 쿼리 실행 가능
- `ragQuery` 미지정 시 기존 동작 (prompt 기반 검색)

### 4-3. 스트리밍 생성

**수정**: `src/main/reports/reportGenerator.ts` (+40 LOC)
- `onSectionChunk?: (sectionIndex: number, chunk: string) => void` 콜백 추가
- 섹션별 스트리밍 진행 상황을 IPC로 전달

### 4-4. 리포트 스케줄링

**신규**: DB 마이그레이션 `016_report_schedules.ts`
```sql
CREATE TABLE report_schedules (
  id TEXT PRIMARY KEY, template_id TEXT, name TEXT,
  cron_expression TEXT, params_json TEXT,
  is_active BOOLEAN, last_run_at TEXT, next_run_at TEXT,
  created_at TEXT
);
```

**신규**: `src/main/reports/reportScheduler.ts` (~100 LOC)
- 기존 `node-cron` (v5.0 RoutineScheduler에서 사용) 재활용
- `scheduleReport(scheduleId)`, `cancelSchedule(scheduleId)`
- 자동 실행 시 `report_runs` 테이블에 결과 저장

### 4-5. UI

**신규**: `src/renderer/pages/dashboard/ReportSchedulePanel.tsx` (~120 LOC)
- 스케줄 목록, 크론 표현식 입력, on/off 토글

**수정**: `src/renderer/pages/dashboard/ReportsWidget.tsx` (+30 LOC)
- 신규 3종 프리셋 빠른 접근 버튼 추가

### 4-6. IPC 핸들러

**수정**: `src/main/ipc/reportHandlers.ts` (+60 LOC)
- `REPORTS_SCHEDULE_CREATE/UPDATE/DELETE/LIST` 추가
- `REPORTS_STREAMING_GENERATE` (스트리밍 채널)

**Phase 4 총**: ~530 LOC (구현) + ~150 LOC (테스트) = **~680 LOC**

---

## Phase 5 — Data Platform Source Provider

**목표**: REST API / 파일 기반 외부 데이터 소스 연결, 자동 임베딩

### 5-1. Source 타입 확장

**수정**: `src/main/types/source.ts` (+20 LOC)
```typescript
export type ConfiguredSourceKind = 'local-folder' | 'mcp' | 'api' | 'data-platform'

export interface DataPlatformConfig {
  endpoint: string           // REST API URL
  authType: 'api-key' | 'bearer' | 'basic'
  dataFormat: 'json' | 'csv' | 'xml'
  syncFrequency: 'manual' | 'daily' | 'weekly'
}
```

### 5-2. Data Platform Provider

**신규**: `src/main/sources/dataPlatformProvider.ts` (~180 LOC)
- REST API 호출 → 응답 데이터를 문서로 변환
- JSON 배열: 각 객체를 개별 문서로 매핑
- CSV: 행별 또는 시트별 문서화
- 자동 content_hash 계산 → incremental sync

**신규**: `src/main/sources/dataTransformer.ts` (~120 LOC)
- `transformJson(data)`: JSON → SourceDocument[]
- `transformCsv(data)`: CSV 문자열 → SourceDocument[]
- 각 문서: `title` (첫 번째 키 값), `contentText` (key: value 포맷)

### 5-3. SourceManager 통합

**수정**: `src/main/sources/sourceManager.ts` (+15 LOC)
```typescript
case 'data-platform': return this.dataPlatformProvider.sync(sourceId)
```

**수정**: `src/main/bootstrap/createServices.ts` (+10 LOC)
- DataPlatformProvider 인스턴스 생성 + SourceManager에 주입

### 5-4. UI

**신규**: `src/renderer/pages/settings/DataPlatformConnector.tsx` (~200 LOC)
- 엔드포인트 URL, 인증 타입, 데이터 포맷 설정
- "연결 테스트" 버튼 → 미리보기 (첫 5행)
- 동기화 주기 설정

### 5-5. IPC 핸들러

**신규**: `src/main/ipc/dataPlatformHandlers.ts` (~80 LOC)
- `DATA_PLATFORM_TEST_CONNECTION` — 연결 테스트
- `DATA_PLATFORM_PREVIEW` — 데이터 미리보기
- `DATA_PLATFORM_SYNC` — 수동 동기화 트리거

**Phase 5 총**: ~625 LOC (구현) + ~150 LOC (테스트) = **~775 LOC**

---

## Phase 6 — AI Agent 고도화 (Tool-Use)

**목표**: Agent가 검색/리포트/데이터 조회를 자율 호출하는 ReAct 패턴 구현

### 6-1. Agent Tool 인터페이스

**신규**: `src/main/agents/agentTools.ts` (~120 LOC)
```typescript
export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string }>
  execute: (params: Record<string, unknown>) => Promise<string>
}

export class AgentToolkit {
  private tools = new Map<string, AgentTool>()

  // 기본 도구 3종
  createSearchTool(search: HybridSearchEngine): AgentTool
  createReportTool(reportGen: ReportGenerator): AgentTool
  createDataQueryTool(dataPlatform: DataPlatformProvider): AgentTool

  toSystemPrompt(): string  // LLM 시스템 프롬프트용 도구 설명
}
```

### 6-2. ReAct Executor

**수정**: `src/main/agents/executor.ts` (+120 LOC)

```typescript
async executeWithTools(
  input: string,
  toolkit: AgentToolkit,
  onStep?: (step: AgentStep) => void
): Promise<AgentResult> {
  const MAX_ITERATIONS = 10
  const steps: AgentStep[] = []

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // 1. LLM Thought → Action 결정
    const response = await this.llm.generate(buildReActPrompt(input, toolkit, steps))

    // 2. FINAL_ANSWER 파싱
    if (response.includes('FINAL_ANSWER:')) {
      return { answer: extractFinalAnswer(response), steps }
    }

    // 3. Tool 호출 파싱 + 실행
    const { toolName, params } = parseToolCall(response)
    const observation = await toolkit.execute(toolName, params)
    steps.push({ thought: response, action: toolName, observation })
    onStep?.({ thought: response, action: toolName, observation })
  }

  return { answer: '최대 반복 횟수에 도달했어요.', steps }
}
```

### 6-3. ChatRuntime 통합

**수정**: `src/main/chatRuntime.ts` (+50 LOC)
- `sendMessageWithTools(input, sessionId)` 메서드 추가
- 세션별 대화 메모리 (최근 10턴 유지)
- 사용자가 "도구 사용" 활성화 시 ReAct 모드 전환

### 6-4. UI

**신규**: `src/renderer/components/AgentStepViewer.tsx` (~150 LOC)
- Thought → Action → Observation 단계별 시각화
- 접을 수 있는 아코디언 UI
- 각 도구 호출 결과 코드블록 표시

**수정**: `src/renderer/pages/assistant/ChatPage.tsx` (+20 LOC)
- "도구 사용" 토글 스위치 추가
- AgentStepViewer 렌더링 조건 추가

### 6-5. IPC

**수정**: `src/main/ipc/chatHandlers.ts` (+30 LOC)
- `CHAT_SEND_WITH_TOOLS` 채널 추가
- `CHAT_AGENT_STEP` 스트리밍 이벤트 (단계별 진행)

**Phase 6 총**: ~490 LOC (구현) + ~150 LOC (테스트) = **~640 LOC**

---

## 파일 변경 총괄

### 수정 파일 (14개)

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `src/renderer/components/Sidebar.tsx` | 1 | vault, code-analysis 항목 제거 |
| `src/renderer/pages/KnowledgePage.tsx` | 1 | TAB_META, 렌더링 조건문 제거 |
| `src/renderer/stores/appShellStore.ts` | 1 | KnowledgeSubPage 타입 축소, 레거시 리다이렉트 |
| `src/main/search/hybridSearch.ts` | 2 | recency boost, dedup, configurable params |
| `src/main/search/ragPipeline.ts` | 2 | status/metrics 반환, config 지원 |
| `src/main/chatRuntime.ts` | 2,6 | RAG status 전달, per-message control, tool-use |
| `src/main/embedding/embeddingPipeline.ts` | 3 | incremental indexing, parallel batch |
| `src/main/embedding/embeddingService.ts` | 3 | cache integration |
| `src/main/embedding/documentChunker.ts` | 3 | heading-aware chunking |
| `src/main/reports/presetTemplates.ts` | 4 | 3종 프리셋 추가 (6종 총) |
| `src/main/reports/reportGenerator.ts` | 4 | 섹션별 RAG, 스트리밍 |
| `src/main/ipc/reportHandlers.ts` | 4 | 스케줄 핸들러 |
| `src/main/sources/sourceManager.ts` | 5 | data-platform case 추가 |
| `src/main/agents/executor.ts` | 6 | ReAct 루프 추가 |

### 신규 파일 (18개)

| 파일 | Phase | LOC |
|------|-------|-----|
| `src/main/search/searchConfig.ts` | 2 | 50 |
| `src/main/search/followUpGenerator.ts` | 2 | 60 |
| `src/main/ipc/searchConfigHandlers.ts` | 2 | 60 |
| `src/renderer/components/RagStatusBadge.tsx` | 2 | 60 |
| `src/renderer/components/FollowUpSuggestions.tsx` | 2 | 50 |
| `src/main/embedding/embeddingCache.ts` | 3 | 80 |
| `src/renderer/pages/settings/EmbeddingStatsPanel.tsx` | 3 | 80 |
| `src/main/reports/reportScheduler.ts` | 4 | 100 |
| `src/renderer/pages/dashboard/ReportSchedulePanel.tsx` | 4 | 120 |
| `src/main/sources/dataPlatformProvider.ts` | 5 | 180 |
| `src/main/sources/dataTransformer.ts` | 5 | 120 |
| `src/main/ipc/dataPlatformHandlers.ts` | 5 | 80 |
| `src/renderer/pages/settings/DataPlatformConnector.tsx` | 5 | 200 |
| `src/main/agents/agentTools.ts` | 6 | 120 |
| `src/renderer/components/AgentStepViewer.tsx` | 6 | 150 |
| DB 마이그레이션 014 | 2 | 30 |
| DB 마이그레이션 015 | 3 | 40 |
| DB 마이그레이션 016 | 4 | 30 |

### 재사용 코드

| 기존 코드 | 위치 | 재사용 |
|-----------|------|--------|
| `vectorSearch()`, `keywordSearch()` | hybridSearch.ts | Phase 2에서 확장 |
| `EmbeddingService.embedBatch()` | embeddingService.ts | Phase 3에서 캐시 래핑 |
| `DocumentChunker.chunk()` | documentChunker.ts | Phase 3에서 heading 인식 추가 |
| `node-cron` + `RoutineScheduler` 패턴 | routineScheduler.ts | Phase 4 스케줄러 참고 |
| `GitHubSourceProvider` 구조 | githubProvider.ts | Phase 5 provider 패턴 참고 |
| `AgentExecutor.executeInteractiveStepAttempt()` | executor.ts | Phase 6에서 ReAct 확장 |
| `ProviderResilience` | providerResilience.ts | 모든 외부 API 호출에 적용 |
| CSS 변수 시스템 | variables.css | 모든 신규 UI |

---

## 검증 방법

### Phase별 자동 검증
```bash
npm run typecheck     # 각 Phase 완료 후
npm run lint          # 각 Phase 완료 후
npm run test:run      # 각 Phase 완료 후
```

### Phase별 수동 검증

| Phase | 검증 항목 |
|-------|----------|
| 1 | Knowledge에서 vault/code-analysis 탭 미표시, 레거시 URL → process 리다이렉트 |
| 2 | 검색 결과에 recency 가중치 반영, RAG 상태 배지 표시, 후속 질문 칩 |
| 3 | 동일 문서 재인덱싱 시 skip 확인, 캐시 히트율 >0%, 병렬 처리 속도 |
| 4 | 신규 3종 프리셋으로 리포트 생성, 스케줄 등록/실행, 스트리밍 진행 |
| 5 | REST API 연결 → 데이터 미리보기 → 동기화 → 검색 결과 반영 |
| 6 | "도구 사용" 토글 ON → 검색/리포트 도구 자동 호출 → 단계별 시각화 |

---

## NOT in scope

- 외부 클라우드 벡터 DB (Pinecone, Weaviate 등) — 현재 sqlite-vec 유지
- 위젯 드래그앤드롭 — v8.2+에서 고려
- 다국어 임베딩 모델 전환 — 현재 text-embedding-3-small 유지
- 실시간 협업 — 단일 사용자 데스크톱 앱
- 이메일 기반 리포트 전송 — 별도 Phase
- Parquet/Delta Lake 네이티브 파싱 — REST API 기반 접근만

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
