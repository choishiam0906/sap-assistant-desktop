# SAP Knowledge Hub v7.1.0 — 기술 요구사항 문서 (TRD)

**버전**: 1.0
**작성일**: 2026-03-23
**최종 수정**: 2026-03-23
**상태**: 완결

---

## 1. 시스템 아키텍처

### 1.1 전체 아키텍처 (Architecture Overview)

```
┌─────────────────────────────────────────────────────────┐
│                  Electron 31 Main Window                │
│  ┌────────────────────────────────────────────────────┐ │
│  │           React 18 + TypeScript 5.7               │ │
│  │             (Renderer Process)                     │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  Pages: Dashboard, Chat, CodeLab, Settings  │ │ │
│  │  │  Components: Modal, Button, Layout, etc     │ │ │
│  │  │  Stores: settingsStore, chatStore, etc      │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                         ↕ IPC                           │
│                  (window.assistantDesktop)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │           Preload Bridge (src/preload)             │ │
│  │  - IPC 채널 type-safe 정의 (167+ 채널)           │ │
│  │  - Preload 메서드 (108개)                         │ │
│  │  - 신뢰 경계 (Trust Boundary) 강제              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕
         ┌────────────────────────────────┐
         │   Electron Main Process        │
         │  ────────────────────────────  │
         │  ├─ IPC Handlers               │
         │  │  ├─ chatHandlers (스트리밍) │
         │  │  ├─ authHandlers (OAuth)    │
         │  │  ├─ sourceHandlers (Files)  │
         │  │  ├─ cboHandlers (분석)      │
         │  │  ├─ routineHandlers (루틴)  │
         │  │  ├─ scheduleHandlers (크론) │
         │  │  └─ ... (8개 이상)          │
         │  │                             │
         │  ├─ Provider Router            │
         │  │  ├─ OpenAI                  │
         │  │  ├─ Anthropic               │
         │  │  └─ Google                  │
         │  │                             │
         │  ├─ Domain Pack Registry       │
         │  │  ├─ SAP Domain Pack         │
         │  │  └─ General Domain Pack     │
         │  │                             │
         │  ├─ CBO Analyzer              │
         │  ├─ Source Manager (GitHub)    │
         │  ├─ Auth Manager (OAuth)       │
         │  └─ Storage (SQLite)           │
         │                               │
         └────────────────────────────────┘
                      ↕
    ┌─────────────────────────────────────────┐
    │     외부 서비스 & 인프라                │
    │  ────────────────────────────────────  │
    │  ├─ LLM APIs (스트리밍)               │
    │  │  ├─ OpenAI GPT-4.1                 │
    │  │  ├─ Anthropic Claude Opus/Sonnet  │
    │  │  └─ Google Gemini 2.5              │
    │  │                                    │
    │  ├─ OAuth Providers                    │
    │  │  ├─ OpenAI OAuth                   │
    │  │  ├─ Anthropic OAuth                │
    │  │  ├─ Google OAuth                   │
    │  │  └─ Microsoft OAuth                │
    │  │                                    │
    │  ├─ Data Sources                      │
    │  │  ├─ GitHub REST API (CodeLab)     │
    │  │  ├─ Gmail MCP (이메일)            │
    │  │  └─ Outlook Graph API (이메일)    │
    │  │                                    │
    │  └─ Local Storage                     │
    │     └─ SQLite DB + OS Keychain       │
    └─────────────────────────────────────────┘
```

### 1.2 프로세스 모델 (Process Model)

SAP Knowledge Hub는 Electron의 **3-프로세스 모델**을 따릅니다:

```
┌──────────────────┐
│  메인 프로세스    │  ← Node.js 실행, IPC 관리, 저장소 접근
│ (Main Process)   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │          │
┌───▼────┐ ┌──▼──────┐
│ 렌더러  │ │ 렌더러   │  ← React UI (각각 독립적)
│프로세스 │ │프로세스   │
│1       │ │2        │  (향후 멀티 윈도우 지원)
└────────┘ └─────────┘
```

**특징**:
- **Main**: 리소스 접근 (파일, DB, 시스템), IPC 핸들러 등록
- **Renderer**: UI 렌더링, 사용자 상호작용, IPC 요청
- **Preload**: Renderer ↔ Main 신뢰 경계 강제

---

## 2. 기술 스택 상세

