# Getting Started — Enterprise Knowledge Hub

## 필수 요구사항

- **Node.js** 22.22.1 LTS 권장 (`.nvmrc`, `.node-version` 제공)
- **npm** 10.9.4 이상
- **Windows** 10 이상
- **메모리**: 최소 4GB RAM
- **디스크**: 500MB 이상 여유 공간

---

## 설치

```bash
# 저장소 클론
git clone https://github.com/choishiam0906/sap-assistant-desktop.git
cd sap-assistant-desktop

# 런타임 확인
npm run check:runtime

# 의존성 설치 (Electron 네이티브 모듈 자동 재빌드 포함)
npm install
```

---

## 환경 설정

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일에 LLM API 키를 입력하세요:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

> API 키는 앱 내 **Settings > AI** 에서도 설정할 수 있습니다.

### OAuth 설정 (선택)

OAuth 로그인을 사용하려면 `.env`에 Client ID를 추가하세요:

```env
OAUTH_OPENAI_CLIENT_ID=...
OAUTH_ANTHROPIC_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_MICROSOFT_CLIENT_ID=...
```

> OAuth 미설정 시 API 키 직접 입력 방식으로 사용 가능합니다.

---

## 개발 모드

```bash
# 권장: 렌더러를 먼저 빌드한 뒤 앱 실행
npm run build

# Electron 앱 실행
npm run start
```

> `npm run start`는 Electron과 충돌하는 `NODE_OPTIONS`를 정리한 뒤 앱을 실행합니다.

---

## 빌드 & 배포

```bash
# 전체 빌드
npm run build

# Windows 포터블 실행 파일
npm run dist:portable

# Windows NSIS 설치 프로그램
npm run dist:nsis

# 모든 배포 포맷
npm run dist
```

---

## 검증

```bash
# 런타임 버전 검증
npm run check:runtime

# 전체 검증 (빌드 + 린트 + 테스트)
npm run verify

# 개별 검증
npm run typecheck     # TypeScript 타입 체크
npm run lint          # ESLint
npm run test:run      # Vitest 테스트
```

---

## 초기 설정 (앱 실행 후)

### 1. AI 프로바이더 설정
**Settings > AI** 에서 사용할 LLM 프로바이더의 API 키를 입력하거나 OAuth 로그인합니다.

### 2. CodeLab 연결 (선택)
**Settings > CodeLab** 에서 GitHub 리포지토리를 연결하면 코드를 AI 컨텍스트로 활용할 수 있습니다:
1. Repository URL 입력 (예: `https://github.com/owner/repo`)
2. Personal Access Token 입력 (비공개 리포 시 필수)
3. "연결" 클릭 → 코드 인덱싱 자동 실행

### 3. 이메일 연동 (선택)
Gmail 또는 Outlook을 연결하면 비즈니스 관련 이메일을 AI가 분석합니다:
- Gmail: MCP 브릿지를 통한 연동
- Outlook: Microsoft Graph API 연동
- 수동 임포트: .eml 파일 또는 텍스트 직접 붙여넣기

---

## 프로젝트 구조

핵심 디렉토리 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참조하세요.

---

## 다음 단계

- [사용법 가이드](./USER-GUIDE/USAGE.md)
- [커스텀 에이전트 만들기](./USER-GUIDE/CUSTOM-AGENTS.md)
- [커스텀 스킬 만들기](./USER-GUIDE/CUSTOM-SKILLS.md)
- [도메인 팩 가이드](./USER-GUIDE/DOMAIN-PACKS.md)
- [보안 모드 설명](./USER-GUIDE/SECURITY-MODES.md)
- [IPC 채널 레퍼런스](./API/IPC-PROTOCOL.md)
