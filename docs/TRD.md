# TRD (Technical Requirements Document)
# SAP 운영 자동화 AI 봇

## 1. 시스템 아키텍처

```
┌─────────────────────────────────┐
│ Electron Desktop Client (v2.5) │
│ ┌─────────┐ ┌────────────────┐ │
│ │ Chat UI │ │ CBO Analysis   │ │
│ │ Settings│ │ Session Mgmt   │ │
│ └────┬────┘ └───────┬────────┘ │
│      │ IPC (15 channels)       │
│ ┌────▼─────────────────────┐   │
│ │ Main Process             │   │
│ │ - OAuth (Codex/Copilot)  │   │
│ │ - Chat Runtime           │   │
│ │ - CBO Analyzer           │   │
│ │ - SQLite Storage         │   │
│ └────────────┬─────────────┘   │
└──────────────┼─────────────────┘
               │ HTTP (보조 API)
┌──────────────▼─────────────────┐
│ FastAPI Backend                │
│ - Knowledge API (CRUD + bulk) │
│ - Health / Stats              │
│ - MCP Server (6 tools)        │
└────────────────────────────────┘
```

---

## 2. 기술 스택

| 레이어 | 기술 | 버전 | 선택 이유 |
|--------|------|------|----------|
| Backend Runtime | Python | 3.12+ | AI/LLM 생태계, pyrfc 호환성 |
| Backend Framework | FastAPI | 0.115+ | 비동기 지원, 자동 OpenAPI 문서, 타입 검증 |
| Desktop Runtime | Electron + TypeScript | 31+ / 5.7+ | 사용자 OAuth, 로컬 실행, 세션 제어 |
| Desktop Renderer | React | 18.3+ | 컴포넌트 기반 UI, 풍부한 생태계 |
| 상태 관리 | Zustand | 5.0+ | 경량, 보일러플레이트 최소, React 18 호환 |
| 서버 상태 | @tanstack/react-query | 5.60+ | 캐싱, staleTime 관리, 자동 리페칭 |
| 아이콘 | lucide-react | 0.577+ | 트리 셰이킹, 일관된 아이콘 세트 |
| 마크다운 | react-markdown | 9.0+ | GFM 지원, 플러그인 확장 |
| 마크다운 플러그인 | remark-gfm, rehype-highlight, rehype-sanitize | latest | 테이블/체크박스, 코드 하이라이팅, XSS 방지 |
| Desktop Storage | better-sqlite3 | 11.8+ | 동기 SQLite, Electron 호환 |
| 자격증명 저장 | keytar | 7.9+ | OS 키체인 연동 (SecureStore) |
| LLM Provider | Codex + Copilot | API Key | 사용자 계정 기반 인증 |
| Embedding | Legacy (Azure OpenAI) | text-embedding-ada-002 | 기존 지식 인덱스 호환 목적 |
| Vector DB | ChromaDB | 0.5+ | 로컬 개발 용이, Python 네이티브 |
| RDBMS | PostgreSQL | 16+ | Supabase 호환, JSON 지원 |
| ORM | SQLAlchemy | 2.0+ | 비동기 지원, 타입 안전성 |
| Admin Frontend | React + Vite | 18+ / 6+ | 지식 CRUD 관리 화면 |
| Build Tool | Vite | 6.0+ | 빠른 HMR, TypeScript 네이티브 |

---

## 3. API 설계

### 3.1 Desktop IPC 채널 (15개)

Electron preload (`window.sapOpsDesktop`)를 통해 아래 IPC 채널을 제공한다. 모든 채널은 `ipcRenderer.invoke()` 기반 비동기 호출이다.

#### 인증 (3개)

| Channel | 메서드 | 입력 | 설명 |
|---------|--------|------|------|
| `auth:setApiKey` | `setApiKey(input)` | `{ provider, apiKey }` | API Key를 SecureStore에 저장 |
| `auth:status` | `getAuthStatus(provider)` | `ProviderType` | 인증 상태 조회 |
| `auth:logout` | `logout(provider)` | `ProviderType` | 저장된 자격증명 삭제 |

#### 채팅 (3개)

