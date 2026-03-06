# PRD
# SAP Assistant Desktop Platform

## 1. 제품 개요

### 제품명
SAP Assistant Desktop Platform

### 저장소명
`sap-assistant-desktop`

### 제품 한 줄 정의
SAP 운영자, SAP 현업, ABAP/CBO 유지보수 담당자, PI/Integration 담당자, BTP/RAP/CAP 개발자가 하나의 로컬 우선 데스크톱 앱에서 SAP 질문과 유지보수 업무를 안전하게 처리할 수 있도록 돕는 Agent-Native Desktop Platform

### 비전
SAP 실무자가 더 이상 사람과 문서를 뒤지느라 시간을 쓰지 않고, 안전한 데스크톱 환경에서 내부 지식과 표준 지식을 함께 활용해 빠르게 판단하고 실행할 수 있게 한다.

---

## 2. 문제 정의

현재 SAP 조직은 서로 다른 문제를 하나의 도구 없이 분산해서 처리합니다.

| 문제 | 현재 상태 | 목표 상태 |
|------|----------|----------|
| 운영 지식 분산 | 개인 메모, PPT, 위키, 메신저에 흩어짐 | 앱 안에서 역할별 지식 접근 |
| CBO 유지보수 보안 | 소스를 외부 AI에 넣기 어려움 | 로컬 우선 분석과 승인 기반 외부 사용 |
| 역할별 도구 분절 | Basis, 현업, PI, BTP 질문이 서로 다른 채널에 분산 | 하나의 데스크톱 앱에서 역할별 워크스페이스 제공 |
| 최신 SAP 기술 공백 | RAP, CAP, BTP 정보가 기존 운영 위키에 없음 | 표준 reference pack으로 최신 기술 질의 지원 |
| 근거 부족 답변 | 답변의 출처와 데이터 경계가 불명확 | 보안 모드와 근거를 명시하는 응답 |

---

## 3. 대상 사용자

### Primary Users
- SAP 운영자 / Basis 담당자
- ABAP / CBO 유지보수 담당자

### Secondary Users
- SAP 현업 / Key User
- PI/PO / Integration Suite 담당자
- SAP BTP / RAP / CAP 개발자

### 사용자별 핵심 니즈

| 사용자 | 핵심 니즈 |
|--------|----------|
| SAP 운영자 | T-code, 절차, 장애 진단, 시스템 운영 대응 |
| SAP 현업 | 업무 처리 절차, 트랜잭션 안내, 운영 문의 응답 |
| ABAP/CBO 담당자 | 민감 소스 보호, 유지보수 리스크 분석, 수정 방향 제안 |
| PI/Integration 담당자 | 메시지 흐름, 인터페이스, 어댑터, 모니터링 질의 |
| BTP/RAP/CAP 개발자 | 표준 기술 질문, 설계 가이드, 아키텍처 비교 |

---

## 4. 제품 원칙

### P1. Desktop-First
- 제품의 기본 실행 환경은 데스크톱 앱이다.
- 서버는 선택형 부가 기능이다.

### P2. Local-First Security
- 민감한 내부 텍스트는 기본적으로 외부 모델에 전달하지 않는다.
- 외부 사용은 모드와 승인 정책을 통해 제어한다.

### P3. Domain Pack Strategy
- 하나의 범용 봇이 아니라 역할별 전문 팩으로 나눈다.
- 공통 셸은 유지하고, 검색/프롬프트/응답 포맷만 팩별로 다르게 한다.

### P4. Explainable Responses
- 답변은 가능하면 근거, 참고 경로, 주의사항, 데이터 경계를 함께 보여준다.

---

## 5. 제품 모드

### Secure Local Mode
- 내부 CBO 소스, 운영 메모, 민감한 작업 텍스트 전용
- 외부 모델 전송 차단
- 로컬 규칙 엔진, 로컬 검색, 로컬 세션 저장

### Reference Mode
- SAP 표준, BTP, RAP, CAP, Integration Suite 같은 공개 지식 질문 전용
- 공개 reference pack 기반 응답
- 외부 모델 허용 가능

### Hybrid Approved Mode
- 원문이 아닌 승인된 요약본만 외부 모델에 전달
- 기업 환경에서 현실적인 절충 모드

---

## 6. Domain Packs

### D1. Ops Pack
- ST22, SM21, ST03N, STMS, SE03, 배치, 권한, 성능, CTS

### D2. Functional Pack
- 현업 질의, 업무 절차, 트랜잭션 안내, 운영 가이드

### D3. CBO Maintenance Pack
- `.txt` 기반 CBO 소스 점검
- 정적 규칙 분석, 리스크 분류, 권고안 생성

### D4. PI / Integration Pack
- PI/PO, Cloud Integration, Integration Suite
- 인터페이스 장애, 메시지 모니터링, 매핑, 운영 질의

### D5. BTP / RAP / CAP Pack
- SAP BTP, RAP, CAP 기술 질의
- 표준 가이드, 설계 지원, 비교 설명

---

## 7. 핵심 사용자 시나리오

