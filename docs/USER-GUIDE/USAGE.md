# SAP Assistant Desktop Platform — 사용 가이드 (v5.0)

SAP Assistant Desktop Platform은 로컬 우선(Local-First) 아키텍처로 민감한 SAP 운영 데이터를 보호하면서, 다중 LLM과 커스텀 에이전트를 통해 SAP 운영 워크플로우를 자동화하는 플랫폼입니다.

이 가이드는 실제 사용 시나리오와 함께 주요 기능을 설명합니다.

---

## 1. 개요

### 플랫폼 소개

SAP Assistant는 다음과 같은 작업을 지원합니다:

- **AI 기반 채팅**: OpenAI, Anthropic, Google 다중 LLM과 대화
- **CBO 영향 분석**: 커스터마이징 객체(Custom Business Object) 변경의 위험도 자동 분석
- **지식 관리**: 기업 내부 문서와 공개 참고 자료의 중앙화된 저장소
- **자동화**: 정책 기반 승인 흐름과 스케줄 기반 에이전트 자동 실행
- **운영 대시보드**: 월간 마감(Closing), 루틴 업무(Routine), 일일 할 일(Daily Tasks) 관리

### 주요 기능 요약

| 기능 | 설명 |
|------|------|
| **Ask SAP** | 5가지 도메인 팩 선택 후 AI 채팅, 실시간 스트리밍 응답 |
| **CBO Analysis** | 코드 변경 텍스트 업로드 → 위험도/영향 분석 |
| **Knowledge Vault** | 기밀/참고 자료 분류 관리 및 검색 |
| **Cockpit** | 마감 관리, 루틴 설정, 일일 할 일 자동 생성 |
| **스케줄** | Cron 표현식으로 에이전트/스킬 자동 실행 (v5.0) |
| **정책 엔진** | 조건 기반 규칙 → 자동/수동 승인 흐름 (v5.0) |
| **Custom Agents/Skills** | YAML 형식 문서로 워크플로우 직접 정의 |

---

## 2. 설치 및 환경 설정

### 사전 요구사항

- **Node.js** 22.x LTS 이상 (`.nvmrc` 참조)
- **npm** 10.9.4 이상
- **Windows** 10 이상
- **메모리**: 4GB RAM 이상
- **디스크**: 500MB 여유 공간
- **API 키**: OpenAI, Anthropic, Google 중 최소 1개

### 설치 단계

#### 1단계: 저장소 클론

```bash
git clone https://github.com/choishiam0906/sap-assistant-desktop.git
cd sap-assistant-desktop
```

#### 2단계: 런타임 확인

```bash
npm run check:runtime
```

Node.js, npm, Python 버전을 확인합니다.

#### 3단계: 의존성 설치

```bash
npm install
```

Electron 네이티브 모듈이 자동으로 재빌드됩니다.

#### 4단계: 환경 파일 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 API 키를 입력하세요:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=...

# 앱 설정 (선택)
APP_NAME=SAP Assistant
APP_VERSION=5.0.0
NODE_ENV=development
LOG_LEVEL=info
```

**주의**: `.env` 파일은 git에 무시되므로 절대 커밋하지 마세요.

#### 5단계: 앱 빌드 및 실행

```bash
# 전체 빌드
npm run build

# 앱 실행
npm run start
```

> 팁: `npm run start`는 Electron과 충돌할 수 있는 `NODE_OPTIONS`를 자동으로 정리한 뒤 앱을 실행합니다.

---

## 3. 첫 번째 채팅

### 초기 설정

앱을 처음 실행하면 **Settings** 페이지로 이동합니다.

#### 3.1 보안 모드 선택

**Settings** > **Workspace**에서 보안 모드를 선택하세요:

| 모드 | 특징 | 추천 대상 |
|------|------|----------|
| **Secure Local** | 외부 전송 차단, 로컬 분석만 | 최대 보안 필요 환경 |
| **Reference** | 공개 지식만 외부 API 호출 | 표준 SAP 지식 질의 |
| **Hybrid Approved** | 승인된 요약본만 전송 | 기업 정책 준수 |

#### 3.2 도메인 팩 설정 (선택)

**Settings** > **Workspace**에서 기본 도메인 팩을 설정할 수 있습니다. 이는 채팅 시 기본값으로 사용됩니다.

### 첫 번째 채팅 실행

#### 1단계: Chat 페이지 접속

사이드바에서 **Chat** 또는 **Ask SAP**를 클릭합니다.

#### 2단계: 도메인 팩 선택

채팅창 위의 드롭다운에서 도메인 팩을 선택하세요:

```
Ask SAP
├─ Ops Pack              → SAP 시스템 운영/성능 질문
├─ Functional Pack       → 업무 프로세스 지원 (MM, SD, FI 등)
├─ CBO Maintenance       → CBO 변경 분석 (개발자)
├─ PI Integration Pack   → SAP PI/PO, Cloud Integration
└─ BTP/RAP/CAP         → SAP BTP, 모던 개발
```

#### 3단계: 프로바이더 & 모델 선택

채팅창 아래의 "프로바이더 선택" 버튼을 클릭합니다:

```
OpenAI
├─ GPT-4.1             (가장 정확함, 비쌈)
├─ GPT-4o              (다목적 모델)
└─ o4-mini             (빠르고 저비용)

