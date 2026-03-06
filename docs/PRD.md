# PRD (Product Requirements Document)
# SAP 운영 자동화 AI 봇

## 1. 제품 개요

### 제품명
SAP Ops Bot v2.5.0 (SAP 운영 자동화 AI 봇)

### 비전
SAP 운영 지식을 AI로 민주화하여, 누구나 자연어로 SAP 운영 절차를 안내받을 수 있는 환경을 만든다.

### 대상 사용자
- **Primary**: SAP Basis/운영 담당자 (일상 운영 업무 효율화)
- **Secondary**: SAP 신규 인력 (온보딩 학습 도구)
- **Tertiary**: IT 관리자 (운영 현황 모니터링)

---

## 2. 문제 정의

| 문제 | 현재 상태 | 목표 상태 |
|------|----------|----------|
| 지식 종속 | 운영 노하우가 개인/PPT에 산재 | AI 봇이 통합 지식 베이스로 즉시 응답 |
| T-code 검색 | 매번 문서 뒤지거나 동료에게 질문 | 자연어로 상황 설명 → 적절한 T-code 추천 |
| 온보딩 비용 | 신규 인력 3-6개월 학습 기간 | AI 봇이 24/7 멘토 역할 |
| 오류 분석 | 디버깅 T-code 모르면 시간 낭비 | 오류 상황 설명 → 디버깅 절차 안내 |
| CBO 소스 품질 | 커스텀 코드 리뷰가 수동/속인적 | 정적 분석 + LLM 보강으로 자동 리스크 감지 |

---

## 3. 현재 상태 (as-is)

> v2.5.0 — Desktop Renderer UI 구현 완료 (2026-03-06)

### 완성된 영역

- **Backend**: FastAPI 기반 RAG Q&A API, 지식 베이스 API (CRUD + bulk), 에러 패턴 카탈로그 (10개 패턴), MCP 서버 (6 tools + 4 resources)
- **Desktop Main Process**: Electron 31 + TypeScript 5.7, OAuth 인증 (Codex/Copilot), SQLite 로컬 저장, CBO 분석 엔진
- **Desktop Renderer UI**: React 18 + Zustand 5 기반 3개 화면 (채팅, CBO 분석, 설정) 구현 완료
- **CBO 분석 엔진**: ABAP 소스 정적 분석 (5개 규칙), 배치 분석, 실행 이력, 리스크 diff, LLM 보강
- **Preload Bridge**: 15개 IPC 채널 (`window.sapOpsDesktop`)
- **Admin Dashboard**: React + Vite 기반 지식 CRUD 관리 화면
- **CI/CD**: GitHub Actions 파이프라인

### 미완성 영역

- **OAuth 실서비스 검증**: 엔드포인트 검증 및 리프레시 토큰 처리 미완
- **패키징/코드서명**: Electron 배포 빌드 미완

---

## 4. 구현된 기능 (Implemented)

### F1: 채팅 UI ✅

- **구현**: `ChatPage.tsx` + `SessionList` + `MessageList` + `Composer`
- **상태 관리**: `chatStore` (Zustand) — input, provider, model, streaming 상태
- **스트리밍 응답**: StreamEvent 기반 실시간 응답, 메타데이터(sources, skill_used, suggested_tcodes) 표시
- **세션 관리**: 새 세션 생성, 세션 전환, 세션 목록 조회 (`sessions:list`, `sessions:messages`)
- **Provider/Model 선택**: PROVIDER_MODELS 기반 `<select>` 드롭다운
  - Codex: gpt-4.1-mini, gpt-4.1, gpt-4o, gpt-4o-mini, o4-mini
  - Copilot: gpt-4o, gpt-4o-mini, claude-3.5-sonnet
- **마크다운 렌더링**: react-markdown + remark-gfm + rehype-highlight + rehype-sanitize
- **UX**: Enter로 전송, Shift+Enter로 줄바꿈, 자동 스크롤, 피드백 버튼
- **우선순위**: P0 (필수) — 완료

### F2: CBO 분석 UI ✅

- **구현**: `CboPage.tsx` + `ResultPanel` + `DiffPanel` + `RunsTable` + `LlmOptions`
- **상태 관리**: `cboStore` (Zustand) — tab, busy, result, diffResult, LLM 옵션
- **3탭 구조**: 텍스트 분석 / 파일·폴더 분석 / 실행 이력
- **분석 기능**:
  - 텍스트 직접 입력 분석 (`cbo:analyzeText`)
  - 파일 선택 분석 (`cbo:pickAndAnalyzeFile`)
  - 폴더 배치 분석 (`cbo:pickAndAnalyzeFolder`) — 재귀 스캔 + 해시 중복 건너뛰기