### 2.1 런타임 & 빌드

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **런타임** | Electron | 31.4.0 | 크로스플랫폼 데스크톱 |
| **빌드** | Vite | 6.0.7 | React 렌더러 번들링 |
| **JavaScript 번들** | esbuild | 최신 | Main 프로세스 CJS 번들 |
| **TypeScript** | typescript | 5.7.2 | Strict Mode 필수 |

### 2.2 UI & 상태 관리

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **UI 프레임워크** | React | 18.3.1 | 컴포넌트 기반 UI |
| **상태 관리** | Zustand | 5.0.0 | 경량 상태 저장소 |
| **서버 상태** | React Query | 5.60.0 | 비동기 데이터 캐싱 |
| **아이콘** | lucide-react | 0.577.0 | SVG 아이콘 라이브러리 |
| **마크다운** | react-markdown | 9.0.1 | MD → HTML 렌더링 |

### 2.3 백엔드 & 저장소

| 계층 | 기술 | 버전 | 용도 |
|------|-----|------|------|
| **데이터베이스** | better-sqlite3 | 11.8.1 | 로컬 SQLite (동기) |
| **로깅** | pino | 10.3.1 | 구조화된 JSON 로그 |
| **보안 저장소** | keytar | 7.9.0 | OS 시스템 키체인 |
| **스케줄링** | node-cron | 4.2.1 | 정기 작업 스케줄 |
| **MCP SDK** | @modelcontextprotocol/sdk | 1.27.1 | LLM 컨텍스트 프로토콜 |

### 2.4 테스트 & 개발

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **테스트 러너** | Vitest | 4.0.18 | Jest 호환 테스트 |
| **DOM 환경** | happy-dom | 20.8.3 | jsdom보다 가벼움 |
| **UI 테스트** | React Testing Library | 16.3.2 | 사용자 중심 테스트 |
| **린터** | ESLint | 9.39.3 | TypeScript 코드 정적 분석 |
| **패키지 매니저** | npm | 10.9.4 | 의존성 관리 |

### 2.5 배포

| 계층 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **앱 빌더** | electron-builder | 25.1.8 | NSIS, Portable 빌드 |
| **자동 업데이트** | electron-updater | 6.8.3 | GitHub 기반 자동 업데이트 |

---

## 3. 데이터 모델 (Data Model)

### 3.1 SQLite 스키마 (주요 테이블)

#### **테이블 1: messages (메시지)**
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  provider TEXT NOT NULL,  -- 'openai' | 'anthropic' | 'google'
  model TEXT NOT NULL,  -- 'gpt-4-turbo' | 'claude-3-opus' | ...
  domainPack TEXT,  -- 'ops' | 'functional' | ...
  createdAt INTEGER NOT NULL,
  tokens INTEGER,  -- 토큰 사용량
  cost REAL,  -- 예상 비용
  FOREIGN KEY (sessionId) REFERENCES sessions(id)
);
```

#### **테이블 2: sessions (채팅 세션)**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  domainPack TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  messageCount INTEGER DEFAULT 0
);
```

#### **테이블 3: sources (소스 - GitHub, Email, File)**
```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,  -- 'github' | 'email' | 'file'
  name TEXT NOT NULL,
  config JSON NOT NULL,  -- { "owner": "...", "repo": "..." }
  lastSyncAt INTEGER,
  syncStatus TEXT,  -- 'idle' | 'syncing' | 'failed'
  itemCount INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL
);
```

#### **테이블 4: sourceItems (소스 항목 - 파일, 이메일)**
```sql
CREATE TABLE sourceItems (
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL,
  externalId TEXT,  -- GitHub SHA, Email ID
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'file' | 'email'
  path TEXT,
  content TEXT,
  metadata JSON,  -- { "language": "java", "size": 2048 }
  analyzed BOOLEAN DEFAULT 0,
  analyzedAt INTEGER,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (sourceId) REFERENCES sources(id),
  UNIQUE (sourceId, externalId)
);
```

#### **테이블 5: cboAnalysis (CBO 분석 결과)**
```sql
CREATE TABLE cboAnalysis (
  id TEXT PRIMARY KEY,
  sourceItemId TEXT NOT NULL,
  riskScore INTEGER,  -- 0-100
  issues JSON,  -- [{ "severity": "high", "message": "..." }]
  recommendations JSON,  -- [{ "title": "...", "description": "..." }]
  analyzedAt INTEGER NOT NULL,
  FOREIGN KEY (sourceItemId) REFERENCES sourceItems(id)
);
```

