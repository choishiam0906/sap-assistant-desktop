# SAP Ops Bot Desktop

Electron 기반 클라이언트 런타임입니다.

## 핵심 목적
- 서버 API 키 방식 대신 사용자 OAuth 기반 인증(Codex/Copilot)
- 세션/메시지 로컬 저장(SQLite)
- 세션별 provider/model lock

## 빠른 시작
```bash
cd desktop
cp .env.example .env
npm install
npm run build
npm run start
```

## 현재 포함 범위
- Main process 런타임
- OAuth 상태 머신(`auth:start`, `auth:complete`, `auth:status`, `auth:logout`)
- 채팅 런타임(`chat:send`)
- 세션 조회(`sessions:list`, `sessions:messages`)
- Preload 브리지

## 다음 작업
- Renderer UI(세션 리스트 + 타임라인 + 설정)
- OAuth 실서비스 엔드포인트 검증/리프레시 토큰 처리
- 패키징 및 코드서명
