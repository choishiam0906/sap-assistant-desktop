# TRD
# SAP Assistant Desktop Platform

## 1. 기술 목표

SAP Assistant Desktop Platform의 기술 목표는 다음과 같습니다.

1. 데스크톱 앱 하나로 SAP 질의, CBO 유지보수, 기술 참고를 처리한다.
2. 기밀 데이터는 기본 local-only 경계 안에서 다룬다.
3. 공개 지식 질의와 내부 기밀 질의를 서로 다른 경로로 처리한다.
4. 향후 엔터프라이즈 정책과 팀 배포로 확장 가능한 구조를 유지한다.

---

## 2. 아키텍처 원칙

### A1. Desktop-First Runtime
- 핵심 사용자 경험은 Electron Desktop 안에서 완결되어야 한다.
- Backend는 필수가 아니라 선택형 지원 레이어다.

### A2. Policy Before Provider
- 어떤 모델을 쓸지보다 먼저 어떤 데이터가 어디까지 갈 수 있는지 정책이 결정해야 한다.

### A3. Separate Vaults
- `confidential` 데이터와 `reference` 데이터는 저장과 검색 경로를 분리한다.

### A4. Domain Pack Composition
- 도메인별 검색, 프롬프트, 응답 포맷을 팩 단위로 조합한다.

### A5. Auditable Sessions
- 모든 세션은 최소한 모드, 사용 팩, 참조 소스, 전송 여부를 기록해야 한다.

---

## 3. 목표 시스템 아키텍처

```text
┌────────────────────────────────────────────────────┐
│ Desktop Shell (Electron)                           │
│ ├─ Chat Workspace                                  │
│ ├─ Source Workspace                                │
│ ├─ Domain Pack Launcher                            │
│ ├─ Security Mode Selector                          │
│ └─ Session / Audit Viewer                          │
└────────────────────────────────────────────────────┘
                     │ IPC
┌────────────────────────────────────────────────────┐
│ Local Agent Runtime                                │
│ ├─ Policy Engine                                   │
│ ├─ Provider Router                                 │
│ ├─ Retrieval Router                                │
│ ├─ Domain Pack Registry                            │
│ ├─ CBO Rules Engine                                │
│ ├─ Session Store                                   │
│ └─ Audit Logger                                    │
└────────────────────────────────────────────────────┘
          │                         │
          │                         │
┌───────────────────────┐   ┌────────────────────────┐
│ Knowledge Vault       │   │ Optional Backend       │
│ ├─ confidential/      │   │ ├─ Knowledge Sync      │
│ └─ reference/         │   │ ├─ MCP                 │
└───────────────────────┘   │ ├─ Team Policy         │
                            │ └─ Admin APIs          │
                            └────────────────────────┘
```

---

## 4. 현재 구현 베이스

현재 저장소에는 아래 기반이 이미 있습니다.

### Desktop
- Electron main/preload/renderer 구조
- 채팅 UI
- CBO 분석 UI
- 설정 UI
- SQLite 저장

### Backend
- FastAPI API
- MCP 서버
- Knowledge CRUD

### Frontend
- 관리/보조 UI

이 구조는 버리지 않습니다. 대신 `Desktop Shell + Local Agent Runtime` 방향으로 재정렬합니다.

---

## 5. 런타임 구성요소

### 5.1 Desktop Shell

역할:
- 워크스페이스 전환
- 사용자 입력
- 보안 모드 표시
- 세션 기록 표시
- 감사 로그 확인

후보 구현 위치:
- `desktop/src/renderer`

### 5.2 Local Agent Runtime

역할:
- 질의 분류
- 보안 모드 집행
- 도메인 팩 선택
- 검색 라우팅
- 모델 호출 라우팅
- 감사 로그 기록

후보 구현 위치:
- `desktop/src/main`

### 5.3 Policy Engine

판단 기준:
- 현재 세션 보안 모드
- 데이터 분류
- 사용 팩
- 외부 전송 허용 여부
- provider 허용 여부

예시 정책:
- Secure Local Mode + CBO source → external provider 금지
- Reference Mode + public pack → external provider 허용
- Hybrid Approved Mode + confidential source → 승인된 요약본만 허용

### 5.4 Provider Router

출력 경로:
- local-only runtime
- enterprise gateway
- external model API

입력 조건:
- security mode
- domain pack
- organization policy
- provider health

### 5.5 Retrieval Router

검색 대상:
- confidential index
- reference index
- session memory
- optional backend knowledge

원칙:
- 기밀 데이터와 공개 reference를 같은 인덱스에 섞지 않는다.

