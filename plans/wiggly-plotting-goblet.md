# Email 메뉴 재배치 + Outlook Graph API 연동 + 서브메뉴 추가

## Context

현재 이메일 시스템은 Gmail MCP 전용이며, Sidebar에서 4번째 위치(Cockpit → Assistant → Knowledge → **Email**)에 서브메뉴 없이 배치되어 있다. 사용자가 요청한 변경:

1. **이메일 메뉴를 Cockpit 바로 아래(2번째)로 이동**
2. **서브메뉴 추가**: 받은편지함, 분석 완료, 설정
3. **Outlook Graph API 직접 연동** — EmailProvider 추상화 + Microsoft OAuth2

---

## Phase 1: EmailProvider 추상화 + Gmail 분리

### 1-1. EmailProvider 인터페이스 신규

**파일**: `src/main/email/providers/emailProvider.ts` (신규)

```typescript
export type EmailProviderType = 'gmail' | 'outlook'

export interface EmailMessage {
  providerMessageId: string
  fromEmail: string
  fromName?: string
  subject: string
  bodyText: string
  receivedAt: string
  labels: string[]
}

export interface EmailProvider {
  readonly type: EmailProviderType
  sync(maxResults?: number): Promise<EmailMessage[]>
  isConnected(): boolean
}
```

### 1-2. GmailMcpProvider 신규

**파일**: `src/main/email/providers/gmailMcpProvider.ts` (신규)

- 기존 `EmailManager`의 Gmail MCP 로직(L30-88, L170-232)을 이 클래스로 이동
- `McpConnector` 의존성 주입
- `sync()` → `callMcpTool("gmail_search_messages")` + `callMcpTool("gmail_read_message")`
- `isConnected()` → MCP 서버 목록에서 "gmail" 포함 확인
- `parseGmailSearchResult()`, `parseGmailReadResult()` 헬퍼 포함

### 1-3. providers/index.ts 배럴 export

**파일**: `src/main/email/providers/index.ts` (신규)

### 1-4. EmailManager 리팩토링

**파일**: `src/main/email/emailManager.ts` (수정)

변경 사항:
- `mcpConnector` 제거, `providers: EmailProvider[]` 추가
- `syncInbox(sourceId?)` → 모든 연결된 provider에서 sync → DB 저장
- `callMcpTool`, `parseGmailSearchResult`, `parseGmailReadResult` 삭제 (GmailMcpProvider로 이동)
- `GmailMessageDetail` 인터페이스 삭제 (EmailMessage로 통합)
- 분석/링크 로직은 그대로 유지 (provider-agnostic)
- `listInbox()` 에 provider 필터 옵션 추가: `{ provider?: EmailProviderType }`

### 1-5. DB 마이그레이션 — provider 컬럼 추가

**파일**: `src/main/storage/migrations/009_email_provider.ts` (신규)

```sql
ALTER TABLE email_inbox ADD COLUMN provider TEXT NOT NULL DEFAULT 'gmail';
CREATE INDEX idx_email_inbox_provider ON email_inbox(provider, received_at DESC);
```

### 1-6. emailRepository 타입/쿼리 업데이트

**파일**: `src/main/storage/repositories/emailRepository.ts` (수정)

- `EmailInbox` 인터페이스에 `provider: EmailProviderType` 추가
- `EmailInboxInput`에 `provider: EmailProviderType` 추가
- `EmailInboxRow`에 `provider: string` 추가
- `toEmailInbox()`에서 `provider` 매핑
- `create()` INSERT에 `provider` 컬럼 추가
- `list()` WHERE에 `provider` 필터 옵션 추가
- SELECT 쿼리에 `provider` 컬럼 추가

---

## Phase 2: Outlook OAuth + Graph API

### 2-1. AppConfig에 Microsoft OAuth Client ID 추가

**파일**: `src/main/config.ts` (수정)

```typescript
// AppConfig 인터페이스에:
oauthMicrosoftClientId: string

// loadConfig()에:
oauthMicrosoftClientId: process.env.OAUTH_MICROSOFT_CLIENT_ID ?? ""
```

### 2-2. ProviderType에 microsoft 추가

**파일**: `src/main/types/provider.ts` (수정)

- `ProviderType` union에 `"microsoft"` 추가
- `PROVIDER_LABELS`에 `microsoft: "Microsoft"` 추가
- `PROVIDER_MODELS`에 `microsoft: []` (LLM provider 아님)
- `DEFAULT_MODELS`에 `microsoft: ""` 추가

### 2-3. OAuthProviders에 Microsoft 설정 추가

**파일**: `src/main/auth/oauthProviders.ts` (수정)

