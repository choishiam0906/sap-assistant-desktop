# TRD (Technical Requirements Document)
# SAP 운영 자동화 AI 봇

## 1. 시스템 아키텍처

```
사용자 (Desktop App)
    ↓ OAuth (사용자 계정)
Electron Runtime
    ├── Provider Adapter (Codex / Copilot)
    ├── Local Session Store (SQLite)
    ├── Skill Router / RAG 구성
    └── 지식 검색/진단
    ↓
Python FastAPI Backend (보조)
    ├── Knowledge API (CRUD)
    ├── Health/Stats API
    └── Legacy Chat API (410 Gone)
```

---

## 2. 기술 스택

| 레이어 | 기술 | 버전 | 선택 이유 |
|--------|------|------|----------|
| Backend Runtime | Python | 3.12+ | AI/LLM 생태계, pyrfc 호환성 |
| Backend Framework | FastAPI | 0.115+ | 비동기 지원, 자동 OpenAPI 문서, 타입 검증 |
| Desktop Runtime | Electron + TypeScript | 31+ / 5.7+ | 사용자 OAuth, 로컬 실행, 세션 제어 |
| LLM Provider | Codex + Copilot | OAuth | 사용자 계정 기반 인증, API 키 의존 제거 |
| Embedding | Legacy (Azure OpenAI) | text-embedding-ada-002 | 기존 지식 인덱스 호환 목적 |
| Vector DB | ChromaDB | 0.5+ | 로컬 개발 용이, Python 네이티브 |
| RDBMS | PostgreSQL | 16+ | Supabase 호환, JSON 지원 |
| ORM | SQLAlchemy | 2.0+ | 비동기 지원, 타입 안전성 |
| Frontend | React | 18+ | 컴포넌트 기반 UI, 생태계 풍부 |
| Build Tool | Vite | 6+ | 빠른 HMR, TypeScript 네이티브 |
| Integration | Copilot Studio | - | Teams 배포, Azure AD 인증 |

---

## 3. API 설계

### 3.1 Legacy Chat API (Retired)

#### POST /api/v1/chat
서버형 채팅 엔드포인트는 중단되었으며 `410 Gone`을 반환한다.

```json
{
  "message": "ST22로 덤프 분석하는 방법 알려줘",
  "session_id": "uuid",
  "user_id": "optional"
}

{
  "detail": "Server-side chat runtime has been retired. Use the desktop client with user OAuth (Codex/Copilot)."
}
```

#### POST /api/v1/chat/copilot
Copilot Studio 서버 경로도 중단되어 `410 Gone`을 반환한다.

### 3.2 Desktop IPC (신규)

Electron preload를 통해 아래 IPC 채널을 제공한다.

| Channel | 설명 |
|--------|------|
| `auth:start` | OAuth 시작 (provider) |
| `auth:complete` | OAuth 코드 교환 |
| `auth:status` | 인증 상태 조회 |
| `auth:logout` | 로그아웃/토큰 삭제 |
| `chat:send` | 메시지 전송 |
| `sessions:list` | 세션 목록 조회 |
| `sessions:messages` | 세션 메시지 조회 |

### 3.3 Knowledge API

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/v1/knowledge | 지식 목록 (페이지네이션, 카테고리 필터) |
| POST | /api/v1/knowledge | 지식 추가 |
| PUT | /api/v1/knowledge/{id} | 지식 수정 |
| DELETE | /api/v1/knowledge/{id} | 지식 삭제 |
| POST | /api/v1/knowledge/ingest | 문서 업로드 → 벡터화 |

### 3.4 System API

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/v1/health | 헬스체크 (DB, 런타임 모드 상태) |
| GET | /api/v1/runtime | 런타임 모드(`desktop_oauth`) 조회 |
| GET | /api/v1/stats | 사용 통계 (질의 수, 카테고리별 분포) |

---

## 4. 데이터 모델

### 4.1 knowledge_items (PostgreSQL)
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

### 4.2 chat_sessions (PostgreSQL)
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    started_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);
```

### 4.3 chat_messages (PostgreSQL)
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

### 4.4 Vector Store (ChromaDB)
- Collection: `sap_knowledge`
- Embedding: Azure OpenAI text-embedding-ada-002
- Metadata: `{ id, title, category, tcode }`

---

## 5. RAG 파이프라인

```
사용자 질문
    ↓ Embedding
Azure OpenAI (text-embedding-ada-002)
    ↓ Similarity Search (top-k=5)
ChromaDB
    ↓ 관련 문서 검색
Context 구성
    ↓ Prompt + Context
Azure OpenAI (GPT-4)
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

## 6. 보안 요구사항

| 항목 | 구현 방법 |
|------|----------|
| 인증 | Azure AD (Copilot Studio 기본 제공) |
| API 보호 | Copilot Connector Secret 검증 |
| 데이터 암호화 | HTTPS (TLS 1.2+), DB 암호화 |
| 접근 제어 | Admin API는 별도 인증 필요 |
| 로깅 | 감사 로그 (접근, 수정 이력) |

---

## 7. 인프라 및 배포

### 개발 환경
- Docker Compose: FastAPI + PostgreSQL + ChromaDB
- Frontend: Vite dev server (localhost:5173)

### 운영 환경
- Backend: Azure App Service (Linux, Python 3.12)
- Frontend: Vercel 또는 Azure Static Web Apps
- DB: Supabase (managed PostgreSQL)
- Vector DB: Azure AI Search (프로덕션 확장 시)

### CI/CD
- GitHub Actions: lint → test → build → deploy
- Branch 전략: Git Flow (main → develop → feature/*)
