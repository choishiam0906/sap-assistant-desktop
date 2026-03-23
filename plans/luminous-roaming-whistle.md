# Phase 1: 출시 준비 (Launch Readiness) 구현 계획

## Context

SAP Knowledge Hub v7.1.0의 Post-P4 전략으로 "Narrowest Wedge" 접근법이 승인되었습니다.
5-10명의 SAP Basis 사용자에게 Transport Review 워크플로우를 제공하기 위한 **출시 준비** 작업입니다.

**핵심 발견**: 탐색 결과 인프라의 **80%가 이미 구현**되어 있습니다.
- API 키 입력 UI: `SettingsAiSection.tsx` (869줄, 완전 구현)
- OAuth 3종 플로우: `oauthManager.ts` + `callbackServer.ts` + `githubDeviceCode.ts`
- Keytar 키체인: `secureStore.ts` (메모리 fallback 포함)
- NSIS 인스톨러: `package.json` electron-builder 설정 완료
- IPC 인증 핸들러: 11개 메서드 등록 완료

**실제 남은 갭**: 보안 강화, 첫 실행 온보딩, 데모 모드 토글, 이메일 fallback

---

## 구현 계획

### Gap 1 — 보안 강화 (P0, 필수)

#### 1-A. Logger Redaction (API 키 로그 노출 방지)

**파일**: `src/main/logger.ts`

현재 pino 로거에 `redact` 설정이 없어서 에러 로그에 API 키가 평문 노출될 수 있습니다.

```
변경 전: pino({ level: "info" }, pino.destination(getLogPath()))
변경 후: pino({ level: "info", redact: [...] }, pino.destination(getLogPath()))
```

추가할 redact 경로:
- `*.accessToken`, `*.refreshToken`, `*.apiKey`
- `*.headers.authorization`, `*.headers["x-api-key"]`

개발 모드(pino-pretty)에도 동일 redact 적용.

**LOC**: ~15줄 변경

#### 1-B. BrowserWindow 보안 명시 선언

**파일**: `src/main/index.ts` (createWindow 함수, 50-53줄)

Electron 31 기본값이 안전하지만, 보안 감사를 위해 명시적 선언 추가:

```typescript
webPreferences: {
  preload: join(mainDir, "../preload/index.cjs"),
  contextIsolation: true,    // 기본값이지만 명시
  sandbox: true,             // 기본값이지만 명시
  nodeIntegration: false,    // 기본값이지만 명시
}
```

**LOC**: ~3줄 추가

#### 1-C. SecureStore AES-256 파일 Fallback

**파일**: `src/main/auth/secureStore.ts`

현재 keytar 실패 시 메모리 Map fallback → 앱 재시작 시 토큰 소실.
프로덕션 배포를 위해 AES-256-GCM 파일 기반 fallback 구현:

```
keytar (시스템 키체인)
  ↓ 실패 시
AES-256-GCM 파일 암호화 (userData/secure-store.enc)
  - 키: machine-id 기반 PBKDF2 유도
  - IV: 랜덤 생성, 파일에 포함
  - Node.js crypto 모듈만 사용 (외부 의존성 없음)
```

기존 SecureStore 인터페이스 변경 없이 내부 fallback 체인만 교체.

**LOC**: ~80줄 추가 (fileFallback.ts 신규 파일)
**테스트**: `__tests__/fileFallback.test.ts` ~60줄

---

### Gap 2 — 첫 실행 온보딩 배너 (P1)

#### 2-A. 온보딩 배너 컴포넌트

**파일**: `src/renderer/components/onboarding/FirstRunBanner.tsx` (신규)
**파일**: `src/renderer/components/onboarding/FirstRunBanner.css` (신규)

조건: 인증된 Provider가 0개일 때 메인 화면 상단에 표시.
내용: "AI 연결을 설정하세요" + 설정 페이지 바로가기 버튼.
닫기: "다음에 하기" 클릭 시 숨김 (세션 단위, localStorage).

판단 로직: `window.assistantDesktop.getAuthStatus()` 호출 → 모든 provider가 `unauthenticated`이면 표시.

