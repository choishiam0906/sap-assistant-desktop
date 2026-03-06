<p align="center">
  <img src="https://img.shields.io/badge/SAP-0FAAFF?style=for-the-badge&logo=sap&logoColor=white" alt="SAP" />
  <img src="https://img.shields.io/badge/Electron_31-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MCP-Claude_Code-7C3AED?style=for-the-badge" alt="MCP" />
  <img src="https://img.shields.io/badge/v2.5.0-blue?style=for-the-badge" alt="v2.5.0" />
</p>

<h1 align="center">SAP Ops Bot</h1>

<p align="center">
  <strong>SAP 운영 지식을 AI로 민주화하여, 누구나 자연어로 SAP 운영 절차를 안내받을 수 있는 환경을 만듭니다.</strong>
</p>

<p align="center">
  <a href="docs/PRD.md">📋 PRD</a> •
  <a href="docs/BRD.md">📊 BRD</a> •
  <a href="docs/TRD.md">🔧 TRD</a> •
  <a href="desktop/README.md">🖥️ Desktop</a> •
  <a href="#빠른-시작">🚀 빠른 시작</a> •
  <a href="#api-문서">📖 API 문서</a>
</p>

---

## 💡 프로젝트 소개

SAP 운영 현장에서 축적된 노하우를 AI 봇으로 자동화한 프로젝트입니다.

Desktop 앱에서 자연어로 질문하면, **RAG(Retrieval-Augmented Generation)** 기반 AI가 적절한 T-code, 실행 절차, 주의사항을 안내합니다.

### 해결하는 문제

| 문제 | Before | After |
|------|--------|-------|
| 🔒 지식 종속 | 운영 노하우가 개인/PPT에 산재 | AI 봇이 통합 지식 베이스로 즉시 응답 |
| ⏰ T-code 검색 | 매번 문서 뒤지거나 동료에게 질문 | 자연어로 상황 설명 → T-code 추천 |
| 📚 온보딩 비용 | 신규 인력 3-6개월 학습 | AI 봇이 24/7 멘토 역할 |
| 🐛 오류 분석 | 디버깅 T-code 모르면 시간 낭비 | 오류 상황 설명 → 디버깅 절차 안내 |

---

## ✨ 주요 기능

<table>
  <tr>
    <td width="50%">
      <h3>💬 SAP 운영 Q&A</h3>
      <p>자연어 질문에 대해 RAG 기반으로 정확한 SAP 운영 답변을 제공합니다.</p>
      <pre>"ST22로 덤프 분석하는 방법 알려줘"
→ ST22 T-code 안내 + 단계별 절차 + 주의사항</pre>
    </td>
    <td width="50%">
      <h3>🔍 T-code 추천 엔진</h3>
      <p>업무 상황을 설명하면 적절한 T-code와 실행 방법을 안내합니다.</p>
      <pre>"특정 사용자의 프로그램 실행 이력을 확인하고 싶어"
→ SM20 추천 + 필터 설정 방법</pre>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🐛 에러 패턴 카탈로그</h3>
      <p>10개 주요 SAP 에러 패턴이 등록되어 있으며, 에러코드로 즉시 원인/해결책을 조회합니다.</p>
      <pre>"DBIF_RSQL_SQL_ERROR 덤프가 반복 발생해"
→ 에러 원인 + SAP Note 2220064 + 해결 방법 4가지</pre>
    </td>
    <td width="50%">
      <h3>🧠 도메인 스킬 라우팅</h3>
      <p>질문을 자동으로 전문 스킬(오류분석/데이터분석/역할관리/CTS관리)에 라우팅합니다.</p>
      <pre>"CTS 전송이 실패했어"
→ skill_used: "CTS관리" + STMS/SE03 안내</pre>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🖥️ 채팅 UI</h3>
      <p>스트리밍 응답, 세션 관리, 마크다운 렌더링을 지원하는 대화형 인터페이스입니다.</p>
      <pre>세션 리스트 + 메시지 타임라인 + Composer
Provider/Model 선택 → 스트리밍 응답 + 메타데이터</pre>
    </td>
    <td width="50%">
      <h3>⚙️ 설정 관리</h3>
      <p>Craft 스타일의 설정 화면에서 테마, 기본 연결, Provider 관리를 합니다.</p>
      <pre>테마: system/light/dark 선택
