# Assistant Desktop v7.0 — Email → Task + Git → Knowledge 통합

## Context

Assistant Desktop v6.1은 범용 플랫폼으로 전환 완료되었다. 이제 엔터프라이즈 업무 자동화의 핵심 두 축을 추가한다:

1. **메일 → 업무 자동화**: Gmail MCP로 메일을 읽고, AI가 분석하여 Closing Plan(일정/태스크) 자동 생성
2. **Git → 지식 + 코드 분석**: GitHub/GitLab MCP로 레거시 소스코드를 색인하고, RAG 채팅 컨텍스트 + 코드 품질 분석 제공

**핵심 원칙**:
- 기존 MCP 인프라(`mcpConnector.ts`) 최대 활용
- 기존 Closing Plan 시스템에 자연스럽게 연결
- 새 모듈은 기존 패턴(Repository → Service → IPC Handler → Preload) 준수

---

## Feature 1: Email → Task Pipeline

### 데이터 흐름

```
Gmail MCP 서버
  ↓ mcpConnector.connect()
메일 목록 조회 (gmail_search_messages)
  ↓
메일 내용 읽기 (gmail_read_message)
  ↓
email_inbox 테이블에 저장 (미러링)
  ↓
LLM 분석 (ChatRuntime.sendMessage)
  "이 메일에서 수행해야 할 업무와 마감일을 추출해줘"
  ↓
ActionItem[] 추출
  ↓
Closing Plan + Steps 자동 생성
  ↓
email_task_links로 원본 메일 ↔ Plan 연결
```

### 시나리오 예시

> 구매팀 김대리가 "3월 송장 처리 요청" 메일 전송
> → AI 분석: "송장 입력 (마감: 3/25)", "거래명세서 확인 (마감: 3/23)"
> → Closing Plan: "[메일] 송장 처리 요청 — 김대리" (target_date: 3/25)
> → Steps: "송장 입력 (3/25)", "거래명세서 확인 (3/23)"

### DB 스키마 (Migration 008)

```sql
-- 메일 로컬 미러 (Gmail MCP → SQLite)
CREATE TABLE email_inbox (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  provider_message_id TEXT UNIQUE NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  received_at TEXT NOT NULL,
  labels_json TEXT DEFAULT '[]',
  is_processed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES configured_sources(id) ON DELETE CASCADE
);

-- 메일 ↔ Closing Plan 연결
CREATE TABLE email_task_links (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  ai_summary TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (email_id) REFERENCES email_inbox(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES closing_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_inbox_processed ON email_inbox(is_processed, received_at DESC);
CREATE INDEX idx_email_task_links_plan ON email_task_links(plan_id);
```

### 신규 파일

| # | 파일 | 역할 |
|---|------|------|
| 1 | `src/main/storage/migrations/008_email_inbox.ts` | email_inbox + email_task_links 테이블 |
| 2 | `src/main/storage/repositories/emailRepository.ts` | EmailInboxRepository + EmailTaskLinkRepository |
| 3 | `src/main/email/emailManager.ts` | 메일 동기화 + AI 분석 + Plan 생성 핵심 로직 |
| 4 | `src/main/email/emailAnalysisPrompt.ts` | LLM 분석 프롬프트 템플릿 |
| 5 | `src/main/ipc/emailHandlers.ts` | Email IPC 핸들러 |
| 6 | `src/renderer/pages/email/EmailInboxPage.tsx` | 메일 인박스 UI |
| 7 | `src/renderer/pages/email/EmailInboxPage.css` | 스타일 |
| 8 | `src/renderer/pages/email/EmailDetailModal.tsx` | 메일 상세 + Plan 생성 UI |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/main/auth/oauthProviders.ts` | Google OAuth scopes에 `gmail.readonly` 추가 |
| `src/main/ipc/channels.ts` | `EMAIL_*` IPC 채널 상수 추가 |
| `src/main/ipc/index.ts` | `registerEmailHandlers(ctx)` 등록 |
| `src/main/ipc/types.ts` | IpcContext에 `emailManager` 추가 |
| `src/main/bootstrap/createRepositories.ts` | emailInboxRepo, emailTaskLinkRepo 추가 |
| `src/main/bootstrap/createServices.ts` | EmailManager 인스턴스 생성 |
| `src/main/storage/migrations/index.ts` | migration008 등록 |
| `src/main/storage/repositories/index.ts` | 신규 Repository 재내보내기 |
| `src/preload/index.ts` | email 관련 API 노출 |
| `src/renderer/stores/appShellStore.ts` | AppSection에 `'email'` 추가 |
| `src/renderer/App.tsx` | Email 페이지 라우팅 |
| `src/renderer/components/Sidebar.tsx` | Email 네비게이션 항목 |

### 핵심 서비스: EmailManager

```typescript
// src/main/email/emailManager.ts
export class EmailManager {
  constructor(
    private mcpConnector: McpConnector,
    private emailInboxRepo: EmailInboxRepository,
    private emailTaskLinkRepo: EmailTaskLinkRepository,
    private closingPlanRepo: ClosingPlanRepository,
    private closingStepRepo: ClosingStepRepository,
    private chatRuntime: ChatRuntime,
    private secureStore: SecureStore,
  ) {}