| Channel | 메서드 | 입력 | 설명 |
|---------|--------|------|------|
| `chat:send` | `sendMessage(input)` | `{ sessionId?, provider, model, message }` | 메시지 전송 (스트리밍 응답) |
| `sessions:list` | `listSessions(limit)` | `limit=50` | 세션 목록 조회 |
| `sessions:messages` | `getSessionMessages(id, limit)` | `sessionId, limit=100` | 세션 메시지 조회 |

#### CBO 분석 (9개)

| Channel | 메서드 | 입력 | 설명 |
|---------|--------|------|------|
| `cbo:analyzeText` | `analyzeCboText(input)` | `{ fileName, content, provider?, model? }` | 텍스트 직접 분석 |
| `cbo:analyzeFile` | `analyzeCboFile(input)` | `{ filePath, content, provider?, model? }` | 단일 파일 분석 |
| `cbo:analyzeFolder` | `analyzeCboFolder(input)` | `{ folderPath, recursive?, skipUnchanged?, provider?, model? }` | 폴더 배치 분석 |
| `cbo:pickAndAnalyzeFile` | `pickAndAnalyzeCboFile(input?)` | `{ provider?, model? }` | 파일 선택 다이얼로그 + 분석 |
| `cbo:pickAndAnalyzeFolder` | `pickAndAnalyzeCboFolder(input?)` | `{ recursive, skipUnchanged, provider?, model? }` | 폴더 선택 다이얼로그 + 배치 |
| `cbo:runs:list` | `listCboRuns(limit)` | `limit=20` | 분석 이력 조회 |
| `cbo:runs:detail` | `getCboRunDetail(runId, limit)` | `runId, limitFiles=500` | Run 상세 (파일별 결과) |
| `cbo:runs:syncKnowledge` | `syncCboRunKnowledge(input)` | `{ runId }` | Knowledge API로 동기화 |
| `cbo:runs:diff` | `diffCboRuns(input)` | `{ fromRunId, toRunId }` | 두 Run 간 리스크 diff |

### 3.2 Knowledge API

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/v1/knowledge` | 지식 목록 (페이지네이션, 카테고리 필터) |
| `POST` | `/api/v1/knowledge` | 지식 추가 |
| `POST` | `/api/v1/knowledge/bulk` | 지식 일괄 추가 (Desktop CBO sync, `source_type=source_code`) |
| `PUT` | `/api/v1/knowledge/{id}` | 지식 수정 |
| `DELETE` | `/api/v1/knowledge/{id}` | 지식 삭제 |
| `POST` | `/api/v1/knowledge/ingest` | 문서 업로드 → 벡터화 |

### 3.3 System API

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/v1/health` | 헬스체크 (DB, 런타임 모드 상태) |
| `GET` | `/api/v1/runtime` | 런타임 모드(`desktop_oauth`) 조회 |
| `GET` | `/api/v1/stats` | 사용 통계 (질의 수, 카테고리별 분포) |
| `GET` | `/api/v1/chat/skills` | 사용 가능한 스킬 목록 |

---

## 4. Desktop Renderer 아키텍처

### 4.1 페이지 구조

| 페이지 | 파일 | 설명 |
|--------|------|------|
| **ChatPage** | `pages/ChatPage.tsx` | 세션 리스트 + 메시지 타임라인 + Composer |
| **CboPage** | `pages/CboPage.tsx` | 텍스트/파일/이력 3탭 분석 인터페이스 |
| **SettingsPage** | `pages/SettingsPage.tsx` | Craft 스타일 테마 + Connections 관리 |

### 4.2 상태 관리 (Zustand Stores)

| Store | 파일 | 관리 상태 |
|-------|------|----------|
| **chatStore** | `stores/chatStore.ts` | input, provider, model, isStreaming, streamingContent, streamingMeta, error |
| **cboStore** | `stores/cboStore.ts` | tab, busy, status, error, fileName, sourceText, useLlm, provider, model, result, selectedRunId, fromRunId, diffResult |
| **settingsStore** | `stores/settingsStore.ts` | theme, defaultProvider, defaultModel (localStorage 영속화) |

### 4.3 컴포넌트 구조