#### **테이블 6: routines (루틴)**
```sql
CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domainPack TEXT NOT NULL,
  template TEXT,  -- 'ops_daily' | 'cbo_weekly' | ...
  config JSON NOT NULL,  -- { "steps": [...] }
  schedule TEXT,  -- cron expression
  enabled BOOLEAN DEFAULT 1,
  lastExecutedAt INTEGER,
  createdAt INTEGER NOT NULL
);
```

#### **테이블 7: routineExecutions (루틴 실행 히스토리)**
```sql
CREATE TABLE routineExecutions (
  id TEXT PRIMARY KEY,
  routineId TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'pending' | 'running' | 'success' | 'failed'
  startedAt INTEGER,
  completedAt INTEGER,
  result JSON,  -- { "outputItems": [...] }
  error TEXT,
  FOREIGN KEY (routineId) REFERENCES routines(id)
);
```

#### **테이블 8: auditLog (감사 로그)**
```sql
CREATE TABLE auditLog (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT NOT NULL,  -- 'chat' | 'analyze' | 'sync' | ...
  resource TEXT,  -- 'message' | 'source' | ...
  resourceId TEXT,
  input TEXT,  -- 마스킹됨
  output TEXT,  -- 마스킹됨
  provider TEXT,
  cost REAL,
  duration INTEGER,  -- ms
  status TEXT,  -- 'success' | 'failed'
  error TEXT,
  createdAt INTEGER NOT NULL
);
```

#### **테이블 9: migrations (DB 마이그레이션 이력)**
```sql
CREATE TABLE migrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  appliedAt INTEGER NOT NULL,
  version INTEGER NOT NULL
);
```

#### **테이블 10: settings (사용자 설정)**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSON NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

---

### 3.2 SQLite 인덱스 (Performance)

```sql
CREATE INDEX idx_messages_sessionId ON messages(sessionId);
CREATE INDEX idx_messages_createdAt ON messages(createdAt);
CREATE INDEX idx_sourceItems_sourceId ON sourceItems(sourceId);
CREATE INDEX idx_sourceItems_externalId ON sourceItems(externalId);
CREATE INDEX idx_cboAnalysis_sourceItemId ON cboAnalysis(sourceItemId);
CREATE INDEX idx_auditLog_createdAt ON auditLog(createdAt);
CREATE INDEX idx_auditLog_action ON auditLog(action);
```

---

## 4. API/IPC 설계

### 4.1 IPC 채널 개요

SAP Knowledge Hub는 **167개 이상의 IPC 채널**을 정의하며, **108개의 Preload 메서드**를 제공합니다.

#### **IPC 채널 분류 (카테고리별)**

| 카테고리 | 채널 수 | 예시 |
|---------|--------|------|
| **Chat** | 20+ | `chat:sendMessage`, `chat:streamMessage`, `chat:getHistory` |
| **Auth** | 15+ | `auth:login`, `auth:logout`, `auth:getToken` |
| **Source** | 25+ | `source:sync`, `source:analyze`, `source:getItems` |
| **CBO** | 12+ | `cbo:analyze`, `cbo:getRisk`, `cbo:getRecommendations` |
| **Routine** | 18+ | `routine:execute`, `routine:schedule`, `routine:getHistory` |
| **Schedule** | 10+ | `schedule:add`, `schedule:remove`, `schedule:list` |
| **Settings** | 15+ | `settings:get`, `settings:set`, `settings:export` |
| **Archive** | 8+ | `archive:export`, `archive:import`, `archive:list` |
| **Audit** | 12+ | `audit:getLog`, `audit:export`, `audit:clear` |
| **Agent** | 20+ | `agent:execute`, `agent:list`, `agent:update` |
| **기타** | 12+ | `window:close`, `window:minimize`, `error:log` |

### 4.2 IPC 채널 상세 예시

#### **Chat Channels (스트리밍)**