Anthropic
├─ Claude Sonnet 4.6   (균형잡힘)
├─ Claude Opus 4.6     (최고 성능)
└─ Claude Haiku 4.5    (빠르고 저비용)

Google
├─ Gemini 2.5 Flash    (빠름)
└─ Gemini 2.5 Pro      (정확함)
```

#### 4단계: 질문 입력

채팅창에 질문을 입력하고 Enter를 누르세요:

```
예시 질문:
- "SAP ST22 덤프 분석 방법을 설명해줘"
- "MM 모듈의 표준 프로세스가 뭐야?"
- "BTP에서 권장되는 아키텍처 패턴은?"
```

#### 5단계: 실시간 응답 수신

응답이 **실시간 스트리밍**으로 나타납니다 (v5.0 신기능).

### 채팅 세션 관리

- **세션 저장**: 모든 채팅이 자동으로 SQLite에 저장됩니다.
- **세션 목록**: 좌측 사이드바의 **Sessions**를 클릭하여 과거 대화 복구
- **세션 아카이브**: 오래된 세션을 아카이브 처리할 수 있습니다.
- **세션 검색**: 날짜, 도메인 팩, 키워드로 검색 가능

---

## 4. CBO 영향 분석

CBO Analysis는 SAP 커스터마이징 객체의 변경에 따른 위험도와 영향 범위를 자동으로 분석합니다.

### 사용 시나리오

```
시나리오: 새로운 커스텀 필드를 EKPO(구매 발주 라인) 테이블에 추가
           → 영향받는 리포트, 인터페이스, 권한 자동 분석
```

### 단계별 사용법

#### 1단계: CBO Analysis 페이지 접속

사이드바에서 **CBO Analysis** 또는 **Code Lab**을 클릭합니다.

#### 2단계: 입력 방식 선택

두 가지 방식 중 선택:

**방식 1: 텍스트 직접 입력**
- 변경 사항을 자유롭게 작성
- 마크다운 형식 지원

**방식 2: 파일 업로드**
- `.txt` 또는 `.md` 파일 선택
- 여러 파일 일괄 업로드 지원 (폴더 일괄 분석)

#### 3단계: 분석 유형 선택

```
┌─────────────────────────────────┐
│ 규칙 기반 분석 (빠름, 로컬)     │
│ · 테이블 의존성 검사            │
│ · 필드명 패턴 매칭              │
│ · 인덱스 권고                   │
└─────────────────────────────────┘
            또는
┌─────────────────────────────────┐
│ LLM 강화 분석 (상세, 정확함)    │
│ · 위의 규칙 기반 + AI 분석      │
│ · 비즈니스 영향 평가            │
│ · 마이그레이션 전략             │
└─────────────────────────────────┘
```

#### 4단계: 결과 확인

```
분석 결과:
├─ 위험도: 높음/중간/낮음
├─ 요약: 2~3줄 요약
├─ 영향 범위:
│  ├─ 영향받는 테이블 (5개)
│  ├─ 의존 리포트 (12개)
│  └─ 권한 설정 변경 (PFCG roles)
└─ 권고사항:
   ├─ 즉시 조치
   ├─ 테스트 계획
   └─ 승인 경로