  // Gmail MCP를 통해 최신 메일 가져와 email_inbox에 저장
  async syncInbox(sourceId: string): Promise<{ added: number; skipped: number }>

  // 메일 내용을 LLM으로 분석하여 Closing Plan + Steps 자동 생성
  async analyzeAndCreatePlan(emailId: string): Promise<{ plan, steps, link }>

  // 인박스 조회
  listInbox(options: { limit?, unprocessedOnly? }): EmailInbox[]
}
```

### IPC 채널

```typescript
// channels.ts에 추가
EMAIL_SYNC_INBOX: 'email:syncInbox',
EMAIL_LIST_INBOX: 'email:listInbox',
EMAIL_GET_DETAIL: 'email:getDetail',
EMAIL_ANALYZE_AND_CREATE_PLAN: 'email:analyzeAndCreatePlan',
EMAIL_LIST_LINKED_PLANS: 'email:listLinkedPlans',
```

---

## Feature 2: Git → Knowledge + Code Analysis

### 데이터 흐름

```
GitHub/GitLab MCP 서버
  ↓ mcpConnector.connect()
리포지토리 파일 목록 조회 (MCP listResources)
  ↓
파일 내용 읽기 (MCP readResource)
  ↓
source_documents 테이블에 색인 (기존 mcpConnector.syncSource 활용)
  ↓
[RAG] 채팅 시 관련 코드 자동 주입 (SkillSourceRegistry 기존 로직)
  ↓
[분석] LLM 기반 코드 품질/리스크 분석 → git_analysis_results 저장
```

### 핵심 인사이트: MCP 재활용

**Git 연동은 별도 GitConnector가 필요 없다.** 기존 `mcpConnector`의 `syncSource()` 메서드가 이미:
1. MCP 서버의 `listResources()` → 파일 목록 조회
2. `readResource(uri)` → 파일 내용 읽기
3. `replaceAllForSource()` → source_documents 저장
4. SHA256 해시 기반 변경 감지

를 수행한다. GitHub/GitLab MCP 서버를 연결하면 **코드 파일이 자동으로 source_documents에 색인**된다.

추가로 필요한 것은 **코드 분석** 기능뿐이다.

### DB 스키마 (Migration 009)

```sql
-- 코드 분석 실행 이력
CREATE TABLE code_analysis_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  total_files INTEGER DEFAULT 0,
  analyzed_files INTEGER DEFAULT 0,
  risks_found INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (source_id) REFERENCES configured_sources(id) ON DELETE CASCADE
);

-- 파일별 분석 결과
CREATE TABLE code_analysis_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  language TEXT,
  risks_json TEXT DEFAULT '[]',
  recommendations_json TEXT DEFAULT '[]',
  complexity_score REAL,
  analyzed_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES code_analysis_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES source_documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_code_analysis_runs_source ON code_analysis_runs(source_id, started_at DESC);