```typescript
// 1. 일반 메시지 전송 (응답 완료까지 대기)
ipcMain.handle('chat:sendMessage', async (event, {
  sessionId: string,
  message: string,
  provider: 'openai' | 'anthropic' | 'google',
  model: string,
  domainPack?: string
}): Promise<ChatMessage>)

// 2. 스트리밍 메시지 (실시간 수신)
ipcMain.on('chat:startStream', (event, {
  sessionId: string,
  message: string,
  provider: string,
  model: string
}): void)
// renderer는 'chat:stream-chunk' 리스너로 청크 수신

// 3. 세션 생성
ipcMain.handle('chat:createSession', async (event, {
  title: string,
  domainPack: string
}): Promise<Session>)

// 4. 세션 목록
ipcMain.handle('chat:getSessions', async (event): Promise<Session[]>)

// 5. 메시지 히스토리
ipcMain.handle('chat:getHistory', async (event, {
  sessionId: string,
  limit?: number
}): Promise<ChatMessage[]>)
```

#### **Auth Channels (OAuth)**

```typescript
// 1. 로그인 시작
ipcMain.handle('auth:login', async (event, {
  provider: 'openai' | 'anthropic' | 'google' | 'microsoft'
}): Promise<{ success: boolean; token?: string }))

// 2. 로그아웃
ipcMain.handle('auth:logout', async (event, {
  provider: string
}): Promise<void>)

// 3. 토큰 조회
ipcMain.handle('auth:getToken', async (event, {
  provider: string
}): Promise<{ token: string; expiresAt: number }>)

// 4. 인증 상태 확인
ipcMain.handle('auth:isAuthenticated', async (event, {
  provider: string
}): Promise<boolean>)
```

#### **Source Channels (GitHub, Email)**

```typescript
// 1. GitHub 저장소 동기화
ipcMain.handle('source:syncGitHub', async (event, {
  sourceId: string,
  owner: string,
  repo: string,
  branch?: string
}): Promise<{ itemCount: number; duration: number }>)

// 진행률 업데이트 (Renderer 리스너)
ipcMain.on('source:sync-progress', (event, {
  sourceId: string,
  percent: number,  // 0-100
  message: string
}): void)

// 2. 이메일 수집
ipcMain.handle('source:syncEmail', async (event, {
  provider: 'gmail' | 'outlook',
  days?: number
}): Promise<{ itemCount: number }>)

// 3. 파일 분석
ipcMain.handle('source:analyzeItems', async (event, {
  sourceId: string,
  itemIds: string[],
  provider: string
}): Promise<{ analyzed: number; failed: number }>)
```

#### **CBO Channels (분석)**

```typescript
// 1. CBO 분석
ipcMain.handle('cbo:analyze', async (event, {
  sourceItemId: string,
  provider: string
}): Promise<CboAnalysis>)

// 2. 위험도 조회
ipcMain.handle('cbo:getRisk', async (event, {
  sourceItemId: string
}): Promise<{ score: number; level: 'low' | 'medium' | 'high' }>)

// 3. 추천사항 조회
ipcMain.handle('cbo:getRecommendations', async (event, {
  sourceItemId: string
}): Promise<Recommendation[]>)
```

#### **Routine Channels (자동화)**

```typescript
// 1. 루틴 실행
ipcMain.handle('routine:execute', async (event, {
  routineId: string,
  manual: boolean
}): Promise<{ executionId: string }>)

// 2. 루틴 목록
ipcMain.handle('routine:list', async (event, {
  domainPack?: string
}): Promise<Routine[]>)

// 3. 스케줄 설정
ipcMain.handle('routine:schedule', async (event, {
  routineId: string,
  cronExpression: string,  // "0 3 * * *" (매일 03:00)
  enabled: boolean
}): Promise<void>)

// 4. 실행 히스토리
ipcMain.handle('routine:getExecutions', async (event, {
  routineId: string,
  limit?: number
}): Promise<RoutineExecution[]>)
```

### 4.3 Preload 메서드 (108개)

Preload 파일(`src/preload/index.ts`)은 모든 IPC 채널을 유형 안전한 메서드로 노출합니다:

```typescript
// window.assistantDesktop 객체
const assistantDesktop = {
  // Chat API
  chat: {
    sendMessage(params: SendMessageParams): Promise<ChatMessage>,
    streamMessage(params: StreamParams): void,
    createSession(params: CreateSessionParams): Promise<Session>,
    getSessions(): Promise<Session[]>,
    getHistory(sessionId: string): Promise<ChatMessage[]>,
    deleteSession(sessionId: string): Promise<void>,
    exportChat(sessionId: string): Promise<string>,
    // ... 20+ 메서드
  },

  // Auth API
  auth: {
    login(provider: LLMProvider): Promise<AuthResult>,
    logout(provider: LLMProvider): Promise<void>,
    getToken(provider: LLMProvider): Promise<TokenInfo>,
    isAuthenticated(provider: LLMProvider): Promise<boolean>,
    refreshToken(provider: LLMProvider): Promise<string>,
    // ... 15+ 메서드
  },

  // Source API
  source: {
    syncGitHub(params: GitHubSyncParams): Promise<SyncResult>,
    syncEmail(params: EmailSyncParams): Promise<SyncResult>,
    analyzeItems(params: AnalyzeParams): Promise<AnalysisResult>,
    getItems(sourceId: string): Promise<SourceItem[]>,
    // ... 25+ 메서드
  },

  // CBO API
  cbo: {
    analyze(params: CboAnalyzeParams): Promise<CboAnalysis>,
    getRisk(itemId: string): Promise<RiskInfo>,
    getRecommendations(itemId: string): Promise<Recommendation[]>,
    // ... 12+ 메서드
  },

  // Routine API
  routine: {
    execute(routineId: string): Promise<ExecutionId>,
    list(filter?: RoutineFilter): Promise<Routine[]>,
    schedule(params: ScheduleParams): Promise<void>,
    getExecutions(routineId: string): Promise<RoutineExecution[]>,
    // ... 18+ 메서드
  },

  // Schedule API
  schedule: {
    add(params: ScheduleParams): Promise<void>,
    remove(scheduleId: string): Promise<void>,
    list(): Promise<Schedule[]>,
    // ... 10+ 메서드
  },

  // Settings API
  settings: {
    get(key: string): Promise<any>,
    set(key: string, value: any): Promise<void>,
    export(): Promise<string>,
    import(data: string): Promise<void>,
    // ... 15+ 메서드
  },

  // Audit API
  audit: {
    getLog(filter?: AuditFilter): Promise<AuditEntry[]>,
    export(format: 'csv' | 'json'): Promise<string>,
    clear(olderThan?: number): Promise<void>,
    // ... 12+ 메서드
  },

  // Agent API
  agent: {
    execute(agentId: string): Promise<ExecutionId>,
    list(): Promise<Agent[]>,
    update(agentId: string, config: AgentConfig): Promise<void>,
    // ... 20+ 메서드
  },

  // Utility
  window: {
    close(): void,
    minimize(): void,
    maximize(): void,
    isMaximized(): boolean,
  },

  // Error handling
  error: {
    log(message: string, level: 'info' | 'warn' | 'error'): void,
  }
};
```

---

## 5. 보안 아키텍처 (Security Architecture)

### 5.1 신뢰 경계 (Trust Boundary)

```
┌──────────────────────────────┐
│  Untrusted: Renderer         │
│  (사용자 입력, XSS 위험)      │
└──────────────┬───────────────┘
               │
    ┌─────────▼─────────┐
    │  Trust Boundary   │
    │  (Preload)        │
    │                   │
    │ - IPC 검증        │
    │ - 입력 새니타이즈 │
    │ - 출력 필터링     │
    └──────────┬────────┘
               │
┌──────────────▼──────────────┐
│ Trusted: Main Process       │
│ (Node.js, 파일, DB 접근)    │
└─────────────────────────────┘
```

**원칙**:
1. Renderer는 Node.js 직접 접근 불가
2. 모든 접근은 Preload IPC를 통해야 함
3. Preload는 입력 검증 필수
4. Main은 Preload의 결과만 신뢰

### 5.2 OAuth 2.0 + PKCE 흐름

```
Renderer                 Main              OAuth Provider
   │                      │                      │
   │  auth:login           │                      │
   ├──────────────────────▶│                      │
   │                      │  Authorization        │
   │                      │  Request              │
   │                      │ (PKCE code_challenge)│
   │                      ├─────────────────────▶│
   │                      │                      │
   │                      │  User consent dialog  │
   │                      │◀─────────────────────┤
   │                      │                      │
   │                      │  Authorization Code  │
   │◀─────────────────────┤◀─────────────────────┤
   │  auth:complete       │                      │
   │                      │  Token Request       │
   │                      │  (code_verifier)     │
   │                      ├─────────────────────▶│
   │                      │                      │
   │                      │  Access Token        │
   │◀─────────────────────┤◀─────────────────────┤
   │ (token stored)       │                      │
   │                      │                      │
```