```typescript
case "microsoft": {
  const clientId = config.oauthMicrosoftClientId
  if (!clientId) return null
  return {
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientId,
    scopes: ["openid", "profile", "email", "offline_access", "Mail.Read"],
    tokenContentType: "form",
    useCallbackServer: true,
  }
}
```

### 2-4. OutlookGraphProvider 신규

**파일**: `src/main/email/providers/outlookGraphProvider.ts` (신규)

- `SecureStore`에서 `microsoft` 토큰 로드
- `sync()` → `GET https://graph.microsoft.com/v1.0/me/messages?$top=20&$orderby=receivedDateTime desc&$select=id,subject,from,body,receivedDateTime`
- Authorization: `Bearer {accessToken}`
- 토큰 만료 시 → `SecureStore`에서 `refreshToken` 가져와 갱신
- `isConnected()` → SecureStore에 microsoft 토큰 존재 확인
- Graph API 응답 → `EmailMessage[]` 변환

### 2-5. IPC 채널 추가

**파일**: `src/main/ipc/channels.ts` (수정)

```typescript
EMAIL_LIST_PROVIDERS: 'email:listProviders',
EMAIL_SYNC_PROVIDER: 'email:syncProvider',
```

### 2-6. emailHandlers 업데이트

**파일**: `src/main/ipc/emailHandlers.ts` (수정)

- `email:listProviders` → 연결된 provider 목록 + 상태 반환
- `email:syncProvider` → 특정 provider만 sync
- 기존 `email:syncInbox` → 모든 연결된 provider sync (호환 유지)

### 2-7. Preload API 확장

**파일**: `src/preload/index.ts` (수정)

```typescript
emailListProviders(): Promise<Array<{ type: string; connected: boolean; accountHint?: string }>>
emailSyncProvider(provider: string): Promise<{ added: number; skipped: number }>
```

### 2-8. global.d.ts Preload 타입 추가

**파일**: `src/renderer/global.d.ts` (수정)

- DesktopApi에 `emailListProviders`, `emailSyncProvider` 추가

### 2-9. IpcContext + 부트스트랩 수정

**파일**: `src/main/ipc/types.ts` + `src/main/index.ts` (수정)

- EmailManager 생성자 변경 → provider 배열 전달
- `GmailMcpProvider(mcpConnector)`, `OutlookGraphProvider(secureStore, config)` 생성

---

## Phase 3: Sidebar 재배치 + 서브메뉴 + 라우팅

### 3-1. Sidebar 메뉴 순서 + 서브메뉴

**파일**: `src/renderer/components/Sidebar.tsx` (수정)

MAIN_NAV_ITEMS 순서: `Cockpit → Email → Assistant → Knowledge → Code Analysis`

Email 항목에 children 추가:
```typescript
{
  id: 'email',
  section: 'email',
  label: 'Email',
  Icon: Mail,
  position: 'main',
  defaultSubPage: 'inbox',
  children: [
    { id: 'email-inbox', subPage: 'inbox', label: '받은편지함', Icon: Inbox },
    { id: 'email-analyzed', subPage: 'analyzed', label: '분석 완료', Icon: CheckCircle },
    { id: 'email-settings', subPage: 'settings', label: '설정', Icon: Settings },
  ],
}
```

lucide import에 `Inbox`, `CheckCircle` 추가

### 3-2. appShellStore에 EmailSubPage 타입

**파일**: `src/renderer/stores/appShellStore.ts` (수정)

```typescript
export type EmailSubPage = 'inbox' | 'analyzed' | 'settings'
```

### 3-3. EmailPage 라우터 신규

**파일**: `src/renderer/pages/email/EmailPage.tsx` (신규)

subPage에 따라 분기: `inbox` → EmailInboxPage, `analyzed` → EmailAnalyzedPage, `settings` → EmailSettingsPage

### 3-4. App.tsx import 변경

**파일**: `src/renderer/App.tsx` (수정)

`EmailInboxPage` → `EmailPage` import + 렌더

---

## Phase 4: Email UI 신규 페이지

### 4-1. EmailAnalyzedPage 신규

**파일**: `src/renderer/pages/email/EmailAnalyzedPage.tsx` (신규)

- `isProcessed === true` 메일만 표시
- 연결된 Plan 링크 표시
- EmailInboxPage와 유사한 카드 레이아웃

### 4-2. EmailSettingsPage 신규

**파일**: `src/renderer/pages/email/EmailSettingsPage.tsx` (신규)

- `emailListProviders()` → provider 목록
- Gmail: MCP 연결 상태 표시
- Outlook: OAuth 연결/해제 버튼
- 계정 힌트(이메일) 표시

### 4-3. EmailInboxPage 업데이트