CREATE INDEX idx_code_analysis_results_run ON code_analysis_results(run_id);
```

### 신규 파일

| # | 파일 | 역할 |
|---|------|------|
| 1 | `src/main/storage/migrations/009_code_analysis.ts` | code_analysis_runs + results 테이블 |
| 2 | `src/main/storage/repositories/codeAnalysisRepository.ts` | CodeAnalysisRepository |
| 3 | `src/main/analysis/codeAnalyzer.ts` | LLM 기반 범용 코드 분석기 (CBO 패턴 확장) |
| 4 | `src/main/analysis/analysisPrompts.ts` | 언어별/도메인별 분석 프롬프트 |
| 5 | `src/main/ipc/codeAnalysisHandlers.ts` | 코드 분석 IPC 핸들러 |
| 6 | `src/renderer/pages/analysis/CodeAnalysisPage.tsx` | 코드 분석 결과 UI |
| 7 | `src/renderer/pages/analysis/CodeAnalysisPage.css` | 스타일 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/main/ipc/channels.ts` | `CODE_ANALYSIS_*` 채널 추가 |
| `src/main/ipc/index.ts` | `registerCodeAnalysisHandlers(ctx)` 등록 |
| `src/main/ipc/types.ts` | IpcContext에 codeAnalysisRepo, codeAnalyzer 추가 |
| `src/main/bootstrap/createRepositories.ts` | codeAnalysisRepo 추가 |
| `src/main/bootstrap/createServices.ts` | CodeAnalyzer 인스턴스 생성 |
| `src/main/storage/migrations/index.ts` | migration009 등록 |
| `src/main/storage/repositories/index.ts` | 재내보내기 |
| `src/preload/index.ts` | codeAnalysis 관련 API 노출 |

### 핵심 서비스: CodeAnalyzer

```typescript
// src/main/analysis/codeAnalyzer.ts — CBO 분석기 패턴 확장
export class CodeAnalyzer {
  constructor(
    private providers: LlmProvider[],
    private secureStore: SecureStore,
    private providerResilience: ProviderResilience,
    private codeAnalysisRepo: CodeAnalysisRepository,
    private sourceDocumentRepo: SourceDocumentRepository,
  ) {}

  // 특정 MCP Source의 모든 코드 파일을 분석
  async analyzeSource(sourceId: string): Promise<CodeAnalysisRun>

  // 단일 파일 분석
  async analyzeFile(documentId: string): Promise<CodeAnalysisResult>

  // 언어 감지 (파일 확장자 기반)
  private detectLanguage(filePath: string): string
}
```

### IPC 채널

```typescript
CODE_ANALYSIS_RUN: 'codeAnalysis:run',
CODE_ANALYSIS_RUN_FILE: 'codeAnalysis:runFile',
CODE_ANALYSIS_RUNS_LIST: 'codeAnalysis:runs:list',
CODE_ANALYSIS_RUN_DETAIL: 'codeAnalysis:runs:detail',
CODE_ANALYSIS_PROGRESS: 'codeAnalysis:progress',
```

### RAG 통합

**기존 `SkillSourceRegistry.resolveSkillExecution()` 변경 불필요.**

MCP Source로 등록된 Git 리포의 파일들은 이미 `source_documents`에 저장되므로, 채팅 시 기존 문서 검색 → 컨텍스트 주입 로직이 자동으로 코드 파일도 포함한다. 추가 작업 없음.

---

## 실행 순서

```
Phase 1: 인프라 (2일)
├── Migration 008 (email_inbox, email_task_links)
├── Migration 009 (code_analysis_runs, code_analysis_results)
├── Google OAuth gmail.readonly 스코프 추가
└── Repository 클래스 생성

Phase 2: Email Pipeline (5일, Phase 1 완료 후)
├── EmailManager 서비스
├── Email IPC 핸들러 + channels 등록
├── Preload API 확장
├── Bootstrap 연결 (createServices, createRepositories)
└── Email UI (InboxPage, DetailModal)

Phase 3: Code Analysis (5일, Phase 1 완료 후, Phase 2와 병렬)
├── CodeAnalyzer 서비스
├── CodeAnalysis IPC 핸들러 + channels 등록
├── Preload API 확장
├── Bootstrap 연결
└── CodeAnalysis UI (AnalysisPage)

Phase 4: 통합 + 검증 (2일)
├── Sidebar 네비게이션 추가 (Email, Code Analysis)
├── AppShell 라우팅 업데이트
├── 테스트 작성
└── typecheck + lint + build 검증
```

