<p align="center">
  <img src="https://img.shields.io/badge/SAP-0FAAFF?style=for-the-badge&logo=sap&logoColor=white" alt="SAP" />
  <img src="https://img.shields.io/badge/Desktop-Electron_31-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Product-SAP_Assistant_Desktop_Platform-1F2937?style=for-the-badge" alt="Product" />
</p>

<h1 align="center">SAP Assistant Desktop Platform</h1>

<p align="center">
  <strong>SAP 운영, 현업 지원, CBO 유지보수, PI/Integration, BTP/RAP/CAP 질의를 하나의 로컬 우선 데스크톱 앱에서 다루는 Agent-Native 플랫폼</strong>
</p>

<p align="center">
  <a href="docs/PRD.md">PRD</a> •
  <a href="docs/BRD.md">BRD</a> •
  <a href="docs/TRD.md">TRD</a> •
  <a href="desktop/README.md">Desktop</a>
</p>

---

## 제품 개요

`SAP Assistant Desktop Platform`은 SAP 실무자가 일상 운영과 유지보수 질문을 더 빠르고 안전하게 처리하도록 돕는 데스크톱 중심 AI 제품입니다.

이 저장소의 목표는 다음 3가지를 동시에 만족하는 것입니다.

1. SAP 운영자와 현업이 자연어로 SAP 절차와 표준 지식을 빠르게 찾을 수 있어야 합니다.
2. ABAP/CBO 유지보수 담당자가 내부 소스를 외부에 노출하지 않고 점검할 수 있어야 합니다.
3. PI/PO, Integration Suite, BTP, RAP, CAP 같은 최신 SAP 기술 질문도 같은 앱 안에서 다뤄야 합니다.

이 제품은 일반적인 문서형 챗봇이 아니라 `Desktop Shell + Local Runtime + Security Modes + Domain Packs` 구조를 갖는 Agent-Native Desktop Platform을 지향합니다.

---

## 왜 이 제품인가

현재 SAP 조직은 보통 아래 문제를 동시에 겪습니다.

- 운영 지식이 개인 메모, PPT, 메신저, 오래된 위키에 흩어져 있습니다.
- 현업과 운영자가 T-code, 절차, 에러 대응 흐름을 찾는 데 시간을 씁니다.
- CBO 소스나 운영 스크립트는 보안 때문에 외부 AI에 바로 넣기 어렵습니다.
- PI/PO, Integration Suite, RAP, CAP, BTP 같은 최신 기술 질문은 기존 운영 위키만으로 커버되지 않습니다.

이 제품은 이 문제를 `보안 모드`, `지식 분리`, `로컬 우선 실행`, `도메인 팩`으로 해결하려고 합니다.

---

## 핵심 원칙

### 1. Local-First
- 민감 소스와 운영 메모는 기본적으로 로컬에서 보관하고 처리합니다.
- Desktop 앱이 주 실행 환경이고, 서버는 옵션입니다.

### 2. Security-by-Mode
- 질문 유형에 따라 외부 전송 허용 범위를 모드로 통제합니다.
- CBO 소스처럼 민감한 데이터는 기본적으로 외부 전송을 막습니다.

### 3. Domain Pack Architecture
- 하나의 범용 봇이 아니라 SAP 역할별 전문 팩으로 분리합니다.
- 같은 UI 안에서 `Ops`, `Functional`, `CBO`, `PI/Integration`, `BTP/RAP/CAP`를 다룹니다.

### 4. Evidence-First Answers
- 답변은 가능한 한 출처, 규칙, 참고 경로를 함께 제공합니다.
- 표준 지식과 내부 지식의 근거를 분리해서 보여줍니다.

---

## Security Modes

### Secure Local Mode
- 내부 CBO 소스, 운영 메모, 민감 텍스트 전용
- 외부 LLM 전송 기본 차단
- 로컬 규칙 분석, 로컬 검색, 승인된 로컬 런타임 중심

### Reference Mode
- SAP 표준, BTP, RAP, CAP, PI/Integration Suite 같은 공개 기술 질문 전용
- 공개 참고 자료와 일반 지식 기반 응답
- 외부 모델 사용 가능

### Hybrid Approved Mode
- 원문 대신 승인된 요약본만 외부 모델에 전달
- 기업 환경에서 가장 현실적인 절충안

---

## Domain Packs

### Ops Pack
- Basis 운영
- 덤프, 시스템 로그, 배치잡, 권한, 성능, CTS

### Functional Pack
- 현업 지원
- 업무 절차, 트랜잭션 안내, 문의 응대 보조