**특징**:
- **PKCE**: Client Secret 없이 안전한 인증 (데스크톱 앱용)
- **State 매개변수**: CSRF 공격 방지
- **RedirectURI 검증**: 올바른 앱으로의 리디렉트만 허용

### 5.3 SecureStore (자격증명 저장)

```
┌──────────────────────────────┐
│  자격증명 저장 시나리오       │
└──────────────────────────────┘

1. 저장 (setSecureToken)
   Token String
        ↓
   [keytar 시도] ────────────────── OS 키체인
   success? Yes
        ↓
   저장 완료

   failure? (keytar 미지원)
        ↓
   AES-256-GCM 암호화
        ↓
   .secure-store.json에 저장
        ↓
   저장 완료

2. 조회 (getSecureToken)
   [keytar 시도] ────────────────── OS 키체인
   found? Yes
        ↓
   토큰 반환

   not found?
        ↓
   .secure-store.json 로드
        ↓
   AES-256-GCM 복호화
        ↓
   토큰 반환
```

**지원 환경**:
- Windows: DPAPI (Data Protection API)
- macOS: Keychain
- Linux: Secret Service / Pass

### 5.4 Logger Redaction (로그 마스킹)

```typescript
// 마스킹 대상 패턴
const REDACTION_PATTERNS = [
  { pattern: /sk_[a-zA-Z0-9]{20,}/g, replacement: 'sk_****' },  // OpenAI
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: 'sk_****' },  // Anthropic
  { pattern: /AIza[0-9a-zA-Z_\-]{35}/g, replacement: 'AIza****' },  // Google
  { pattern: /Bearer\s+[a-zA-Z0-9_\-]{20,}/g, replacement: 'Bearer ****' },
  { pattern: /Authorization:\s*[^\n]*/g, replacement: 'Authorization: ****' },
];

// 로그 예시
logger.info('OAuth token received', { token: 'sk_live_...' });
// → Logger output: { token: 'sk_****' }
```

### 5.5 SQL Injection 방지

```typescript
// ❌ 위험: SQL Injection 취약
const message = "'; DROP TABLE messages; --";
db.exec(`SELECT * FROM messages WHERE id = '${message}'`);

// ✅ 안전: Prepared Statements
const stmt = db.prepare(`SELECT * FROM messages WHERE id = ?`);
const result = stmt.get(messageId);

// ✅ 안전: better-sqlite3 바인딩
const stmt = db.prepare(`
  INSERT INTO messages (id, content, createdAt)
  VALUES (?, ?, ?)
`);
stmt.run(id, content, Date.now());
```

---

## 6. Provider 레이어 (LLM 통합)

### 6.1 Provider 라우팅

```typescript
interface Provider {
  name: 'openai' | 'anthropic' | 'google';
  models: string[];
  sendMessage(params: MessageParams): Promise<string>;
  sendMessageStream(params: MessageParams): AsyncIterable<string>;
  getTokens(content: string): Promise<number>;
  getEstimatedCost(tokens: number): Promise<number>;
}

class ProviderRouter {
  private providers: Map<string, Provider>;

  async sendMessage(params: {
    provider: string;
    model: string;
    messages: Message[];
  }): Promise<string> {
    const provider = this.providers.get(params.provider);
    return provider.sendMessage(params);
  }

  async* sendMessageStream(params): AsyncIterable<string> {
    const provider = this.providers.get(params.provider);
    yield* provider.sendMessageStream(params);
  }
}
```

### 6.2 스트리밍 구현

```typescript
// Server-Sent Events (SSE) 스트리밍
async function streamChat(sessionId: string, message: string) {
  const stream = providerRouter.sendMessageStream({
    provider: 'openai',
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: message }],
  });

  // Renderer에 청크 전송
  for await (const chunk of stream) {
    mainWindow.webContents.send('chat:stream-chunk', {
      sessionId,
      chunk,
      timestamp: Date.now(),
    });
  }

  // 완료 신호
  mainWindow.webContents.send('chat:stream-end', { sessionId });
}
```

### 6.3 에러 복원력 (Resilience)