---

## 수정 파일 요약

| # | 파일 | 상태 | Phase |
|---|------|------|-------|
| 1 | `src/main/storage/migrations/008_email_inbox.ts` | 신규 | 1 |
| 2 | `src/main/storage/migrations/009_code_analysis.ts` | 신규 | 1 |
| 3 | `src/main/storage/migrations/index.ts` | 수정 | 1 |
| 4 | `src/main/storage/repositories/emailRepository.ts` | 신규 | 1 |
| 5 | `src/main/storage/repositories/codeAnalysisRepository.ts` | 신규 | 1 |
| 6 | `src/main/storage/repositories/index.ts` | 수정 | 1 |
| 7 | `src/main/auth/oauthProviders.ts` | 수정 | 1 |
| 8 | `src/main/email/emailManager.ts` | 신규 | 2 |
| 9 | `src/main/email/emailAnalysisPrompt.ts` | 신규 | 2 |
| 10 | `src/main/ipc/emailHandlers.ts` | 신규 | 2 |
| 11 | `src/main/analysis/codeAnalyzer.ts` | 신규 | 3 |
| 12 | `src/main/analysis/analysisPrompts.ts` | 신규 | 3 |
| 13 | `src/main/ipc/codeAnalysisHandlers.ts` | 신규 | 3 |
| 14 | `src/main/ipc/channels.ts` | 수정 | 2+3 |
| 15 | `src/main/ipc/index.ts` | 수정 | 2+3 |
| 16 | `src/main/ipc/types.ts` | 수정 | 2+3 |
| 17 | `src/main/bootstrap/createRepositories.ts` | 수정 | 2+3 |
| 18 | `src/main/bootstrap/createServices.ts` | 수정 | 2+3 |
| 19 | `src/preload/index.ts` | 수정 | 2+3 |
| 20 | `src/renderer/pages/email/EmailInboxPage.tsx` | 신규 | 2 |
| 21 | `src/renderer/pages/email/EmailInboxPage.css` | 신규 | 2 |
| 22 | `src/renderer/pages/email/EmailDetailModal.tsx` | 신규 | 2 |
| 23 | `src/renderer/pages/analysis/CodeAnalysisPage.tsx` | 신규 | 3 |
| 24 | `src/renderer/pages/analysis/CodeAnalysisPage.css` | 신규 | 3 |
| 25 | `src/renderer/stores/appShellStore.ts` | 수정 | 4 |
| 26 | `src/renderer/App.tsx` | 수정 | 4 |
| 27 | `src/renderer/components/Sidebar.tsx` | 수정 | 4 |

**총 27개 파일** (신규 15개, 수정 12개)

---

## 검증

```bash
npm run typecheck   # 모든 tsconfig 통과
npm run test:run    # 기존 테스트 깨짐 없음
npm run lint        # ESLint 통과
npm run build       # 번들 정상 생성
```

수동 검증:
1. Gmail MCP 연결 → 메일 동기화 → 인박스에 표시
2. 메일 선택 → AI 분석 → Closing Plan 자동 생성 확인
3. GitHub MCP 연결 → 리포 파일 색인 → 채팅에서 코드 컨텍스트 확인
4. 코드 분석 실행 → 리스크/권장사항 표시

---

## 설계 결정 근거

| 결정 | 이유 |
|------|------|
| Gmail MCP 활용 (직접 API 아님) | 기존 mcpConnector 재사용, MCP 표준 준수, Outlook 확장 용이 |
| email_inbox 로컬 미러링 | 오프라인 접근, 빠른 검색, 분석 결과 연결 |
| Closing Plan 자동 생성 | 기존 3계층(Plan→Step→Routine) 시스템에 자연스럽게 연결 |
| Git도 MCP 활용 | 별도 GitConnector 불필요, mcpConnector.syncSource() 재사용 |
| CodeAnalyzer 별도 분리 (CBO 아님) | CBO는 ABAP 전용, 새 분석기는 다국어 지원으로 확장 |
| source_documents 테이블 확장 안함 | 기존 스키마로 충분, tags_json에 메타데이터 저장 가능 |
