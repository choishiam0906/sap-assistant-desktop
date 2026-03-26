# Enterprise Knowledge Hub v8.0.0 — 제품 요구사항 문서 (PRD)

**버전**: 1.0
**작성일**: 2026-03-23
**최종 수정**: 2026-03-23
**상태**: 완결

---

## 1. 제품 비전 및 목표

### 1.1 비전 (Vision)

Enterprise Knowledge Hub는 제조기업의 현업 운영자(End User)가 복잡한 시스템 에러를 자가 진단하고, AI 기반의 지능형 분석으로 운영 업무를 자율적으로 해결하는 **로컬 우선(Local-First) 지능형 지원 플랫폼**입니다.

### 1.2 핵심 가치 제안 (Value Proposition)

| 관점 | 가치 |
|------|------|
| **현업 운영자** | 시스템 에러 자가 진단, AI 분석으로 운영 시간 단축 |
| **IT 관리자** | 장애 보고 증가 감소, 데이터 거버넌스 (데이터는 로컬 저장) |
| **조직** | 시스템 다운타임 감소, 운영 비용 절감, 생산성 향상 |

### 1.3 제품 목표 (Goals)

1. **에러 자가 진단**: 사용자가 SAP ERP, MES, QMS, PMS 등에서 발생한 시스템 에러를 AI가 자동으로 분석 및 진단
2. **통합 분석**: 코드(GitHub), 이메일(Gmail/Outlook), 문서를 연계하여 근본 원인 파악
3. **자동화 지원**: 루틴 실행, 스케줄 자동 실행으로 반복 작업 자동화
4. **로컬 우선**: 데이터는 SQLite에 로컬 저장, 선택적 클라우드 연동 (하이브리드 모드)
5. **다중 LLM 지원**: OpenAI, Anthropic, Google 등 최신 LLM 활용, 사용자 선택 가능

---

## 2. 타겟 사용자 페르소나

### 2.1 주요 페르소나

#### **페르소나 1: SAP 현업 운영자 (Primary User)**
- **역할**: MES, QMS, PMS, SAP ERP 운영 담당자
- **특성**:
  - 시스템 에러 발생 시 IT 부서 의존도 높음
  - 기술 배경 중간 (UI 사용 익숙, 코드는 모름)
  - 빠른 문제 해결 필요 (장애시간 최소화)
- **니즈**:
  - 에러 메시지 해석 지원
  - SAP 트랜잭션 코드(T-code) 연결
  - 유사 사례 검색
  - 자동 마감 플랜 생성

#### **페르소나 2: 개발팀 엔지니어 (Secondary User)**
- **역할**: SAP 커스터마이징, 코드 유지보수
- **특성**:
  - GitHub 저장소 관리
  - 코드 분석 및 리뷰 능력
  - AI 코드 분석 활용으로 효율성 추구
- **니즈**:
  - GitHub 코드 인덱싱 및 AI 분석
  - 다중 언어(18개) 지원
  - 코드 네비게이션

#### **페르소나 3: IT 관리자 (Admin)**
- **역할**: 시스템 통합, 보안 정책 수립
- **특성**:
  - 보안/컴플라이언스 중심
  - 데이터 거버넌스 요구
- **니즈**:
  - 보안 모드 (Secure Local, Reference, Hybrid)
  - 감사 로그(Audit Log)
  - OAuth 통합 인증

---

## 3. 사용자 스토리 (User Stories)

### 3.1 현업 운영자 시나리오

#### US-001: SAP 트랜잭션 에러 자가 진단
**AS-A** SAP MES 운영자
**I-WANT** 시스템 에러 메시지를 입력하면 AI가 원인과 해결 방법을 제시
**SO-THAT** IT 부서 호출 없이 빠르게 문제를 해결할 수 있다

**인수조건 (AC)**:
- 에러 메시지 복사 → 채팅창에 입력 → 2초 이내 AI 응답
- 관련 SAP T-코드 제시
- 유사 사례 링크 제공

#### US-002: 이메일 기반 자동 마감 플랜 생성
**AS-A** SAP 프로세스 소유자
**I-WANT** Gmail/Outlook에서 SAP 관련 이메일을 자동 분석하여 마감 일정 플랜 생성
**SO-THAT** 이메일 분산 대신 AI가 자동으로 우선순위를 정리해준다