### U1. 운영 이슈 대응
- 운영자가 "ST22 덤프가 반복되는데 어디부터 볼까?"라고 묻는다.
- 앱은 Ops Pack으로 라우팅한다.
- 관련 T-code, 점검 절차, 주의사항을 제시한다.

### U2. CBO 기밀 유지보수
- ABAP 담당자가 내부 CBO 소스를 `.txt`로 넣고 점검한다.
- 앱은 Secure Local Mode에서 정적 규칙 분석과 로컬 요약을 수행한다.
- 외부 모델 전송 없이 리스크와 개선 포인트를 보여준다.

### U3. 최신 기술 질의
- 개발자가 "RAP과 CAP 중 어떤 경우에 적합한가?"라고 묻는다.
- 앱은 Reference Mode에서 BTP/RAP/CAP Pack으로 라우팅한다.
- 공개 표준 지식 기반 설명과 비교 관점을 제공한다.

### U4. 현업 지원
- 현업 사용자가 업무 절차나 특정 T-code를 묻는다.
- 앱은 Functional Pack으로 라우팅한다.
- 기술 용어를 줄이고 절차 중심으로 답한다.

### U5. PI/Integration 운영
- 운영자가 인터페이스 장애를 설명한다.
- 앱은 PI / Integration Pack으로 라우팅한다.
- 메시지 흐름, 모니터링 지점, 점검 순서를 제시한다.

---

## 8. 기능 요구사항

### F1. Desktop Shell
- 채팅, 소스 분석, 세션, 설정을 하나의 앱에서 제공
- 우선순위: P0

### F2. Security Mode Selector
- 질문/작업 전 보안 모드를 명시적으로 선택
- 현재 세션의 데이터 전송 경계를 항상 표시
- 우선순위: P0

### F3. Domain Pack Routing
- 질문을 도메인 팩으로 자동 또는 수동 라우팅
- 팩별 시스템 지침, 검색 소스, 응답 포맷 분리
- 우선순위: P0

### F4. Confidential Source Workspace
- `.txt` 기반 CBO 소스 입력, 저장, 검색, 분석
- `.md`는 호환 입력으로 유지
- 우선순위: P0

### F5. Reference Knowledge Workspace
- 공개 SAP 표준 지식 질의
- SAP 운영, PI, BTP, RAP, CAP 레퍼런스 지원
- 우선순위: P1

### F6. Session and Audit
- 세션별 질문, 사용한 모드, 근거, 전송 여부 기록
- 우선순위: P1

### F7. Provider Routing
- local-only, enterprise gateway, external API 라우팅
- 질문 유형과 정책에 따라 호출 대상을 분기
- 우선순위: P1

### F8. Team Policy Distribution
- 조직 단위 보안 정책을 배포하고 Desktop에서 소비
- 우선순위: P2

---

## 9. 현재 구현 상태

### 이미 있는 기능
- Electron Desktop
- 채팅 UI
- CBO 분석 UI
- 설정 UI
- SQLite 기반 로컬 저장
- FastAPI 기반 Knowledge API
- MCP 서버

### 문서 개편 후 구현이 필요한 핵심 기능
- Security Mode Selector
- Domain Pack Registry
- Confidential / Reference 지식 분리
- 외부 전송 승인 흐름
- 감사 로그 뷰

---

## 10. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 플랫폼 | Windows 우선 Desktop 앱 |
| 응답성 | 일반 질의 첫 응답 3초 이내 목표 |
| 보안 | 민감 텍스트는 기본 local-only 처리 |
| 저장 | 세션과 기밀 데이터는 로컬 저장 우선 |
| 감사성 | 질문, 모드, 전송 여부, 참고 근거 기록 |
| 신뢰성 | 오프라인 또는 제한 연결 환경에서도 핵심 기능 제공 |
| UX | 기술 사용자와 비기술 사용자 모두 사용할 수 있는 단순한 흐름 |

---

## 11. 성공 지표

| 지표 | 목표 |
|------|------|
| 첫 질문까지 클릭 수 | 3클릭 이내 |
| CBO local-only 분석 성공률 | 95% 이상 |
| 내부 소스 외부 전송 없는 세션 비율 | 100% 목표 |
| 역할별 재사용률 | Ops, CBO, BTP 팩 각각 주간 재사용 발생 |
| 운영 질의 해결 시간 | 기존 대비 30% 이상 단축 |

---

## 12. 로드맵

### Phase 1
- Desktop-first MVP 정리
- Secure Local / Reference / Hybrid Approved 도입
- CBO txt 워크플로 강화

### Phase 2
- Domain Pack 구조화
- Ops / Functional / PI / BTP-RAP-CAP 팩 확장
- 공개 reference pack 정비

### Phase 3
- 정책 엔진, 감사 로그, 승인 UX 고도화
- 엔터프라이즈 게이트웨이 연동

### Phase 4
- 팀 배포, 중앙 정책, 선택형 headless runtime

---

## 13. 제외 범위

- SAP GUI 자동 조작
- 자동 RFC 실행
- 서버 중심 SaaS 전환
- 모든 SAP 모듈을 한 번에 완벽 지원하는 범용 제품

초기에는 `데스크톱 우선`, `운영/유지보수 중심`, `기밀 소스 보호`에 집중한다.