```
renderer/
├── App.tsx                       # QueryClientProvider + 3페이지 라우팅
├── main.tsx                      # ReactDOM 엔트리포인트
├── components/
│   ├── Sidebar.tsx               # 접이식 내비게이션 (Chat, CBO, Settings)
│   ├── MarkdownRenderer.tsx      # GFM + 코드 하이라이팅 + XSS 방지
│   ├── chat/
│   │   ├── Composer.tsx          # 입력창 + Provider/Model 선택 + 전송 버튼
│   │   ├── MessageList.tsx       # 메시지 목록 + 자동 스크롤 + 피드백
│   │   └── SessionList.tsx       # 세션 목록 + 새 채팅 생성 + Skeleton 로딩
│   ├── cbo/
│   │   ├── LlmOptions.tsx        # LLM 보강 토글 + Provider/Model 선택
│   │   ├── ResultPanel.tsx       # 분석 요약 + 리스크 테이블 + 권고 카드
│   │   ├── DiffPanel.tsx         # 신규/해소/지속 리스크 비교 테이블
│   │   └── RunsTable.tsx         # 실행 이력 테이블 (ID, 모드, 파일 수, 시간)
│   └── ui/
│       ├── Badge.tsx             # variant: success/error/warning/info/neutral
│       ├── Button.tsx            # variant: primary/secondary/danger/ghost, size: sm/md/lg
│       ├── Skeleton.tsx          # Skeleton, SkeletonText, SkeletonMessage, SkeletonTableRow
│       └── Tooltip.tsx           # position: top/bottom/left/right
└── styles/
    ├── global.css                # 기본 HTML/body 스타일
    ├── variables.css             # CSS 커스텀 속성 (색상, 간격, 타이포그래피)
    └── animations.css            # 페이지 전환 (page-enter, fade-in)
```

### 4.4 테마 시스템

- `settingsStore`의 `theme` 값 (`system` | `light` | `dark`)에 따라 `document.documentElement`의 `data-theme` 속성 설정
- CSS Custom Properties (`variables.css`)가 `[data-theme]` 셀렉터로 전환
- `system` 선택 시 `prefers-color-scheme` 미디어 쿼리 연동
- localStorage (`sap-ops-theme`)에 영속화

---

## 5. CBO 분석 아키텍처

### 5.1 분석 파이프라인

```
소스 텍스트 입력
    ↓
Parser (parser.ts)
    - 라인 분할, 주석 제거, 토큰화
    ↓
Rules Engine (rules.ts) — 5개 정적 규칙
    ├── EXEC SQL 사용 감지
    ├── SELECT * 사용 감지
    ├── MESSAGE TYPE 'X' 사용 감지
    ├── LOOP 내부 COMMIT WORK 감지
    └── AUTHORITY-CHECK 부재 감지
    ↓
Analyzer (analyzer.ts)
    - 규칙 매칭 → 리스크 목록 생성
    - severity (high/medium/low) 분류
    - 권고사항(recommendations) 생성
    ↓
[선택적] LLM 보강
    - Provider/Model 지정
    - 규칙 분석 결과 + 소스를 LLM에 전달
    - 실무 개선 포인트 도출
    ↓
CboAnalysisResult
    { summary, risks[], recommendations[], metadata }
```

### 5.2 배치 런타임 (batchRuntime.ts)

- 폴더 재귀 스캔 (`.txt`, `.md` 파일 필터)
- SHA-256 해시 기반 중복 건너뛰기 (`skipUnchanged` 옵션)
- 파일당 최대 1MB, UTF-8 텍스트만 허용
- 결과를 SQLite `cbo_runs` / `cbo_run_files` 테이블에 저장

### 5.3 리스크 Diff

두 Run(`fromRunId`, `toRunId`)의 파일별 리스크를 비교하여:
- **신규 리스크** (added): toRun에만 존재
- **해소된 리스크** (resolved): fromRun에만 존재
- **지속 리스크** (persisted): 양쪽 모두 존재

---

## 6. 데이터 모델

### 6.1 Desktop SQLite

Desktop은 로컬 SQLite에 세션, 메시지, CBO 실행 이력을 저장한다.

| 테이블 | 용도 |
|--------|------|
| `sessions` | 채팅 세션 (id, provider, model, created_at) |
| `messages` | 채팅 메시지 (session_id, role, content, sources, skill_used) |
| `cbo_runs` | CBO 분석 실행 (id, mode, created_at) |
| `cbo_run_files` | CBO 파일별 결과 (run_id, file_name, hash, risks, recommendations) |
| `auth_tokens` | 인증 정보 참조 (keytar SecureStore와 연동) |