**LOC**: ~60줄 (컴포넌트) + ~30줄 (CSS)

#### 2-B. 대시보드에 배너 통합

**파일**: `src/renderer/pages/Dashboard.tsx` (기존)

Dashboard 최상단에 `<FirstRunBanner />` 조건부 렌더링 추가.

**LOC**: ~10줄 변경

---

### Gap 3 — NSIS 빌드 검증 (P1)

electron-builder NSIS 설정은 이미 `package.json`에 존재합니다.
검증 작업만 필요:

```bash
npm run build        # TypeScript + Vite 빌드
npx electron-builder --win --config  # NSIS 인스톨러 빌드
```

빌드 성공 시 `dist/` 폴더에 `.exe` 인스톨러 생성 확인.
(코드 변경 없음, 빌드 실행 + 검증만)

---

### Gap 4 — 데모 모드 토글 (P2, 선택)

#### 4-A. settingsStore에 demoMode 플래그 추가

**파일**: `src/renderer/stores/settingsStore.ts`

```typescript
interface SettingsState {
  // ... 기존 설정
  demoMode: boolean
  setDemoMode: (v: boolean) => void
}
```

**LOC**: ~5줄 추가

#### 4-B. seedData 조건부 실행

**파일**: `src/main/bootstrap/seedData.ts`

현재: `seedDemoData(repos)` 무조건 실행
변경: config 또는 IPC를 통해 demoMode 확인 후 조건부 실행

```typescript
if (config.demoMode) {
  seedDemoData(repos);
}
```

**LOC**: ~5줄 변경

#### 4-C. 설정 UI에 토글 추가

**파일**: `src/renderer/pages/settings/SettingsGeneralSection.tsx` (기존)

"데모 데이터 포함" 토글 스위치 추가.

**LOC**: ~15줄 추가

---

### Gap 5 — 이메일 입력 Fallback (P2, 선택)

#### 5-A. 수동 이메일 입력 컴포넌트

**파일**: `src/renderer/components/email/ManualEmailInput.tsx` (신규)
**파일**: `src/renderer/components/email/ManualEmailInput.css` (신규)

기능:
- 텍스트 영역에 이메일 본문 직접 붙여넣기
- .eml 파일 드래그 앤 드롭
- 기존 이메일 파서 재사용

이 기능은 SAP Transport 이메일을 Outlook 연동 없이도 처리할 수 있게 해줍니다.
초기 사용자의 "일단 써보기" 진입 장벽을 크게 낮춥니다.

**LOC**: ~100줄 (컴포넌트) + ~30줄 (CSS)

---

## 우선순위 및 구현 순서