**인수조건**:
- 매일 자정 자동 실행
- SAP 메타데이터(금액, 마감일) 추출
- 현업자용 리포트 자동 생성

#### US-003: CodeLab 통합으로 코드 기반 분석
**AS-A** 개발팀 엔지니어
**I-WANT** GitHub 저장소의 SAP 코드를 자동 인덱싱하고 AI 분석 결과 조회
**SO-THAT** 코드 리뷰 시간을 단축하고 숨겨진 이슈를 발견할 수 있다

**인수조건**:
- GitHub OAuth 연동 후 자동 동기화
- 18개 언어 지원 (Java, ABAP, JavaScript 등)
- 증분 동기화 (SHA 기반)

#### US-004: 루틴 실행으로 반복 작업 자동화
**AS-A** SAP 배치 프로세스 담당자
**I-WANT** 매주 정해진 시간에 자동으로 실행되는 SAP 점검 루틴을 설정
**SO-THAT** 매주 수동으로 진행하던 작업을 자동화한다

**인수조건**:
- 루틴 템플릿 선택 (Ops, Functional, CBO 등)
- node-cron 기반 스케줄 설정
- 실행 히스토리 및 결과 로그 저장

#### US-005: CBO 분석으로 커스터마이징 리스크 평가
**AS-A** SAP 품질 보증(QA) 담당자
**I-WANT** 커스터마이징 코드(CBO)의 위험도를 AI 분석으로 평가
**SO-THAT** 위험한 커스터마이징을 사전에 발견하고 개선 우선순위를 결정할 수 있다

**인수조건**:
- CBO 코드 업로드 → 분석 시작
- 위험도 점수(0~100) 산출
- 개선 추천사항 제시

### 3.2 IT 관리자 시나리오

#### US-101: 보안 정책 기반 배포 (Secure Local/Reference/Hybrid)
**AS-A** IT 보안 관리자
**I-WANT** 데이터 거버넌스 요구에 맞게 3가지 보안 모드 중 선택 배포
**SO-THAT** 민감한 데이터 노출 없이 안전하게 운영할 수 있다

**인수조건**:
- **Secure Local**: 모든 데이터 로컬 저장, LLM 호출 시 데이터 마스킹
- **Reference**: 참조용 문서만 저장, LLM은 API 호출
- **Hybrid Approved**: 선택된 데이터만 클라우드 동기화

#### US-102: OAuth 통합으로 사용자 인증
**AS-A** IT 관리자
**I-WANT** OpenAI, Anthropic, Google, Microsoft 계정으로 통합 인증
**SO-THAT** 각각의 LLM 키 관리 부담을 줄이고 사용자 추적이 가능하다

**인수조건**:
- PKCE 기반 OAuth 2.0 흐름
- 자격증명은 시스템 키체인(keytar) 저장
- GitHub Device Code 흐름 지원 (Copilot 연동)

#### US-103: 감사 로그 (Audit Log) 조회
**AS-A** 컴플라이언스 담당자
**I-WANT** 모든 사용자의 AI 분석 요청, 결과, 조회 기록을 감시
**SO-THAT** 규제 요구사항(예: GDPR, 내부 감시)을 충족할 수 있다

**인수조건**:
- 사용자, 시간, 입력 텍스트, 응답 요약 기록
- CSV 내보내기 기능
- 보관 주기 설정 가능

---

## 4. 기능 요구사항 (Functional Requirements)

### 4.1 핵심 기능 (Core Features)

#### **기능 1: 다중 LLM 채팅 (Multi-LLM Chat)**
**우선순위**: P0 (Critical)
**상태**: 완료

**요구사항**:
- OpenAI GPT-4.1 (gpt-4-turbo)
- Anthropic Claude Opus/Sonnet (claude-3-opus, claude-3-sonnet)
- Google Gemini 2.5 Flash
- SSE(Server-Sent Events) 스트리밍 지원
- 사용자가 런타임에 LLM 선택 가능
- 시스템 프롬프트 커스터마이징 가능 (Domain Pack별)
- 문맥 윈도우 설정 가능 (2~100 메시지)