### 5.6 Domain Pack Registry

각 팩은 아래 정보를 가진다.

- pack id
- 설명
- 대상 사용자
- 기본 security mode
- 검색 소스
- 응답 포맷 규칙
- 금지/주의 규칙

예시 팩:
- `ops`
- `functional`
- `cbo-maintenance`
- `pi-integration`
- `btp-rap-cap`

---

## 6. 데이터 경계

### 6.1 Confidential Vault

포함 대상:
- CBO `.txt`
- 내부 운영 메모
- 기밀 절차서
- 승인되지 않은 내부 텍스트

기본 규칙:
- 외부 전송 금지
- 로컬 저장 우선
- 감사 로그 필수

### 6.2 Reference Vault

포함 대상:
- 공개 SAP 표준 문서 요약본
- BTP, RAP, CAP, Integration Suite reference pack
- 비기밀 운영 가이드

기본 규칙:
- 외부 모델 사용 가능
- 출처 추적 유지

---

## 7. 질문 처리 흐름

### 7.1 Secure Local Mode

```text
질문 입력
→ 데이터 분류
→ pack 선택
→ confidential retrieval
→ local rules / local runtime
→ 근거와 함께 응답
→ audit log 기록
```

### 7.2 Reference Mode

```text
질문 입력
→ pack 선택
→ reference retrieval
→ provider router
→ 외부 또는 허용된 모델 호출
→ 출처 포함 응답
→ session log 기록
```

### 7.3 Hybrid Approved Mode

```text
질문 입력
→ confidential source 읽기
→ 로컬 요약 생성
→ 사용자/정책 승인
→ 승인 요약본만 external call
→ 응답 + 원문 비전송 기록
```

---

## 8. CBO 처리 원칙

### 입력 형식
- 기본 표준: `.txt`
- 호환 입력: `.md`

### 처리 방식
- 규칙 기반 정적 분석 우선
- 로컬 요약 생성
- 필요 시 승인된 요약본만 외부 모델 호출

### 저장 원칙
- 원문과 분석 결과를 분리 저장
- 원문은 confidential vault
- 요약과 리스크 메타데이터는 세션/검색용 구조화 저장 가능

---

## 9. 권장 기술 구조

| 레이어 | 권장 기술 |
|--------|----------|
| Desktop Runtime | Electron + TypeScript |
| Renderer | React + Zustand |
| Local Storage | SQLite |
| Secret Storage | keytar 또는 OS secure store |
| Local Index | SQLite FTS 또는 로컬 벡터 스토어 |
| Backend | FastAPI |
| Policy Transport | JSON policy file 또는 signed config |
| Audit | append-only local logs |

---

## 10. 저장소별 역할 재정의

### `desktop/`
- 제품 중심
- Desktop Shell
- Local Agent Runtime
- Policy Engine
- Provider Router

### `backend/`
- 선택형 sync/control plane
- MCP
- reference ingestion
- team policy distribution

### `frontend/`
- 관리/운영용 보조 웹 UI
- 필수 사용자 경험의 중심이 아님

---

## 11. 단계별 기술 로드맵

### Phase 1
- Desktop에서 Security Mode 노출
- CBO secure local workflow 정리
- session / audit 기본 저장 구조 도입

### Phase 2
- Domain Pack Registry 구현
- confidential / reference retrieval 분리
- reference pack ingestion 파이프라인 구축

### Phase 3
- provider router와 승인 워크플로 구현
- enterprise gateway 연동
- 팀 정책 파일/배포 구조 추가

### Phase 4
- optional headless runtime
- 중앙 관리와 배포 자동화

---

## 12. 리스크와 대응

| 리스크 | 대응 |
|--------|------|
| 문서와 구현 불일치 | 문서에 현재 상태와 목표 상태를 분리 표기 |
| 기밀 데이터 외부 유출 | 모드 기반 정책 엔진과 승인 흐름 강제 |
| 도메인 범위 과대 | Domain Pack 단위로 순차 확장 |
| 데스크톱과 백엔드 책임 혼선 | desktop-first, backend-optional 원칙 고정 |
| 답변 품질 불균형 | pack별 prompt / retrieval / rules 분리 |

---

## 13. 비범위

- SAP 시스템 직접 자동 실행
- 무제한 외부 모델 전송
- 웹 앱 중심 제품 전환
- 모든 SAP 모듈에 대한 완전 자동 커버리지

초기 목표는 `안전한 데스크톱 조수`를 만드는 것이지, SAP 자동화 플랫폼 전체를 한 번에 완성하는 것이 아닙니다.