```
P0 (필수 — 보안)         P1 (필수 — 사용성)       P2 (선택 — 편의)
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ 1-A Logger       │    │ 2-A/B 온보딩 배너 │    │ 4-A/B/C 데모 토글│
│ 1-B BrowserWindow│───▶│ 3   NSIS 빌드    │───▶│ 5-A 이메일 입력  │
│ 1-C AES fallback │    │     검증          │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

- **P0**: ~100줄 변경 + 60줄 테스트 (3개 파일 수정, 1개 신규)
- **P1**: ~100줄 신규 + 10줄 변경 (2개 신규, 1개 수정)
- **P2**: ~155줄 신규 + 10줄 변경 (2개 신규, 2개 수정)
- **총계**: ~435 LOC across 10-11개 파일

---

## 재사용하는 기존 코드

| 기존 코드 | 위치 | 재사용 방식 |
|-----------|------|------------|
| SecureStore 클래스 | `src/main/auth/secureStore.ts` | 내부 fallback 체인 확장 |
| pino 로거 | `src/main/logger.ts` | redact 설정 추가 |
| SettingsAiSection | `src/renderer/components/settings/` | 그대로 사용 (변경 없음) |
| electron-builder 설정 | `package.json` | 그대로 사용 (변경 없음) |
| IPC auth 핸들러 | `src/main/ipc/authHandlers.ts` | 그대로 사용 |
| settingsStore | `src/renderer/stores/settingsStore.ts` | demoMode 플래그만 추가 |

---

## 검증 방법

1. **타입 체크**: `npm run typecheck` — 전체 통과 확인
2. **기존 테스트**: `npm run test:run` — 기존 68개 auth 테스트 통과 확인
3. **신규 테스트**: `fileFallback.test.ts` 실행
4. **보안 확인**: 로그에 API 키 미노출 수동 확인
5. **NSIS 빌드**: `npx electron-builder --win` → `.exe` 생성 확인
6. **온보딩 플로우**: 앱 실행 → 인증 없는 상태에서 배너 표시 확인

---

## NOT in scope

- OAuth 플로우 변경 (이미 완전 구현)
- API 키 입력 UI 변경 (SettingsAiSection 869줄 그대로)
- Transport Review 워크플로우 자체 (별도 Phase)
- auto-updater 설정 (이미 구현, 서명 인증서 별도 필요)
- CI/CD 파이프라인 (GitHub Actions 별도 설정)

---

# Phase 2: CodeLab GitHub 연동 — 운영 지원 AI 지식 기반

## Context

**타겟 고객**: MES, QMS, PMS, SAP ERP 등 제조기업 시스템 **실제 end user** (현업 운영자)

**핵심 용도**: 시스템 코드베이스를 AI 컨텍스트로 제공하여 end user의 에러 자가 진단 지원
- 예: SAP 엑셀 업로드 에러 → AI가 코드 분석 → "엑셀 컬럼 형식 불일치" 진단
- 예: 구매 메일 수신 → AI 분석 → 어떤 송장 처리해야 하는지 안내

**설정 주체**: IT 관리자가 repo URL + PAT 초기 설정, end user는 채팅으로 질문만

## 아키텍처 결정 사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 인증 | PAT + URL Clone 먼저, OAuth 나중 | GitHub OAuth App 등록 불필요 |
| Git 의존성 | GitHub REST API (git CLI 불필요) | end user PC에 git 미설치 |
| Provider 구조 | 독립 파일 `githubProvider.ts` | localFolderLibrary/mcpConnector 패턴 일관성 |
| GitLab | 미구현 (추후 추가) | GitHub만 먼저 |

## 데이터 플로우

```
IT 관리자 설정                  AI 진단 흐름
┌──────────────┐    ┌──────────────────────────────────────┐
│ Settings UI  │    │ GitHubSourceProvider                  │
│ ├─ Repo URL  │───▶│  ├─ fetchRepoTree() ← REST API       │
│ └─ PAT 입력  │    │  ├─ downloadFiles() ← raw content    │
└──────────────┘    │  └─ upsertDocuments() → SQLite        │
                    └──────────────┬───────────────────────┘
                                   │
┌──────────────┐    ┌──────────────▼───────────────────────┐
│ End User     │    │ source_documents (code as context)    │
│ "엑셀 업로드 │───▶│  └─ CodeAnalyzer + Chat AI            │
│  에러 났어요"│    │     → "엑셀 형식이 안 맞는 것 같아요"  │
└──────────────┘    └──────────────────────────────────────┘
```

## 구현 계획

### 2-A. GitHubSourceProvider (Main Process)

**파일**: `src/main/sources/githubProvider.ts` (신규, ~150줄)

```typescript
export class GitHubSourceProvider {
  constructor(
    private configuredSourceRepo: ConfiguredSourceRepository,
    private sourceDocumentRepo: SourceDocumentRepository,
  ) {}

  // PAT를 SecureStore에 저장 (provider: "github-codelab")
  async savePat(pat: string): Promise<void>

  // repo URL 파싱 → owner/repo 추출
  parseRepoUrl(url: string): { owner: string; repo: string }

  // GitHub REST API로 repo 연결 + 파일 인덱싱
  async connectRepo(input: {
    repoUrl: string;
    pat?: string;  // 비공개 repo용
    branch?: string;  // 기본: default branch
  }): Promise<{ source: ConfiguredSource; summary: SourceIndexSummary }>