Connections: 인증 상태 Badge + API Key 관리</pre>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🧪 CBO 소스 정적 분석</h3>
      <p>CBO 소스를 5개 규칙으로 점검하고 리스크와 개선 권고를 제시합니다. 배치 분석, 이력 관리, 리스크 diff를 지원합니다.</p>
      <pre>"EXEC SQL, SELECT *가 포함된 CBO 소스 점검해줘"
→ 리스크 목록 + 우선순위 권고 + 요약 리포트</pre>
    </td>
    <td width="50%">
      <h3>🔌 MCP 서버 (Claude Code 연동)</h3>
      <p>Claude Code에서 직접 SAP 지식을 검색하고 문제를 진단할 수 있는 MCP 서버를 제공합니다.</p>
      <pre>6개 Tools + 4개 Resources
search_knowledge, diagnose_problem, ...</pre>
    </td>
  </tr>
</table>

<!-- TODO: 스크린샷 추가 -->

---

## 📦 SAP 지식 베이스

**13개 운영 가이드** + **10개 에러 패턴**이 시드 데이터로 포함되어 있습니다.

### 운영 가이드 (13개)

| 카테고리 | T-code | 용도 |
|:--------:|:------:|------|
| 데이터분석 | `ST03N` | Transaction/RFC Profile 조회 |
| 데이터분석 | `SM20` | 보안 감사 로그 (로그온/프로그램 실행 이력) |
| 데이터분석 | `RSM37` | 백그라운드잡 이력 조회 |
| 데이터분석 | `SE38` | 프로그램 소스 검색 (RS_ABAP_SOURCE_SCAN) |
| 데이터분석 | `SE38` | 외부 DB 접근 쿼리 (ADBC_QUERY) |
| 데이터분석 | `SCU3` | Table Logging 기반 DML 이력 조회 |
| 데이터분석 | `ST05` | SQL Trace 활성화/비활성화 |
| 오류분석 | `SE11` | T100 테이블 메시지 찾기 |
| 오류분석 | `ST22` | ABAP 덤프(Runtime Error) 분석 |
| 오류분석 | `SM21` | 시스템 로그 조회 |
| 역할관리 | `S_BCE_68001425` | 역할/사용자/T-code 기반 권한 조회 |
| CTS관리 | `STMS` | CTS 이동 경로 설정 및 전송 |
| CTS관리 | `SE03` | Transport Request 이력 조회 |

### 에러 패턴 카탈로그 (10개)

에러코드로 즉시 원인과 해결 방법을 찾을 수 있습니다.

| 에러코드 | SAP Note | 설명 |
|----------|:--------:|------|
| `DBIF_RSQL_SQL_ERROR` | 2220064 | DB SQL 실행 에러 (Lock, Deadlock) |
| `TSV_TNEW_PAGE_ALLOC_FAILED` | — | Internal Table 메모리 부족 |
| `DYNPRO_MSG_IN_HELP` | — | 다이나프로 Help 이벤트에서 MESSAGE 에러 |
| `MESSAGE_TYPE_X` | — | 프로그램 의도적 강제 종료 |
| `CONVT_NO_NUMBER` | — | 문자열→숫자 형변환 실패 |
| `OBJECTS_OBJREF_NOT_ASSIGNED` | — | 초기화 안 된 객체 참조 (Null 참조) |
| `GETWA_NOT_ASSIGNED` | — | 할당 안 된 필드 심볼 접근 |
| `TIME_OUT` | — | 다이얼로그 실행 시간 초과 |
| `RABAX_STATE` | — | 이중 예외 (덤프 처리 중 재덤프) |
| `SM21_SYSTEM_LOG` | — | 시스템 로그 에러 패턴 종합 |

---

## 🏗️ 아키텍처

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

## 🛠️ 기술 스택

| 레이어 | 기술 | 선택 이유 |
|:------:|------|----------|
| **Desktop Runtime** | Electron 31 + TypeScript 5.7 | 사용자 OAuth, 로컬 실행, 세션 고정 |
| **Desktop Renderer** | React 18 + Zustand 5 | 컴포넌트 기반 UI, 경량 상태 관리 |
| **Desktop Storage** | SQLite (better-sqlite3) + keytar | 세션/메시지 로컬 저장 + 안전한 자격 증명 저장 |
| **Backend API** | Python 3.12 + FastAPI | 지식 관리, 헬스/통계, MCP |
| **Admin UI** | React + TypeScript + Vite | 지식 CRUD 및 운영 화면 |
| **LLM Provider** | Codex OAuth + Copilot OAuth | 사용자 계정 기반 인증 |
| **Vector DB** | ChromaDB | 지식 검색 호환 레이어 |
| **Integration** | MCP | Claude Code 연동 |
| **Infra** | Docker + GitHub Actions | 컨테이너화, CI/CD |