```

### 결과 활용

- **권고사항 다운로드**: CSV 또는 PDF 내보내기
- **팀과 공유**: 결과를 이메일 또는 Slack으로 전달
- **세션 저장**: 분석 결과는 자동 저장, 나중에 검색 가능

---

## 5. 소스 관리 (Knowledge Sources)

Knowledge Vault는 SAP 운영에 필요한 모든 문서/가이드를 중앙화하여 관리합니다.

### 소스 유형

#### 5.1 로컬 폴더 소스

**사용 사례**: 팀 공유 드라이브의 SAP 가이드

```
단계 1: Settings > Sources > "Add Local Folder"
단계 2: 폴더 선택 (예: C:\SAP-Guides\)
단계 3: 자동 인덱싱
```

**지원 파일**:
- `.md`, `.txt` (텍스트)
- `.pdf`, `.docx` (문서)
- `.xlsx` (스프레드시트)

#### 5.2 MCP 서버 소스 (v5.0)

**사용 사례**: 외부 API (Slack, Confluence 등)에서 데이터 가져오기

```
단계 1: Settings > Sources > "Connect MCP Server"
단계 2: 서버 URL 입력 (예: http://localhost:3000)
단계 3: 리소스 탐색 및 선택
단계 4: 동기화
```

### 소스 분류

```
Knowledge Sources
├─ Confidential (기밀)
│  └─ 내부 정책, 아키텍처 문서
└─ Reference (참고)
   └─ SAP 공식 문서, 외부 블로그
```

### 문서 검색 및 미리보기

```
검색 예시:
1. "ST22 덤프 분석" → 일치하는 문서 목록
2. 문서 클릭 → 미리보기 (모달)
3. "Chat에서 사용" → 현재 대화에 컨텍스트 추가
```

---

## 6. Cockpit (운영 대시보드)

Cockpit은 SAP 운영 팀의 일일/주간/월간 작업을 체계화합니다.

### 6.1 마감 관리 (Closing)

**목적**: 월간/연간 재무 마감 프로세스 관리

```
마감 계획 정의:
┌─ 2026년 3월 월간 마감
│  ├─ Step 1: AR(매출채권) 마감    (3/31 18:00까지)
│  ├─ Step 2: AP(매입채무) 마감    (4/1 12:00까지)
│  ├─ Step 3: GL(일반장부) 포스팅  (4/2 14:00까지)
│  └─ Step 4: 최종 검증            (4/3 10:00까지)
└─ 진행률: 25% (Step 1 완료)
```

**사용법**:
```
Cockpit > Closing
  1. "New Closing" 클릭
  2. 마감명 + 마감일 입력
  3. Step 추가 (필요한 단계만)
  4. 각 Step의 담당자/완료일 지정
  5. 진행 상황 추적 (진행률 자동 계산)
```

### 6.2 루틴 업무 (Routines)

**목적**: 반복되는 업무를 템플릿화하여 자동 실행

```
루틴 정의 예:
┌─ Daily: SAP 시스템 성능 체크
│  ├─ 실행 시간: 매일 08:00 (대한민국 시간)
│  ├─ 스킬: "Performance Report" 실행
│  └─ 결과 전달: Slack #sap-ops 채널
│
└─ Monthly: FI 조정 분석
   ├─ 실행 시간: 매월 1일 09:00
   ├─ 에이전트: "FI Reconciliation" 실행
   └─ 보고서 생성: PDF 저장
```

**스케줄 표현식** (Cron):
```
0 8 * * *      → 매일 08:00
0 9 1 * *      → 매월 1일 09:00
0 12 * * 1-5   → 평일 12:00 (월~금)
```

### 6.3 스케줄 (Schedule) — v5.0 신기능

**목적**: Cron 기반 에이전트/스킬 자동 실행

```
Settings > Cockpit > Schedule
  1. "New Schedule" 클릭
  2. 에이전트 또는 스킬 선택
  3. Cron 표현식 입력
  4. 실행 로그 확인
```

**실행 로그 예**:
```
Schedule: "Daily Performance Check"
├─ 실행 시간: 2026-03-14 08:00
├─ 상태: ✓ 성공
├─ 실행 시간: 2분 34초
└─ 결과: 검사 완료, 이상 없음
```

### 6.4 일일 업무 (Daily Tasks)

**목적**: 오늘의 할 일을 자동 생성하고 추적

```
Daily Tasks:
├─ 마감 단계 점검 (오늘 만료: 16:00)
├─ 우선 정책 검토 (대기 중: 3건)
├─ 스케줄 루틴 실행 결과 확인
└─ 새로운 채팅 세션 (3건)
```

---

## 7. Knowledge Vault

Knowledge Vault는 팀의 모든 SAP 지식을 중앙화합니다.

### 소스 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| **Internal Memo** | 팀 내부 메모 | "SAP CBO 변경 정책" |
| **Guideline** | 운영 가이드 | "월간 마감 체크리스트" |
| **Policy Document** | 정책 문서 | "정보보안 정책" |
| **External Reference** | 외부 자료 | "SAP 공식 문서 링크" |

### 문서 관리 흐름

```
문서 업로드:
  1. Knowledge Vault > "Add Source"
  2. 파일 선택 또는 텍스트 입력
  3. 분류: Confidential / Reference
  4. 도메인 팩 태깅 (Ops, Functional 등)
  5. 저장

문서 검색:
  1. 검색창에 키워드 입력
  2. 도메인 팩/분류로 필터링
  3. 결과 클릭 → 미리보기
  4. "Chat에서 사용" → 현재 대화에 추가
```

---

## 8. 세션 및 감시

### 세션 관리

**Sessions & Audit** 페이지에서:

```
세션 검색:
  ├─ 생성일: 2026-03-14
  ├─ 도메인팩: Ops Pack
  ├─ 프로바이더: Anthropic Claude
  ├─ 메시지 수: 12개
  └─ 비용: $0.24
```

**세션 상태**:
- **Active**: 현재 진행 중
- **Archived**: 보관됨
- **Closed**: 완료됨

### 할 일(Todo) 상태 관리

```
Todo 상태 전환:
open → analyzing → in-progress → resolved → closed
```

**할 일 생성**:
- 채팅 중 메시지 우클릭 → "Create Todo"
- 수동으로 + 버튼으로 생성

**할 일 추적**:
- 라벨 지정 (예: "urgent", "blocked")
- 플래그 표시 (중요 항목)
- 담당자 할당 (팀원)

### 감시 로그 (Audit Log)

모든 AI 상호작용이 감시 로그에 기록됩니다:

```
감시 항목:
├─ 타임스탐프: 2026-03-14 14:30:45
├─ 사용자: user@company.com
├─ 도메인팩: CBO Maintenance
├─ 프로바이더: Anthropic Claude
├─ 토큰 사용: 1,234 / 5,678
├─ 정책 검사: PASSED
├─ 보안 모드: Hybrid Approved
└─ 비용: $0.15
```

---

## 9. 정책 엔진 (v5.0)

정책 엔진은 조건 기반 규칙으로 자동/수동 승인 흐름을 관리합니다.

### 정책 설정

**Settings > Policy**에서:

```
정책 규칙 추가:
┌─ 조건 (Condition):
│  ├─ 프로바이더: Anthropic
│  ├─ 도메인팩: CBO Maintenance
│  ├─ 보안 모드: Hybrid Approved
│  └─ 소스 분류: Confidential
│
├─ 액션 (Action):
│  ├─ auto_approve (자동 승인)
│  ├─ require_approval (수동 승인 필요)
│  └─ block (요청 차단)
│
└─ 우선순위: 1 (숫자 낮을수록 높은 우선순위)
```

### 우선순위 매칭

```
규칙 1 (우선순위 1): CBO Maintenance + Confidential → require_approval
규칙 2 (우선순위 2): CBO Maintenance → auto_approve
규칙 3 (우선순위 3): 모든 도메인 → auto_approve

예시 매칭:
CBO Maintenance + Confidential 요청
  → 규칙 1 적용 (가장 높은 우선순위)
  → require_approval
```

### 대기 중인 승인

```
Settings > Policy > Pending Approvals:
  1. 요청 상세 확인 (프롬프트, 소스 등)
  2. "Approve" 또는 "Reject" 클릭
  3. 결과 즉시 반영 (감시 로그 기록)
```

---

## 10. 커스텀 에이전트 & 스킬

### 에이전트란?

에이전트는 여러 스킬을 순차적으로 실행하는 워크플로우입니다.

**예시**: "월간 성능 분석" 에이전트
```
Step 1: "ST03N 데이터 수집" 스킬 실행
  ↓
Step 2: "성능 데이터 분석" 스킬 실행
  ↓
Step 3: "리포트 생성" 스킬 실행
  ↓
결과: PDF 리포트
```

### agent.md 형식

```markdown
---
name: "월간 성능 분석"
description: "SAP 시스템 성능을 분석하고 리포트 생성"
category: "Cockpit"
tags: ["ops", "performance", "reporting"]
version: "1.0.0"
---

# 월간 성능 분석 에이전트

이 에이전트는 다음 작업을 순차적으로 수행합니다:
1. 지난 30일의 ST03N 성능 데이터 수집
2. 병목 지점(Bottleneck) 분석
3. 최적화 권고사항 생성

## 입력 파라미터
- start_date: 분석 시작일 (YYYY-MM-DD)
- end_date: 분석 종료일 (YYYY-MM-DD)

## Step 정의
{"steps": [
  {
    "skillId": "st03n_collector",
    "input": "지난 30일의 워크로드 데이터 수집",
    "sortOrder": 1
  },
  {
    "skillId": "performance_analyzer",
    "input": "수집된 데이터 분석 및 병목 식별",
    "sortOrder": 2
  }
]}
```

### skill.md 형식

```markdown
---
name: "성능 데이터 분석"
skillId: "performance_analyzer"
category: "Analysis"
version: "1.0.0"
---

# 성능 데이터 분석 스킬

당신은 SAP 성능 전문가입니다. 제공된 ST03N 데이터를 분석하고:
1. 응답 시간 추이 (최근 30일)
2. 병목 트랜잭션 (TOP 10)
3. 개선 권고사항 (우선순위별)

## 프롬프트 템플릿

다음 데이터를 분석해줘:

{input}

다음 형식으로 결과를 제공해주세요:
```json
{
  "response_time_trend": "...",
  "bottleneck_transactions": [...],
  "recommendations": [...]
}
```
```

### 커스텀 에이전트/스킬 관리

**Settings > Knowledge > Custom Agents/Skills**:

```
1. "New Agent" / "New Skill" 클릭
2. 폼 기반 에디터로 작성
3. 미리보기 확인
4. 저장 (자동으로 %APPDATA%/SAP Assistant/agents/ 또는 skills/)
```

**저장 경로**:
- Windows: `C:\Users\[Username]\AppData\Roaming\SAP Assistant\agents\`
- 자동 로드: 앱 시작 시 폴더 스캔

---

## 11. 설정 (Settings)

### AI 설정

**Settings > AI**:

```
프로바이더별 API 키 관리:
├─ OpenAI
│  ├─ API Key: [입력]
│  └─ Default Model: GPT-4.1
├─ Anthropic
│  ├─ API Key: [입력]
│  └─ Default Model: Claude Opus 4.6
└─ Google
   ├─ API Key: [입력]
   └─ Default Model: Gemini 2.5 Flash
```

### 워크스페이스 설정

**Settings > Workspace**:

```
보안 모드: ○ Secure Local ● Reference ○ Hybrid Approved
기본 도메인팩: [Ops Pack ▼]
Chat History 윈도우: [50 ▲▼]  (2~100 범위)
```

### 외관 설정

**Settings > Appearance**:

```
테마: ○ Light ● Dark ○ Auto
폰트 크기: [14px ▲▼]  (12~18px 범위)
언어: ● 한국어 ○ English
```

### 정책 설정

**Settings > Policy**:

```
규칙 관리:
  ├─ 규칙 추가/수정/삭제
  ├─ 우선순위 조정
  └─ 대기 중인 승인 확인
```

---

## 12. 개발 명령어

### 빌드 & 실행

```bash
npm run check:runtime       # 런타임 확인 (Node/npm/Python)
npm run build              # 전체 빌드 (타입체크 + 번들)
npm run dev                # 개발 모드 (메인 프로세스)
npm run start              # Electron 앱 실행
```

### 검증 & 테스트

```bash
npm run verify             # 전체 검증 (린트 + 타입체크 + 테스트)
npm run typecheck          # TypeScript 타입 체크
npm run lint               # ESLint 린트
npm run test:run           # Vitest 테스트 (한 번 실행)
npm run test:watch         # 감시 모드
npm run test:coverage      # 커버리지 리포트
```

### 포맷팅

```bash
npm run format             # Prettier 포맷팅
```

### 배포

```bash
npm run dist               # 모든 배포 포맷 생성
npm run dist:portable      # 포터블 실행 파일 (exe 단일 파일)
npm run dist:nsis          # NSIS 설치 프로그램
```

---

## 13. 문제 해결 (FAQ)

### 앱이 시작되지 않음

**문제**: "App failed to start"

**해결책**:
```bash
# 1. 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 2. 캐시 삭제
npm run clean
npm install

# 3. 로그 확인 (Windows Event Viewer 또는 콘솔)
npm run start  # 에러 메시지 확인
```

### API 키 인증 실패

**문제**: "Invalid API key"

**해결책**:
1. `.env` 파일 확인:
   ```bash
   cat .env | grep API_KEY
   ```

2. API 제공자 대시보드 확인:
   - OpenAI: https://platform.openai.com/account/api-keys
   - Anthropic: https://console.anthropic.com/account/keys
   - Google: https://console.cloud.google.com/

3. API 할당량 확인 (초과 시 빌링 정보 업데이트)

### 데이터베이스 오류

**문제**: "SQLite database is locked"

**해결책**:
```bash
# 1. DB 파일 권한 확인
ls -la ./data/app.db

# 2. 권한 설정
chmod 644 ./data/app.db

# 3. 초기화 (데이터 손실!)
rm ./data/app.db
npm run start  # 자동 재생성
```

### 스트리밍 응답이 끊김

**문제**: "Connection timeout" (v5.0)

**해결책**:
1. 네트워크 연결 확인
2. 프로바이더 상태 확인:
   - https://status.openai.com
   - https://status.anthropic.com
   - https://www.google.com/appsstatus
3. 파이어월/프록시 설정 확인

### 느린 응답

**문제**: "Slow response time"

**해결책**:
1. 모델 변경:
   - GPT-4.1 > Claude Opus > Gemini 2.5 (정확도 순)
   - o4-mini > GPT-4o mini > Claude Haiku (속도 순)

2. 네트워크 확인:
   ```bash
   ping api.openai.com
   ```

3. 로컬 리소스 확인:
   - 메모리 사용률 (작업 관리자)
   - CPU 사용률 확인

---

## 14. 보안 주의사항

### API 키 보호

- **절대 공유하지 마세요**: GitHub에 푸시, 이메일, Slack 등
- **정기 로테이션**: 최소 분기별 (90일)
- **키 리셋**: 유출 의심 시 즉시 리셋

### 민감 데이터 관리

| 데이터 | 저장 위치 | 보호 수준 |
|--------|----------|----------|
| API 키 | 시스템 키체인 | ⭐⭐⭐ 최고 |
| 세션 | SQLite (로컬) | ⭐⭐ 중간 |
| 감시 로그 | SQLite (로컬) | ⭐⭐ 중간 |
| 설정 | SQLite (로컬) | ⭐ 기본 |

### 보안 모드별 데이터 흐름

```
Secure Local:        로컬 PC에서만 처리 (외부 전송 X)
Reference:           공개 지식만 외부 전송
Hybrid Approved:     승인된 요약본만 외부 전송
```

---

## 15. 최적화 팁

### 성능 개선

```
✓ Chat History 윈도우 조정 (Settings > Workspace)
  - 기본값: 50개
  - 낮을수록 응답 빠름, 컨텍스트 손실 위험

✓ 모델 선택 (속도 우선)
  - o4-mini (빠름)
  - Claude Haiku (빠름)
  - Gemini 2.5 Flash (빠름)

✓ 로컬 분석 활용 (규칙 기반)
  - CBO Analysis 시 LLM 강화 선택 취소
  - 빠른 피드백, 비용 절감
```

### 비용 절감

```
✓ 프로바이더 비교
  OpenAI o4-mini: ~$0.015 / 1K tokens
  Claude Haiku:   ~$0.008 / 1K tokens
  Gemini Flash:   ~$0.075 / 1M tokens

✓ 배치 처리
  - 여러 질문을 한 번에 처리
  - 스케줄 루틴으로 자동화

✓ 감시 로그 정리
  - 정기적으로 이전 로그 아카이브
  - DB 크기 최소화
```

---

## 참고 자료

| 주제 | 링크 |
|------|------|
| **아키텍처** | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| **커스텀 에이전트** | [CUSTOM-AGENTS.md](./CUSTOM-AGENTS.md) |
| **커스텀 스킬** | [CUSTOM-SKILLS.md](./CUSTOM-SKILLS.md) |
| **도메인 팩** | [DOMAIN-PACKS.md](./DOMAIN-PACKS.md) |
| **보안 모드** | [SECURITY-MODES.md](./SECURITY-MODES.md) |
| **API 레퍼런스** | [IPC-PROTOCOL.md](../API/IPC-PROTOCOL.md) |

---

## 버전 정보

**SAP Assistant Desktop Platform v5.0.0**

- 릴리스 날짜: 2026-03-11
- Node.js: 22.x LTS
- Electron: 31.x
- React: 18.x

**주요 기능 (v5.0)**:
- 실시간 LLM 스트리밍 (SSE 기반)
- 스케줄 자동 실행 (node-cron)
- 정책 엔진 (자동/수동 승인)
- 에러 복원력 (Retry + Circuit Breaker + Fallback)
- DB 마이그레이션 시스템

---

**최종 업데이트**: 2026-03-14