**인터페이스**:
```
[채팅 입력창] → [LLM 선택 드롭다운: OpenAI/Anthropic/Google]
[메시지 목록] → [스트리밍 응답 실시간 표시]
```

---

#### **기능 2: CodeLab GitHub 연동**
**우선순위**: P0 (Critical)
**상태**: 완료

**요구사항**:
- GitHub REST API OAuth 연동
- 자동 코드 인덱싱 (ABAP, Java, JavaScript, Python 등 18개 언어)
- 증분 동기화 (Git SHA 기반 변경 감지)
- 파일 단위 LLM 분석
- 코드 네비게이션 (파일 브라우저)
- 분석 진행률 추적

**범위**:
- 개인 저장소 + 팀 저장소
- 최대 저장소 수 설정 (성능 고려)
- 대용량 파일 필터링 (예: 1MB 이상 제외)

---

#### **기능 3: 이메일 통합 분석 (Email Integration)**
**우선순위**: P0 (Critical)
**상태**: 완료

**요구사항**:
- Gmail MCP(Model Context Protocol) 연동
- Outlook Microsoft Graph API 연동
- 이메일 자동 수집 (매일 정해진 시간)
- SAP 메타데이터 추출 (금액, 마감일, 담당자)
- AI 기반 마감 일정 플랜 생성
- 마감 플랜 CSV/PDF 내보내기

**범위**:
- 최근 1개월 이메일만 분석 (성능)
- 특정 발신자/키워드 필터링 가능
- 개인 계정만 지원 (기업 계정은 제약 가능)

---

#### **기능 4: 코드 분석 엔진 (Code Analysis Engine)**
**우선순위**: P0 (Critical)
**상태**: 완료

**요구사항**:
- 소스 파일/폴더 단위 업로드
- LLM 기반 코드 분석 (정적 분석 + AI 분석)
- 분석 결과 저장 (SQLite)
- 분석 진행률 UI 표시
- 분석 결과 비교 (버전별)

**분석 항목**:
- 코드 품질 (복잡도, 보안 취약점)
- SAP 특화 이슈 (ABAP 성능, 권한 설정)
- 성능 문제 (쿼리 최적화, 메모리 누수)

---

#### **기능 5: CBO(CustomizingBased Object) 분석**
**우선순위**: P0 (Critical)
**상태**: 완료

**요구사항**:
- CBO 코드 업로드 및 파싱
- 규칙 기반 분석 (SAP 가이드라인 적용)
- LLM 기반 위험도 평가
- 위험도 점수화 (0~100)
- 개선 추천사항 생성

**분석 항목**:
- 데이터 무결성 위반
- 성능 이슈
- 보안 취약점
- SAP 표준 편차

---

#### **기능 6: 5가지 도메인 팩 (Domain Pack System)**
**우선순위**: P0 (Critical)
**상태**: 완료

**지원 도메인**:
1. **Ops (운영)**: 일일 운영 업무 자동화
2. **Functional (기능)**: SAP 기능 컨설팅
3. **CBO Maintenance (커스터마이징)**: CBO 분석 및 개선
4. **PI Integration (프로세스 통합)**: PI/PO 트러블슈팅
5. **BTP/RAP/CAP (클라우드)**: SAP Cloud 기술

**Domain Pack 기능**:
- 도메인별 시스템 프롬프트 커스터마이징
- 도메인별 T-코드, 문서 링크 연결
- 도메인별 루틴 템플릿 제공

---

#### **기능 7: 보안 모드 (Security Modes)**
**우선순위**: P0 (Critical)
**상태**: 완료

**3가지 모드**:

| 모드 | 데이터 저장 | LLM 호출 | 용도 |
|------|-----------|---------|------|
| **Secure Local** | 로컬만 | 마스킹 후 호출 | 최고 보안 요구 환경 |
| **Reference** | 참조만 | API 호출 | 일반 용도 |
| **Hybrid Approved** | 선택 데이터 동기화 | 정상 호출 | 클라우드 활용 |

---

### 4.2 인증 & 보안 기능 (Authentication & Security)

#### **기능 8: OAuth 4대 프로바이더**
**우선순위**: P0 (Critical)
**상태**: 완료