  // 파일 동기화 (변경 감지)
  async syncRepo(sourceId: string): Promise<SourceIndexSummary>
}
```

**API 호출**:
- `GET /repos/{owner}/{repo}` — repo 메타데이터 (default branch 확인)
- `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` — 전체 파일 트리
- `GET /repos/{owner}/{repo}/contents/{path}` — 개별 파일 content

**LOC**: ~150줄

### 2-B. ConfiguredSourceRepository 확장

**파일**: `src/main/storage/configuredSourceRepo.ts` (기존)

```typescript
createApiSource(input: {
  title: string;
  connectionMeta: {
    provider: "github";
    repoUrl: string;
    owner: string;
    repo: string;
    branch: string;
  };
  classificationDefault?: string;
  includeGlobs?: string[];
}): ConfiguredSource
```

**LOC**: ~20줄 추가

### 2-C. SourceManager 라우팅 추가

**파일**: `src/main/sources/sourceManager.ts` (기존)

reindexSource() switch문에 api 케이스 추가:
```typescript
case "api":
  return this.githubProvider.syncRepo(sourceId);
```

**LOC**: ~5줄 추가

### 2-D. IPC 핸들러 + Preload Bridge

**파일**: `src/main/ipc/sourceHandlers.ts` + `src/main/ipc/channels.ts` + `src/preload/index.ts`

새 IPC 채널:
- `GITHUB_CONNECT` — repo 연결 (URL + PAT)
- `GITHUB_SYNC` — 수동 동기화
- `GITHUB_SAVE_PAT` — PAT 저장

**LOC**: ~30줄 (핸들러) + ~10줄 (channels) + ~10줄 (preload)

### 2-E. 설정 UI — Repo 연결 화면

**파일**: `src/renderer/pages/settings/SettingsCodeLabSection.tsx` (신규, ~120줄)
**파일**: `src/renderer/pages/settings/SettingsCodeLabSection.css` (신규, ~60줄)

설정 페이지 내 "CodeLab" 섹션:
- Repo URL 입력 필드
- PAT 입력 필드 (선택, 비공개 repo용)
- "연결" 버튼 → 진행률 표시 → 완료
- 연결된 repo 목록 + 동기화/삭제 버튼

**LOC**: ~120줄 (컴포넌트) + ~60줄 (CSS)

### 2-F. 테스트

**파일**: `src/main/sources/__tests__/githubProvider.test.ts` (신규, ~100줄)

12개 테스트 케이스 (위 Test Review 참조)

**LOC**: ~100줄

## 총 LOC 추정

| 파일 | 유형 | LOC |
|------|------|-----|
| githubProvider.ts | 신규 | ~150 |
| configuredSourceRepo.ts | 수정 | ~20 |
| sourceManager.ts | 수정 | ~5 |
| IPC (handlers + channels + preload) | 수정 | ~50 |
| SettingsCodeLabSection.tsx + css | 신규 | ~180 |
| githubProvider.test.ts | 신규 | ~100 |
| **총계** | | **~505 LOC** |

## 재사용 기존 코드

| 기존 코드 | 재사용 방식 |
|-----------|------------|
| `ConfiguredSourceKind = "api"` | 이미 타입 정의됨, 구현만 추가 |
| `SourceDocumentRepository` | upsert/search 그대로 사용 |
| `SecureStore` | PAT 암호화 저장 |
| `CodeAnalyzer` | 인덱싱된 코드 분석 그대로 |
| `localFolderLibrary.ts` 패턴 | 동일한 sync/reindex 패턴 적용 |

## NOT in scope (Phase 2)

- GitLab 지원 (추후 별도 Phase)
- GitHub OAuth Device Code (PAT로 충분, 나중에 추가)
- PR/MR 댓글 피드백 (end user에게 불필요)
- 실시간 webhook 동기화 (수동 동기화로 충분)
- 브랜치 선택 UI (기본 브랜치만)

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 2 | CLEAR | 3 issues, 1 critical gap |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

- **UNRESOLVED:** 0
- **VERDICT:** ENG CLEARED — ready to implement