- **5개 정적 규칙**: EXEC SQL, SELECT *, MESSAGE TYPE 'X', LOOP 내 COMMIT WORK, AUTHORITY-CHECK 부재
- **실행 이력**: `RunsTable`에서 과거 분석 목록 조회 + Run 상세 조회
- **리스크 diff**: `DiffPanel`에서 두 Run 간 신규/해소/지속 리스크 비교
- **Knowledge sync**: 분석 결과를 Backend `/knowledge/bulk` API로 동기화 (`source_type=source_code`)
- **LLM 보강**: `LlmOptions` 토글로 인증된 Provider/Model 지정, 규칙 분석 결과 보강
- **우선순위**: P0 (필수) — 완료

### F3: 설정 UI ✅

- **구현**: `SettingsPage.tsx` (Craft 스타일 레이아웃)
- **상태 관리**: `settingsStore` (Zustand + localStorage 영속화)
- **테마**: system / light / dark 3선택 (`data-theme` 속성 반영)
- **Default 섹션**: 기본 Provider + Model 드롭다운 (인증된 Provider만 선택 가능)
- **Connections 섹션**:
  - Provider별 인증 상태 Badge (success/error)
  - `...` 액션 메뉴 (로그아웃 등)
  - API Key 인라인 입력 → keytar SecureStore 저장
- **우선순위**: P1 (중요) — 완료

### F4: 에러 패턴 조회

- **상태**: 10개 에러 패턴은 MCP/Backend API에서 조회 가능
- **채팅 통합**: 채팅에서 에러코드 질문 시 RAG + 스킬 라우팅으로 패턴 매칭 응답
- **독립 UI**: 별도 에러 패턴 전용 페이지는 미구현 (채팅으로 대체)
- **우선순위**: P2 (보통) — 채팅 통합으로 대체 완료

---

## 5. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 응답 시간 | 일반 질의 3초 이내, CBO 분석 5초 이내 |
| 플랫폼 | Windows 10+ (Electron Desktop) |
| 보안 | API Key 기반 인증, keytar SecureStore 저장, 로컬 SQLite (사내 데이터 외부 유출 방지) |
| 접근성 | ARIA 레이블, 키보드 내비게이션, 시맨틱 HTML, 충분한 색상 대비 |
| UX | 토스 스타일 가이드 준수 — 해요체, 긍정적 표현, 다크패턴 방지 |

---

## 6. 성공 기준

| 기준 | 목표 | 달성 여부 |
|------|------|:---------:|
| UI 완성도 | 채팅 + CBO 분석 + 설정 3개 화면 동작 | ✅ |
| API 연동 | Preload bridge 15개 채널 중 13개 이상 UI 연결 | ✅ |
| 빌드 성공 | `npm run build && npm run start` 정상 실행 | ✅ |
| 사용성 | 첫 사용자가 설명 없이 채팅 시작 가능 (3클릭 이내) | ✅ |

---

## 7. 기술 스택

| 카테고리 | 기술 |
|---------|------|
| Runtime | Electron 31 |
| 언어 | TypeScript 5.7 (strict mode) |
| Renderer | React 18 + Zustand 5 |
| UI 구성 | lucide-react (아이콘), react-markdown + rehype-highlight (마크다운) |
| 서버 상태 | @tanstack/react-query 5 |
| 스타일링 | CSS Custom Properties (system/light/dark 테마) |
| 로컬 DB | SQLite (better-sqlite3) |
| 인증 저장 | keytar (SecureStore) |
| 인증 | API Key (Codex, Copilot provider) |
| Backend API | FastAPI (기존 backend/ 활용) |
| 빌드 | Vite 6 |

---

## 8. 로드맵

| 단계 | 상태 | 내용 |
|------|:----:|------|
| Phase 1 MVP | ✅ 완료 | 지식 Q&A + T-code 추천 + Admin Dashboard |
| Phase 1.5 | ✅ 완료 | 에러 패턴 카탈로그 + 도메인 스킬 모듈화 + MCP 서버 |
| Phase 2 Desktop | ✅ 완료 | Electron OAuth 런타임 + Renderer UI (채팅/CBO 분석/설정) |
| Phase 2.5 | 🔄 진행중 | OAuth 실서비스 검증, 리프레시 토큰, 패키징/코드서명 |
| Phase 3 | 📋 예정 | SAP RFC 직접 연결 (pyrfc), 자동 실행 |
| Phase 4 | 📋 예정 | 실시간 모니터링, 알림 자동화 |

---

## 9. 제외 사항 (Out of Scope)

- SAP 시스템 직접 연결 및 자동 실행
- 실시간 시스템 모니터링
- SAP GUI 화면 자동화
- 다국어 지원 (한국어만)
- 웹 배포 (Desktop 전용)