**지원 프로바이더**:
- OpenAI (로그인 + API 키 관리)
- Anthropic (로그인 + API 키 관리)
- Google (로그인 + Gmail/Drive 접근)
- Microsoft (로그인 + Outlook 접근)

**특징**:
- PKCE(Proof Key for Code Exchange) 기반 OAuth 2.0
- 클라이언트 시크릿 저장 없음 (보안)
- Electron IPC를 통한 안전한 인증 흐름

---

#### **기능 9: GitHub Device Code 흐름**
**우선순위**: P1 (High)
**상태**: 완료

**요구사항**:
- GitHub Copilot 인증 지원
- Device Code 기반 흐름 (브라우저 없이 인증)
- 토큰 자동 갱신

---

#### **기능 10: SecureStore (보안 저장소)**
**우선순위**: P0 (Critical)
**상태**: 완료

**저장 항목**:
- OAuth 토큰 (access_token, refresh_token)
- API 키 (OpenAI, Anthropic, Google)
- 사용자 자격증명

**저장 방식**:
- **기본**: OS 시스템 키체인 (keytar 사용)
  - Windows: DPAPI (Data Protection API)
  - macOS: Keychain
  - Linux: Secret Service
- **Fallback**: AES-256-GCM 파일 암호화 (keytar 실패 시)

---

#### **기능 11: Logger Redaction (로그 마스킹)**
**우선순위**: P1 (High)
**상태**: 완료

**마스킹 항목**:
- API 키 (sk-*, claude-*, AIza*)
- OAuth 토큰 (Bearer, Authorization 헤더)
- 사용자 이메일
- 민감한 개인 정보

**구현**:
- Pino 로거 기반 커스텀 필터
- 디버깅 모드에서도 마스킹 유지

---

### 4.3 자동화 기능 (Automation Features)

#### **기능 12: 스케줄 자동 실행 (Schedule Automation)**
**우선순위**: P1 (High)
**상태**: 완료

**요구사항**:
- node-cron 기반 스케줄 설정
- Cockpit UI에서 시각적 관리
- 실행 시간 커스터마이징 (매일/매주/매월)
- 실행 결과 이메일 알림 (선택)

**사용 사례**:
- 매일 03:00 이메일 수집 및 분석
- 매주 월요일 09:00 주간 SAP 점검
- 매월 첫째 날 CBO 분석 리포트 생성

---

#### **기능 13: 에이전트 파이프라인 (Agent Pipeline)**
**우선순위**: P1 (High)
**상태**: 완료

**요구사항**:
- 프리셋 에이전트 제공 (도메인별)
- 커스텀 에이전트 생성 (드래그앤드롭)
- 멀티 스텝 실행 지원
- 조건부 실행 (IF/THEN)
- 결과 집계 및 리포팅

**예시 에이전트**:
```
1. 이메일 수집 (Gmail)
   ↓
2. SAP 메타데이터 추출 (LLM)
   ↓
3. 마감 일정 플랜 생성 (LLM)
   ↓
4. CSV 내보내기 (FileSystem)
   ↓
5. Slack 알림 (Webhook)
```

---

#### **기능 14: 루틴 시스템 (Routine System)**
**우선순위**: P1 (High)
**상태**: 완료

**요구사항**:
- 루틴 템플릿 (도메인별 제공)
- 루틴 실행 (수동 + 스케줄)
- 실행 히스토리 저장
- 지식 연결 (결과 → 지식베이스)

**루틴 유형**:
1. **Ops 루틴**: 일일 운영 체크리스트
2. **Functional 루틴**: 기능 검증 및 문서화
3. **CBO 루틴**: 커스터마이징 자동 분석

---

### 4.4 인프라 및 안정성 기능

#### **기능 15: DB 마이그레이션 시스템**
**우선순위**: P1 (High)
**상태**: 완료

**요구사항**:
- SQLite 스키마 점진적 진화
- 버전별 마이그레이션 스크립트
- 자동 적용 및 롤백 가능
- 마이그레이션 이력 저장

**마이그레이션 구조**:
```
migrations/
├── 001-init-schema.sql
├── 002-add-audit-log.sql
├── 003-create-routine-table.sql
└── 004-add-domain-pack-columns.sql
```

---

#### **기능 16: 에러 복원력 (Error Resilience)**
**우선순위**: P1 (High)
**상태**: 완료