---

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 20+
- Python 3.12+ (Knowledge API/MCP 사용 시)

### 1. Desktop (권장)

```bash
git clone https://github.com/choishiam0906/sap-ops-bot.git
cd sap-ops-bot/desktop
cp .env.example .env
npm install
npm run build
npm run start
```

Desktop 실행 후 할 수 있는 것:

- **채팅**: 새 세션 생성 → 자연어 질문 → 스트리밍 AI 응답 (Provider/Model 선택)
- **CBO 분석**: 텍스트 직접 입력 / 파일 선택 / 폴더 배치 분석 (5개 정적 규칙)
- **CBO 이력**: 실행 이력 조회, Run 상세 보기, Run 간 리스크 diff
- **Knowledge 동기화**: CBO 결과를 Backend Knowledge API로 bulk 동기화
- **LLM 보강**: 인증된 Provider/Model로 규칙 분석 결과 보강
- **설정**: 테마(system/light/dark) 변경, API Key 입력, Provider 관리

#### OAuth(API Key) 설정 방법

1. 앱 실행 후 좌측 사이드바에서 **Settings** 클릭
2. **Connections** 섹션에서 사용할 Provider(Codex/Copilot) 선택
3. API Key를 입력하면 `keytar` SecureStore에 안전하게 저장
4. 채팅/CBO 분석에서 해당 Provider 사용 가능

### 2. Backend (보조 API/MCP)

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
# http://localhost:8000/docs
```

### 3. Admin Dashboard (선택)

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## 📖 API 문서

Backend 실행 후 자동 생성됩니다:

| 문서 | URL |
|------|-----|
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |

### 핵심 엔드포인트

| Method | Path | 설명 |
|:------:|------|------|
| `GET` | `/api/v1/chat/skills` | 사용 가능한 스킬 목록 조회 |
| `GET` | `/api/v1/knowledge` | 지식 목록 조회 |
| `POST` | `/api/v1/knowledge` | 지식 추가 (에러 패턴 포함) |
| `POST` | `/api/v1/knowledge/bulk` | 지식 일괄 추가 (Desktop CBO sync) |
| `PUT` | `/api/v1/knowledge/{id}` | 지식 수정 |
| `DELETE` | `/api/v1/knowledge/{id}` | 지식 삭제 |
| `GET` | `/api/v1/health` | 헬스체크 |
| `GET` | `/api/v1/runtime` | 런타임 모드 조회 (`desktop_oauth`) |
| `GET` | `/api/v1/stats` | 사용 통계 |

---

## 🧠 도메인 스킬 시스템

사용자의 질문을 자동으로 분석하여 가장 적합한 전문 스킬에 라우팅합니다.

| 스킬 | 카테고리 | 키워드 예시 | 추천 T-code |
|:----:|:--------:|-----------|:-----------:|
| 데이터분석 | 데이터분석 | 이력, 로그, 조회, trace, 배치 | ST03N, SM20, ST05 |
| 오류분석 | 오류분석 | 덤프, 에러, 런타임, 디버깅 | ST22, SM21, SE91 |
| 역할관리 | 역할관리 | 역할, 권한, 사용자, PFCG | PFCG, SU01, SU53 |
| CTS관리 | CTS관리 | 전송, transport, CTS, request | STMS, SE03, SE09 |
| 일반 | — | 위에 해당하지 않는 질문 (폴백) | — |

채팅 응답에 `skill_used` 필드가 포함되어 어떤 스킬이 선택되었는지 확인할 수 있습니다:

```json
{
  "answer": "ST22는 ABAP Runtime Error를 분석하는 T-code입니다...",
  "skill_used": "오류분석",
  "suggested_tcodes": ["ST22", "SM21"]
}
```

---

## 🔌 MCP 서버 (Claude Code 연동)

Claude Code에서 SAP 운영 지식을 직접 사용할 수 있는 MCP 서버를 제공합니다.

### 설정

프로젝트 루트의 `.mcp.json`이 이미 설정되어 있습니다:

```json
{
  "mcpServers": {
    "sap-ops-bot": {
      "command": "python",
      "args": ["-m", "app.mcp_server"],
      "cwd": "backend",
      "env": { "PYTHONPATH": "." }
    }
  }
}
```

Claude Code에서 프로젝트를 열면 자동으로 MCP 서버가 로드됩니다.

### MCP Tools (6개)

| Tool | 설명 | 사용 예시 |
|------|------|----------|
| `search_knowledge` | SAP 지식 키워드 검색 | `search_knowledge("ST22 덤프")` |
| `get_error_pattern` | 에러코드로 패턴 직접 조회 | `get_error_pattern("DBIF_RSQL_SQL_ERROR")` |
| `suggest_tcode` | 주제별 T-code 추천 | `suggest_tcode("권한 관리")` |
| `diagnose_problem` | RAG + 스킬 라우팅 종합 진단 | `diagnose_problem("메모리 부족 덤프 반복")` |
| `remember_note` | 운영 메모 저장 | `remember_note("야간 점검 후 ST22 확인", "운영,점검")` |
| `search_memory` | 저장된 메모리 검색 | `search_memory("야간 점검")` |

### MCP Resources (4개)

| URI | 설명 |
|-----|------|
| `sap://skills` | 사용 가능한 스킬 목록 |
| `sap://knowledge/categories` | 지식 카테고리별 항목 수 |
| `sap://error-catalog` | 에러 패턴 카탈로그 전체 목록 |
| `sap://memory/recent` | 최근 운영 메모리 목록 |