### 6.2 Backend PostgreSQL

#### knowledge_items
```sql
CREATE TABLE knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,      -- 데이터분석, 오류분석, 역할관리, CTS관리
    tcode VARCHAR(20),                   -- SAP T-code
    content TEXT NOT NULL,               -- 상세 내용
    steps JSONB,                         -- 단계별 절차
    warnings TEXT[],                     -- 주의사항
    tags VARCHAR(50)[],                  -- 검색 태그
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### chat_sessions
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    started_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id),
    role VARCHAR(10) NOT NULL,           -- user, assistant
    content TEXT NOT NULL,
    sources JSONB,                       -- RAG 소스 정보
    feedback VARCHAR(10),               -- good, bad, null
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.3 Vector Store (ChromaDB)
- Collection: `sap_knowledge`
- Embedding: Azure OpenAI text-embedding-ada-002
- Metadata: `{ id, title, category, tcode }`

---

## 7. RAG 파이프라인

```
사용자 질문
    ↓ Embedding
Azure OpenAI (text-embedding-ada-002)
    ↓ Similarity Search (top-k=5)
ChromaDB
    ↓ 관련 문서 검색
Context 구성
    ↓ Prompt + Context
LLM (GPT-4 또는 사용자 선택 모델)
    ↓
구조화된 응답 (T-code, 절차, 주의사항)
```

### 시스템 프롬프트
```
당신은 SAP 운영 전문가 AI 어시스턴트입니다.
사용자의 SAP 운영 관련 질문에 대해 정확하고 실용적인 답변을 제공합니다.

답변 규칙:
1. 관련 T-code를 항상 안내합니다
2. 단계별 실행 절차를 제공합니다
3. 주의사항이나 팁이 있으면 포함합니다
4. 확실하지 않은 내용은 추측하지 않고 한계를 밝힙니다
5. 한국어로 답변합니다
```

---

## 8. MCP 서버 (6 Tools + 4 Resources)

### Tools

| Tool | 입력 | 설명 |
|------|------|------|
| `search_knowledge` | `query: string` | SAP 지식 키워드 검색 |
| `get_error_pattern` | `error_code: string` | 에러코드로 패턴 직접 조회 |
| `suggest_tcode` | `topic: string` | 주제별 T-code 추천 |
| `diagnose_problem` | `description: string` | RAG + 스킬 라우팅 종합 진단 |
| `remember_note` | `note: string, tags: string` | 운영 메모 저장 |
| `search_memory` | `query: string` | 저장된 메모리 검색 |

### Resources

| URI | 설명 |
|-----|------|
| `sap://skills` | 사용 가능한 스킬 목록 |
| `sap://knowledge/categories` | 지식 카테고리별 항목 수 |
| `sap://error-catalog` | 에러 패턴 카탈로그 전체 |
| `sap://memory/recent` | 최근 운영 메모리 목록 |

---

## 9. 보안 요구사항

| 항목 | 구현 방법 |
|------|----------|
| 인증 | API Key 기반 (Codex/Copilot), keytar SecureStore에 OS 키체인 저장 |
| Electron 격리 | `contextBridge`로 Renderer ↔ Main 프로세스 격리, `nodeIntegration: false` |
| 데이터 암호화 | HTTPS (TLS 1.2+), SQLite 로컬 저장 (사내 데이터 외부 유출 방지) |
| API 보호 | Backend Admin API는 별도 인증 필요 |
| XSS 방지 | rehype-sanitize로 마크다운 렌더링 시 HTML 새니타이즈 |
| 로깅 | 감사 로그 (접근, 수정 이력) |

---

## 10. 인프라 및 배포

### 개발 환경
- Docker Compose: FastAPI + PostgreSQL + ChromaDB
- Desktop: `npm run build && npm run start` (Electron + Vite)
- Frontend: Vite dev server (localhost:5173)

### 운영 환경
- Backend: Azure App Service (Linux, Python 3.12)
- Frontend: Vercel 또는 Azure Static Web Apps
- DB: Supabase (managed PostgreSQL)
- Vector DB: Azure AI Search (프로덕션 확장 시)
- Desktop: Electron 패키징 (Phase 2.5 예정)

### CI/CD
- GitHub Actions: lint → test → build → deploy
- Branch 전략: Git Flow (main → develop → feature/*)