**구현**:
- **Retry**: 지수 백오프(Exponential Backoff) 재시도
- **Circuit Breaker**: 연속 실패 시 자동 차단
- **Fallback**: 주 LLM 실패 시 대체 LLM 자동 사용

**설정**:
- 최대 재시도: 3회
- 재시도 간격: 1s → 2s → 4s
- Circuit 임계값: 5번 연속 실패

---

#### **기능 17: MCP 서버 연결**
**우선순위**: P1 (High)
**상태**: 완료

**요구사항**:
- Model Context Protocol SDK 1.27 통합
- Gmail MCP 서버 (이메일 수집)
- Outlook MCP 서버 (이메일 수집)
- 확장성: 향후 추가 MCP 서버 연동 가능

---

#### **기능 18: 배포 (Deployment)**
**우선순위**: P0 (Critical)
**상태**: 완료

**배포 형태**:
- **NSIS 설치형**: Windows 설치 프로그램 (Enterprise-Knowledge-Hub-8.0.0-Setup.exe)
- **Portable**: 설치 불필요 휴대용 (Enterprise-Knowledge-Hub-8.0.0-Portable.exe)

**빌드 파이프라인**:
```
TypeScript → esbuild (CJS 번들) → electron-builder → NSIS/Portable
```

**배포 자동화**:
- GitHub Releases에 자동 업로드
- electron-updater 기반 자동 업데이트 (선택)

---

## 5. 비기능 요구사항 (Non-Functional Requirements)

### 5.1 성능 (Performance)

| 항목 | 요구사항 |
|------|----------|
| **앱 시작 시간** | < 3초 |
| **채팅 응답 시간** | < 5초 (스트리밍 시작) |
| **코드 인덱싱** | 10K 파일 → < 30분 |
| **이메일 분석** | 1K 이메일 → < 5분 |
| **DB 쿼리** | < 100ms (대부분) |
| **UI 반응성** | 60 FPS (스크롤, 애니메이션) |

### 5.2 확장성 (Scalability)

| 항목 | 요구사항 |
|------|----------|
| **사용자 수** | 단일 기기 1명 (데스크톱 앱) |
| **저장소 크기** | 최대 5GB SQLite DB |
| **동시 API 호출** | 최대 3 (Provider별 1) |
| **메모리 사용** | < 500MB (상정 용량) |

### 5.3 보안 (Security)

| 항목 | 요구사항 |
|------|----------|
| **자격증명 저장** | OS 키체인 또는 AES-256-GCM |
| **데이터 전송** | TLS 1.3 (HTTPS) |
| **권한 검증** | Preload IPC + 신뢰 경계 (Trust Boundary) |
| **로그 마스킹** | API 키, 토큰, 개인정보 자동 마스킹 |
| **SQL Injection 방지** | Prepared Statements (better-sqlite3) |

### 5.4 신뢰성 (Reliability)

| 항목 | 요구사항 |
|------|----------|
| **가용성** | 99.5% (사용 중 다운타임 최소) |
| **데이터 무결성** | 트랜잭션 ACID 보장 (SQLite) |
| **자동 복구** | 비정상 종료 → 다음 시작 시 DB 검증 |
| **백업** | 수동 백업 UI 제공 |

### 5.5 접근성 (Accessibility)

| 항목 | 요구사항 |
|------|----------|
| **키보드 네비게이션** | 모든 주요 UI 요소 탭 이동 가능 |
| **ARIA 레이블** | 버튼, 모달, 입력 필드 ARIA 적용 |
| **스크린 리더** | NVDA, JAWS 호환성 (테스트) |
| **색상 대비** | WCAG AA 표준 (4.5:1 이상) |

### 5.6 호환성 (Compatibility)

| 항목 | 요구사항 |
|------|----------|
| **운영체제** | Windows 10 이상 (Electron 31 지원) |
| **Node.js** | 22.x |
| **npm** | >= 10.9.4 < 11 |
| **React** | 18.x |
| **TypeScript** | 5.7+ (Strict Mode) |

### 5.7 운영 (Operations)

| 항목 | 요구사항 |
|------|----------|
| **로깅** | Pino (구조화된 로그) |
| **모니터링** | 에러율, 응답시간 추적 (선택) |
| **구성 관리** | 환경 변수 (.env) |
| **업데이트** | electron-updater 자동 확인 |