```typescript
class ProviderResilience {
  private retry = { maxAttempts: 3, backoff: 1000 };
  private circuitBreaker = { threshold: 5, timeout: 60000 };
  private fallback: string[] = ['openai', 'anthropic', 'google'];

  async sendMessage(params) {
    // 1. Retry 로직
    for (let attempt = 0; attempt < this.retry.maxAttempts; attempt++) {
      try {
        return await this.provider.sendMessage(params);
      } catch (error) {
        if (attempt < this.retry.maxAttempts - 1) {
          const delay = this.retry.backoff * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 2. Circuit Breaker 체크
    if (this.circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    // 3. Fallback 프로바이더
    for (const fallbackProvider of this.fallback) {
      if (fallbackProvider !== params.provider) {
        try {
          params.provider = fallbackProvider;
          return await this.provider.sendMessage(params);
        } catch (error) {
          continue;
        }
      }
    }

    throw new Error('All providers failed');
  }
}
```

---

## 7. 배포 아키텍처 (Deployment)

### 7.1 빌드 파이프라인

```
Source Code (TypeScript)
        ↓
┌─────────────────────────┐
│  TypeScript Compiler    │
│  (3개 tsconfig)         │
│                         │
│ ├─ tsconfig.json        │
│ │  (Main Process)       │
│ ├─ tsconfig.preload.json│
│ │  (Preload)            │
│ └─ tsconfig.renderer.json
│    (Renderer)           │
└────┬────────┬───────────┘
     │        │
┌────▼──┐  ┌──▼─────────────┐
│esbuild│  │ Vite React      │
│(CJS)  │  │ (ESM)           │
└────┬──┘  └──┬──────────────┘
     │        │
  dist/    dist-renderer/
  main/      (React bundle)
     │        │
     └───┬────┘
         ↓
    ┌─────────────────────┐
    │ electron-builder    │
    │                     │
    │ ├─ NSIS 설치형     │
    │ └─ Portable 휴대형 │
    └────┬────────────────┘
         ↓
    release/
    ├─ Assistant-Desktop-7.1.0-Setup.exe
    └─ Assistant-Desktop-7.1.0-Portable.exe
```

### 7.2 배포 산출물

| 산출물 | 설명 | 크기 | 설치 방식 |
|--------|------|------|---------|
| **NSIS Setup** | Windows 인스톨러 | ~250MB | 설치 필요 |
| **Portable** | 휴대용 exe | ~250MB | 설치 불필요 |

### 7.3 자동 업데이트 (electron-updater)

```typescript
class UpdateManager {
  private autoUpdater: AppUpdater;

  async checkForUpdates() {
    const result = await this.autoUpdater.checkForUpdates();
    if (result?.updateInfo.version > app.getVersion()) {
      // 새 버전 발견
      this.autoUpdater.downloadUpdate();
      this.autoUpdater.quitAndInstall();
    }
  }
}

// GitHub Releases 자동 배포
// https://github.com/boxlogodev/assistant-desktop/releases
```

---

## 8. 성능 요구사항 (Performance Requirements)

### 8.1 응답 시간 (Response Time)

| 작업 | 목표 | 구현 |
|------|------|------|
| **앱 시작** | < 3s | Lazy loading, esbuild 최적화 |
| **채팅 응답 시작** | < 1s | 스트리밍 (SSE) |
| **첫 스트리밍 청크** | < 5s | 병렬 처리, 스트림 쓰로틀링 |
| **DB 쿼리** | < 100ms | 인덱스, prepared 스테이트먼트 |
| **UI 렌더링** | 60 FPS | React 최적화, useMemo 캐싱 |

### 8.2 메모리 사용 (Memory)

| 항목 | 목표 | 유지 방법 |
|------|-----|---------|
| **기본 메모리** | < 200MB | Renderer 분리, 리소스 정리 |
| **로드된 메시지** | < 10K | 가상 스크롤링 (React Query) |
| **SQLite 캐시** | < 100MB | LRU 캐시, 자동 정리 |

### 8.3 번들 크기 (Bundle Size)

| 번들 | 목표 | 방법 |
|------|------|------|
| **Main JS** | < 5MB | Tree-shaking, 동적 임포트 |
| **Renderer JS** | < 3MB | Vite 코드 분할 |
| **총 앱 크기** | < 250MB | 의존성 최소화 |

---

## 9. 테스트 전략 (Testing Strategy)

### 9.1 단위 테스트 (Unit Tests)

```typescript
// 예: CBO 분석 로직
describe('CboAnalyzer', () => {
  it('should detect high-risk patterns', () => {
    const code = `
      UPDATE sapplant SET plant_data = 'xxx'
      WHERE plant_id = @plant_id
    `;
    const result = analyzer.analyze(code);
    expect(result.riskScore).toBeGreaterThan(70);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
```

