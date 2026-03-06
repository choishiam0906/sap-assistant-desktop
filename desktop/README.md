# SAP Assistant Desktop Platform Desktop

이 디렉터리는 `SAP Assistant Desktop Platform`의 메인 실행 셸입니다.

현재 Electron 기반 데스크톱 앱은 이미 동작하는 기반을 갖고 있습니다. 앞으로 이 앱은 단순 채팅 클라이언트가 아니라 아래 구조를 갖는 `Agent-Native Desktop Shell`로 고도화됩니다.

- Security Mode 전환
- Domain Pack 런처
- Local Knowledge Vault 연결
- CBO 유지보수 워크스페이스
- 세션/감사 로그 뷰어

---

## 현재 구현 범위

### 구현 완료
- 채팅 UI
- CBO 분석 UI
- 설정 UI
- SQLite 로컬 저장
- Provider/Model 선택
- `.txt`, `.md` 파일 기반 CBO 분석
- 실행 이력 및 diff

### 다음 목표
- Secure Local / Reference / Hybrid Approved 모드 선택 UI
- `confidential` / `reference` 지식 경계 분리
- Domain Pack별 프롬프트, 검색, 결과 포맷 분리
- 외부 전송 승인 흐름
- 감사 로그와 세션 근거 보기

---

## Desktop의 역할

Desktop는 이 제품의 기본 런타임입니다. 서버가 없어도 핵심 기능이 동작해야 합니다.

### Desktop가 담당하는 것
- 사용자 세션
- 로컬 정책 집행
- 파일 입력
- 로컬 스토리지
- 보안 모드 전환
- 민감 소스 보호

### Backend가 맡는 것
- 선택형 Knowledge API
- MCP
- 팀 배포용 동기화/정책
- 중앙 관리 기능

즉, 제품 철학은 `backend-assisted`, 하지만 `desktop-first`입니다.

---

## 목표 정보 구조

```text
Home
├─ Ask SAP
│  ├─ Ops
│  ├─ Functional
│  ├─ PI / Integration
│  └─ BTP / RAP / CAP
├─ Analyze Source
│  ├─ CBO Text Review
│  ├─ Folder Batch Review
│  └─ Risk Diff
├─ Knowledge Vault
│  ├─ Confidential
│  └─ Reference
├─ Sessions
└─ Settings
   ├─ Security Modes
   ├─ Providers
   ├─ Storage
   └─ Audit
```

---

## Security Modes

### Secure Local Mode
- 내부 CBO 소스, 운영 메모, 민감 텍스트 전용
- 외부 전송 차단
- 로컬 규칙 분석 중심

### Reference Mode
- SAP 표준/BTP/RAP/CAP/Integration 공개 지식 질의
- 외부 모델 허용 가능

### Hybrid Approved Mode
- 승인된 요약본만 외부 모델에 전달
- 기업용 절충안

---

## Domain Packs

### Ops Pack
- ST22, SM21, ST03N, STMS, SE03, 권한/성능/운영 절차

### Functional Pack
- 현업 지원용 업무 절차, T-code 안내, 질의 대응

### CBO Maintenance Pack
- TXT 기반 CBO 검토
- 규칙 분석, 유지보수 리스크, 권고안

### PI / Integration Pack
- PI/PO, Cloud Integration, Integration Suite 질의

### BTP / RAP / CAP Pack
- SAP BTP, RAP, CAP 표준 지식과 설계 질의

---

## 현재 아키텍처

```text
Renderer (React)
  ├─ Chat
  ├─ CBO Analysis
  └─ Settings

Preload
  └─ IPC bridge

Main Process
  ├─ Chat runtime
  ├─ Auth / provider handling
  ├─ CBO analyzer
  └─ SQLite storage
```

이 구조는 유지합니다. 다만 앞으로 Main Process 내부 런타임을 아래와 같이 정리합니다.

```text
Local Agent Runtime
  ├─ Policy Engine
  ├─ Provider Router
  ├─ Retrieval Router
  ├─ Domain Pack Registry
  ├─ CBO Rules Engine
  └─ Audit Logger
```

---

## CBO 워크플로 원칙

- 민감 소스는 기본적으로 `.txt`를 표준 입력 포맷으로 사용합니다.
- `.md`는 호환 입력으로 유지합니다.
- 원문 소스는 외부 API로 자동 전송하지 않습니다.
- 분석 결과는 규칙 기반 요약과 위험도, 개선 권고를 우선 제공합니다.
- 필요 시 승인된 요약본만 외부 모델에 전달합니다.

---

## 빠른 시작

```bash
cd desktop
cp .env.example .env
npm install
npm run build
npm run start
```

---

## 구현 우선순위

### 우선
- 모드 전환 UI
- CBO 기밀 워크플로
- 세션/근거/감사 보기

### 다음
- Domain Pack 런처
- 공개 Reference Pack 연결
- 팀 정책 동기화

### 나중
- 자동 업데이트
- 코드 서명
- 엔터프라이즈 배포 옵션