---

## 6. 성공 지표 (KPI, Key Performance Indicators)

### 6.1 제품 성공 지표

| KPI | 목표 | 측정 방법 |
|-----|------|---------|
| **사용자 만족도** | > 85% | 앱 내 설문조사 (NPS) |
| **기능 완성도** | 100% | 기능 체크리스트 검증 |
| **성능** | 응답 < 5초 | 사용자 테스트 측정 |
| **에러율** | < 1% | 에러 로그 분석 |
| **유지율** | 월 > 70% | 월간 활성 사용자 추적 |

### 6.2 비즈니스 성공 지표

| KPI | 목표 | 측정 방법 |
|-----|------|---------|
| **IT 헬프데스크 티켓 감소** | -30% | SAP 에러 관련 티켓 수 |
| **평균 문제 해결 시간** | -50% | MTTR (Mean Time To Resolve) |
| **사용자 자가 진단 비율** | > 60% | 자가 진단 건수 / 전체 에러 |
| **자동화율** | > 40% | 루틴 자동 실행 건수 |

---

## 7. 제약 조건 (Constraints)

### 7.1 기술 제약

| 제약 | 영향 | 대응 |
|------|------|------|
| **Electron 기반 데스크톱 앱** | Windows 10+ 필수 | 향후 macOS/Linux 지원 검토 |
| **SQLite 로컬 저장** | 단일 기기 운영 | 팀 공유 시 Hybrid 모드 활용 |
| **LLM API 의존도** | 외부 서비스 의존 | Circuit Breaker로 복원력 강화 |
| **React 18** | IE 미지원 | 최신 브라우저 환경만 지원 |

### 7.2 리소스 제약

| 제약 | 영향 | 완화 방안 |
|------|------|---------|
| **개발팀 규모** | 3-5명 | 우선순위 기반 로드맵 |
| **테스트 커버리지** | 초기 제한적 | 점진적 확대 (CI/CD) |
| **문서 지원 언어** | 한국어 중심 | 향후 영문 지원 |

### 7.3 시간 제약

| 제약 | 영향 | 일정 |
|------|------|-----|
| **v7.1 릴리스** | 현재 상태 고정 | 2026-03-23 배포 |
| **v8.0 계획** | 향후 개선 | 2026-06-23 예정 |

---

## 8. 향후 계획 (Roadmap)

### 8.1 v8.1 (2026-04-30)
- [ ] Slack 통합 (알림)
- [ ] 다크 모드 UI 개선
- [ ] 접근성(a11y) 강화

### 8.2 v9.0 (2026-06-23)
- [ ] macOS/Linux 지원
- [ ] 팀 협업 기능 (클라우드 동기화)
- [ ] 모바일 앱 (React Native)
- [ ] 추가 LLM 지원 (Claude 4, Gemini 3 등)

### 8.3 v10.0+ (2026-09+)
- [ ] AI 에이전트 자동화 고도화
- [ ] SAP S/4HANA 2025 지원
- [ ] 규제 컴플라이언스 인증 (SOC2, ISO27001)

---

## 부록: 용어 정의 (Glossary)

| 용어 | 정의 |
|------|------|
| **T-코드(T-Code)** | SAP 트랜잭션 코드 (예: VA01, OAAD) |
| **CBO** | SAP 커스터마이징 기반 객체 (Customizing-Based Object) |
| **Domain Pack** | 도메인별 시스템 설정 패키지 (Ops, Functional 등) |
| **MCP** | Model Context Protocol (LLM 컨텍스트 확장) |
| **OAuth** | Open Authorization (사용자 인증 프로토콜) |
| **PKCE** | Proof Key for Code Exchange (보안 OAuth 확장) |
| **SSE** | Server-Sent Events (단방향 실시간 스트리밍) |
| **Local-First** | 데이터를 로컬에 저장하고 필요시만 동기화하는 아키텍처 |
| **Hybrid Mode** | 로컬 + 클라우드 선택적 동기화 |

---

**문서 작성**: Claude Opus 4.6
**검토 상태**: 최종 검증 완료
**다음 검토일**: 2026-06-23 (v8.0 계획 수립)