### CBO Maintenance Pack
- TXT 기반 CBO 소스 검토
- 정적 규칙 분석, 유지보수 리스크, 권한/성능/예외처리 점검

### PI / Integration Pack
- PI/PO, Cloud Integration, Integration Suite
- 메시지 모니터링, 매핑, 어댑터, 인터페이스 문제 분석

### BTP / RAP / CAP Pack
- BTP 런타임, RAP 설계, CAP 서비스 개발
- 표준 가이드, 아키텍처 질의, 설계 검토

---

## 현재 저장소 구현 상태

`2026-03-06` 기준으로 이 저장소는 완성된 제품이 아니라 `초기 플랫폼 베이스` 상태입니다.

### 이미 구현된 것
- Electron 기반 Desktop 앱
- 로컬 SQLite 세션/메시지 저장
- Provider/Model 선택형 채팅 UI
- `.txt`, `.md` 기반 CBO 정적 분석
- 배치 분석, 이력 관리, diff
- FastAPI 기반 Knowledge API와 MCP 서버
- Admin 성격의 Frontend

### 아직 구현되지 않은 핵심 제품 요소
- Security Mode 전환 UI와 정책 엔진
- Domain Pack 라우팅 구조
- 공개 레퍼런스 팩과 내부 기밀 팩의 분리 인덱스
- 외부 전송 승인 흐름
- 엔터프라이즈 배포용 정책/감사 체계

즉, 현재 코드는 `SAP Assistant Desktop Platform`의 기반 레이어이며, 문서 개편 이후 이를 목표 제품에 맞춰 단계적으로 정리합니다.

---

## 목표 아키텍처

```text
Desktop Shell (Electron)
  ├─ Chat Workspace
  ├─ Source Workspace
  ├─ Domain Pack Launcher
  ├─ Security Mode Switcher
  └─ Session / Audit Viewer

Local Agent Runtime
  ├─ Policy Engine
  ├─ Provider Router
  ├─ Local Retrieval
  ├─ CBO Rules Engine
  └─ Session Memory

Knowledge Vault
  ├─ confidential/    # CBO txt, 운영 메모
  └─ reference/       # SAP 표준, BTP, RAP, CAP, PI docs

Optional Backend / Control Plane
  ├─ Knowledge Sync
  ├─ Team Policy Distribution
  ├─ MCP / Integrations
  └─ Admin APIs
```

---

## 저장소 구조

```text
sap-ops-bot/
├─ README.md
├─ docs/
│  ├─ PRD.md
│  ├─ BRD.md
│  └─ TRD.md
├─ desktop/          # 제품 중심 데스크톱 클라이언트
├─ backend/          # 선택형 API / MCP / sync backend
├─ frontend/         # 관리/보조 웹 UI
├─ copilot/          # Copilot connector 자산
└─ .github/workflows/
```

---

## 빠른 시작

### Desktop

```bash
git clone https://github.com/choishiam0906/sap-ops-bot.git
cd sap-ops-bot/desktop
cp .env.example .env
npm install
npm run build
npm run start
```

### Backend

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 문서

- [PRD](docs/PRD.md): 제품 정의, 사용자군, 기능 범위, 모드, 도메인 팩
- [BRD](docs/BRD.md): 비즈니스 가치, 도입 논리, KPI, 보안/컴플라이언스 요구
- [TRD](docs/TRD.md): 목표 아키텍처, 데이터 경계, 런타임 구조, 단계별 기술 로드맵
- [Desktop README](desktop/README.md): 현재 데스크톱 베이스와 목표 셸 구조

---

## 단계별 로드맵

### Phase 1
- Desktop-first MVP 정리
- Secure Local / Reference / Hybrid Approved 모드 도입
- CBO txt 워크플로 정교화

### Phase 2
- Domain Pack 구조 도입
- Ops / Functional / CBO / PI / BTP-RAP-CAP 팩 분리
- 공개 레퍼런스 지식팩 구축

### Phase 3
- 정책 엔진, 감사 로그, 승인 흐름 강화
- 엔터프라이즈 모델 게이트웨이 연동
- 팀 배포 정책 및 업데이트 체계

### Phase 4
- 선택형 headless runtime
- 중앙 정책 배포
- 대규모 팀 운영 기능

---

## 저장소 운영 메모

- 현재 저장소 이름은 `sap-ops-bot`이지만 제품 브랜딩은 `SAP Assistant Desktop Platform`으로 사용합니다.
- 문서는 목표 제품 방향에 맞게 개편했으며, 구현은 단계적으로 따라갑니다.
- 민감 소스 보호가 제품 핵심이므로 기능 추가보다 정책 경계 정의가 우선입니다.

---

## 라이선스

MIT License