**파일**: `src/renderer/pages/email/EmailInboxPage.tsx` (수정)

- 제목 → "받은편지함"
- provider 배지 표시 (Gmail/Outlook)
- 빈 상태 → "설정에서 Gmail 또는 Outlook을 연결하세요"
- 동기화 → 모든 provider sync

---

## 수정 파일 요약

| # | 파일 | 작업 | Phase |
|---|------|------|-------|
| 1 | `src/main/email/providers/emailProvider.ts` | 신규 — 인터페이스 | 1 |
| 2 | `src/main/email/providers/gmailMcpProvider.ts` | 신규 — Gmail 구현 | 1 |
| 3 | `src/main/email/providers/index.ts` | 신규 — 배럴 | 1 |
| 4 | `src/main/email/emailManager.ts` | 리팩토링 | 1 |
| 5 | `src/main/storage/migrations/009_email_provider.ts` | 신규 — 마이그레이션 | 1 |
| 6 | `src/main/storage/repositories/emailRepository.ts` | provider 컬럼 추가 | 1 |
| 7 | `src/main/config.ts` | MS clientId 추가 | 2 |
| 8 | `src/main/types/provider.ts` | microsoft 추가 | 2 |
| 9 | `src/main/auth/oauthProviders.ts` | microsoft OAuth 설정 | 2 |
| 10 | `src/main/email/providers/outlookGraphProvider.ts` | 신규 — Outlook 구현 | 2 |
| 11 | `src/main/ipc/channels.ts` | email 채널 추가 | 2 |
| 12 | `src/main/ipc/emailHandlers.ts` | provider 핸들러 추가 | 2 |
| 13 | `src/preload/index.ts` | API 확장 | 2 |
| 14 | `src/renderer/global.d.ts` | Preload 타입 추가 | 2 |
| 15 | `src/main/ipc/types.ts` | IpcContext 업데이트 | 2 |
| 16 | `src/main/index.ts` (또는 bootstrap) | provider 인스턴스 생성 | 2 |
| 17 | `src/renderer/components/Sidebar.tsx` | 메뉴 이동 + 서브메뉴 | 3 |
| 18 | `src/renderer/stores/appShellStore.ts` | EmailSubPage 타입 | 3 |
| 19 | `src/renderer/pages/email/EmailPage.tsx` | 신규 — 라우터 | 3 |
| 20 | `src/renderer/App.tsx` | EmailPage import 변경 | 3 |
| 21 | `src/renderer/pages/email/EmailAnalyzedPage.tsx` | 신규 | 4 |
| 22 | `src/renderer/pages/email/EmailSettingsPage.tsx` | 신규 | 4 |
| 23 | `src/renderer/pages/email/EmailInboxPage.tsx` | provider 배지 등 | 4 |

**총 ~23개 파일** (신규 9개, 수정 14개)

---

## 실행 순서

```
Phase 1 (순차):
  1-5. DB 마이그레이션 (009)
  1-6. emailRepository provider 컬럼
  1-1. EmailProvider 인터페이스
  1-2. GmailMcpProvider
  1-3. providers barrel
  1-4. EmailManager 리팩토링
  → 중간 검증: npm run typecheck

Phase 2 (Phase 1 이후):
  2-1. config.ts Microsoft clientId
  2-2. ProviderType microsoft
  2-3. oauthProviders microsoft
  2-4. OutlookGraphProvider
  2-5~6. IPC 채널 + 핸들러
  2-7~9. Preload + global.d.ts + context + bootstrap
  → 중간 검증: npm run typecheck

Phase 3 (Phase 1 이후, Phase 2와 병렬 가능):
  3-1. Sidebar 재배치 + 서브메뉴
  3-2. appShellStore EmailSubPage
  3-3. EmailPage 라우터
  3-4. App.tsx import 변경

Phase 4 (Phase 2+3 이후):
  4-1. EmailAnalyzedPage
  4-2. EmailSettingsPage
  4-3. EmailInboxPage 업데이트

최종 검증:
  npm run typecheck && npm run lint && npm run test:run
```

---

## 검증

```bash
npm run typecheck   # 모든 tsconfig 통과
npm run lint        # ESLint 통과
npm run test:run    # 기존 테스트 깨짐 없음
```

수동 검증:
1. Sidebar → Email이 Cockpit 아래, 서브메뉴 3개 표시
2. 받은편지함 → Gmail 메일 동기화 동작 (기존과 동일)
3. Outlook 설정 → OAuth 연결 → 동기화 → 인박스에 Outlook 메일 표시
4. 분석 완료 → 처리된 메일만 필터
5. 이메일 카드에 Gmail/Outlook 배지 표시