### 독립 실행 테스트

```bash
cd backend
python -m app.mcp_server
# stdio 기반으로 동작 — Claude Code가 자동 연결
```

---

## 📁 프로젝트 구조

```
sap-ops-bot/
├── 📄 README.md
├── 📄 .mcp.json                  # Claude Code MCP 서버 설정
├── 📄 docker-compose.yml
├── 📄 .env.example
│
├── 📂 docs/
│   ├── PRD.md                    # 제품 요구사항 정의서
│   ├── BRD.md                    # 비즈니스 요구사항 정의서
│   └── TRD.md                    # 기술 요구사항 정의서
│
├── 📂 desktop/
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   └── src/
│       ├── main/
│       │   ├── index.ts          # Electron main + IPC 핸들러
│       │   ├── chatRuntime.ts    # 세션/메시지 런타임
│       │   ├── contracts.ts      # 공유 타입 정의
│       │   ├── auth/             # OAuth 매니저 + SecureStore (keytar)
│       │   ├── cbo/              # CBO parser/rules/analyzer/batchRuntime
│       │   ├── providers/        # Codex/Copilot 어댑터
│       │   └── storage/          # SQLite 저장소 (sqlite.ts, repositories.ts)
│       ├── preload/index.ts      # IPC 브리지 (15개 채널)
│       └── renderer/
│           ├── App.tsx           # 루트 컴포넌트 (React Query + 3페이지 라우팅)
│           ├── main.tsx          # 엔트리포인트
│           ├── pages/
│           │   ├── ChatPage.tsx      # 채팅 UI (세션 + 메시지 + Composer)
│           │   ├── CboPage.tsx       # CBO 분석 (텍스트/파일/이력 탭)
│           │   └── SettingsPage.tsx   # 설정 (테마 + Connections)
│           ├── components/
│           │   ├── Sidebar.tsx       # 접이식 내비게이션
│           │   ├── MarkdownRenderer.tsx  # GFM + 코드 하이라이팅
│           │   ├── chat/             # Composer, MessageList, SessionList
│           │   ├── cbo/              # LlmOptions, ResultPanel, DiffPanel, RunsTable
│           │   └── ui/               # Badge, Button, Skeleton, Tooltip
│           ├── stores/
│           │   ├── chatStore.ts      # 채팅 상태 (Zustand)
│           │   ├── cboStore.ts       # CBO 분석 상태 (Zustand)
│           │   └── settingsStore.ts  # 설정 상태 (Zustand + localStorage)
│           └── styles/
│               ├── global.css        # 기본 스타일
│               ├── variables.css     # CSS 커스텀 속성
│               └── animations.css    # 페이지 전환 애니메이션
│
├── 📂 backend/
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py               # FastAPI 엔트리포인트
│   │   ├── config.py             # 설정 관리
│   │   ├── mcp_server.py         # MCP 서버 (Claude Code 연동)
│   │   ├── api/                  # API 엔드포인트
│   │   │   ├── chat.py           # /chat/skills
│   │   │   ├── knowledge.py      # 지식 베이스 CRUD + bulk
│   │   │   └── copilot.py        # (레거시 참조)
│   │   ├── core/                 # 핵심 비즈니스 로직
│   │   │   ├── rag_engine.py     # RAG 파이프라인 + 스킬 라우팅
│   │   │   ├── llm_client.py     # LLM 클라이언트
│   │   │   ├── knowledge_base.py # 지식 베이스 관리
│   │   │   └── skills/           # 도메인 스킬 모듈
│   │   ├── models/               # 데이터 모델
│   │   └── data/sap_knowledge/
│   │       ├── seed_data.json    # 운영 가이드 시드 (13개)
│   │       └── error_patterns.json # 에러 패턴 시드 (10개)
│   └── tests/                    # pytest 테스트
│
├── 📂 frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── pages/                # Dashboard, Knowledge, History
│       └── components/           # Layout, Sidebar, KnowledgeForm
│
├── 📂 copilot/
│   └── connector-spec.json       # Copilot Studio OpenAPI 스펙
│
└── 📂 .github/workflows/
    └── ci.yml                    # GitHub Actions CI
```