### 9.2 통합 테스트 (Integration Tests)

```typescript
// 예: OAuth 흐름
describe('AuthManager OAuth', () => {
  it('should complete PKCE flow', async () => {
    const manager = new AuthManager();
    const result = await manager.login('openai');
    expect(result.token).toBeDefined();
    expect(result.expiresAt).toBeGreaterThan(Date.now());
  });
});
```

### 9.3 E2E 테스트 (End-to-End)

```typescript
// 예: 채팅 시나리오
describe('Chat E2E', () => {
  it('should send message and receive response', async () => {
    const session = await createSession('test');
    const response = await sendMessage(session.id, 'hello');
    expect(response.content).toBeDefined();
    expect(response.role).toBe('assistant');
  });
});
```

### 9.4 테스트 커버리지 (Coverage)

| 영역 | 커버리지 목표 | 현황 |
|------|-------------|------|
| **Pages** | 80% | 40% (8/20 페이지) |
| **Stores** | 90% | 100% (2/2) |
| **IPC Handlers** | 70% | 30% (예정) |
| **Utils** | 85% | 50% (예정) |

---

## 10. 마이그레이션 전략 (Migration Strategy)

### 10.1 DB 마이그레이션 흐름

```typescript
class MigrationRunner {
  async runPendingMigrations() {
    const applied = await this.getAppliedMigrations();
    const available = await this.getAvailableMigrations();

    for (const migration of available) {
      if (!applied.includes(migration.name)) {
        try {
          await this.executeMigration(migration);
          await this.recordMigration(migration);
          logger.info(`Migration applied: ${migration.name}`);
        } catch (error) {
          logger.error(`Migration failed: ${migration.name}`, error);
          throw error;  // 마이그레이션 실패 시 앱 시작 중단
        }
      }
    }
  }
}

// App 시작 시
app.on('ready', async () => {
  await migrationRunner.runPendingMigrations();
  // ...
});
```

### 10.2 마이그레이션 예시

```sql
-- migrations/001-init-schema.sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  -- ...
);

-- migrations/002-add-cost-column.sql
ALTER TABLE messages ADD COLUMN cost REAL;

-- migrations/003-create-audit-table.sql
CREATE TABLE IF NOT EXISTS auditLog (
  id TEXT PRIMARY KEY,
  -- ...
);
```

---

## 11. 모니터링 및 로깅 (Monitoring & Logging)

### 11.1 로깅 전략

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    req(req) { /* ... */ },
    err: pino.stdSerializers.err,
  },
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, levelFirst: true },
  },
});

// 마스킹 필터
logger.addHook((log) => {
  if (typeof log.msg === 'string') {
    log.msg = redactSensitiveInfo(log.msg);
  }
  return log;
});

// 사용
logger.info({ provider: 'openai', model: 'gpt-4' }, 'Chat started');
```

### 11.2 로그 레벨

| 레벨 | 용도 |
|------|------|
| **error** | 치명적 오류 (기록, 알림) |
| **warn** | 경고 (API 재시도, 토큰 만료) |
| **info** | 정보 (작업 완료, 사용자 액션) |
| **debug** | 디버깅 (변수값, 흐름 추적) |

---

## 부록: 기술 용어 정의

| 용어 | 정의 |
|------|------|
| **IPC** | Inter-Process Communication (프로세스 간 통신) |
| **SSE** | Server-Sent Events (단방향 실시간 스트리밍) |
| **OAuth 2.0** | 사용자 위임 기반 인증 표준 |
| **PKCE** | Proof Key for Code Exchange (OAuth 보안 확장) |
| **MCP** | Model Context Protocol (LLM 컨텍스트 프로토콜) |
| **CJS** | CommonJS (Node.js 모듈 형식) |
| **ESM** | ECMAScript Modules (표준 JavaScript 모듈) |
| **SQL Injection** | 악의적 SQL 입력을 통한 공격 |
| **DPAPI** | Windows Data Protection API (암호화) |
| **ACID** | 트랜잭션 원자성, 일관성, 격리, 지속성 |

---

**문서 작성**: Claude Opus 4.6
**검토 상태**: 기술 아키텍처 최종 검증 완료
**다음 업데이트**: v8.0 기술 스펙 추가 예정 (2026-06-23)