---

## 🗺️ 로드맵

- [x] **Phase 1 MVP** — 지식 Q&A + T-code 추천 + Admin Dashboard
- [x] **Phase 1.5** — 에러 패턴 카탈로그 + 도메인 스킬 모듈화 + MCP 서버
- [x] **Phase 2 Desktop** — Electron OAuth 런타임 + Renderer UI (채팅/CBO 분석/설정) ✅
- [ ] **Phase 2.5** — OAuth 실서비스 검증, 리프레시 토큰, 패키징/코드서명 (진행중)
- [ ] **Phase 3** — SAP RFC 직접 연결 (pyrfc), 자동 실행
- [ ] **Phase 4** — 실시간 모니터링, 알림 자동화

---

## 🧪 테스트

```bash
# Backend
cd backend
pip install -e ".[dev]"
pytest tests/ -v

# 린트
ruff check app/ tests/

# Desktop 타입 체크
cd ../desktop
npm install
npm run build

# Frontend
cd ../frontend
npm run build   # TypeScript 타입 체크 + 빌드
```

---

## 📄 프로젝트 문서

| 문서 | 설명 |
|:----:|------|
| [📋 PRD](docs/PRD.md) | 제품 요구사항 정의서 — 기능 명세, 비기능 요구사항, KPI |
| [📊 BRD](docs/BRD.md) | 비즈니스 요구사항 정의서 — ROI 분석, 이해관계자 |
| [🔧 TRD](docs/TRD.md) | 기술 요구사항 정의서 — API 설계, 데이터 모델, RAG 파이프라인 |
| [🖥️ Desktop](desktop/README.md) | Desktop 클라이언트 — 아키텍처, UI 구조, IPC 채널 |

---

## 🤝 Codex Co-author 커밋 사용법

Codex와 협업한 변경을 GitHub 히스토리에 남기려면 커밋 footer에 `Co-authored-by`를 포함하세요.

### 1회 설정 (Windows PowerShell)

```powershell
@'
<type>: <summary>

<body>

Co-authored-by: Codex <codex@openai.com>
'@ | Set-Content -Path $HOME\.gitmessage_codex -Encoding utf8

git config commit.template "$HOME\.gitmessage_codex"
```

### 커밋할 때

```bash
git commit
```

- 에디터가 열리면 `<type>: <summary>`, `<body>`만 채우고 `Co-authored-by` 줄은 유지합니다.
- `git commit -m ...`처럼 한 줄 커밋을 쓰면 템플릿을 건너뛸 수 있으니, 아래처럼 footer를 직접 넣어주세요.

```bash
git commit -m "feat: add desktop oauth runtime" \
  -m "Co-authored-by: Codex <codex@openai.com>"
```

### 확인

```bash
git show -s --format=full
```

- 출력 메시지 하단에 `Co-authored-by: Codex <codex@openai.com>`가 보이면 정상입니다.

---

## 📝 라이선스

MIT License

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/choishiam0906">choishiam0906</a></sub>
</p>
