# SAP Ops Bot Desktop

Electron 31 기반 Desktop 클라이언트입니다. React 18 + Zustand 5로 구축된 Renderer UI에서 채팅, CBO 소스 분석, 설정 관리를 제공합니다.

## 핵심 목적

- API Key 기반 인증 (Codex/Copilot) + keytar SecureStore
- 세션/메시지 로컬 저장 (SQLite)
- 세션별 Provider/Model 선택
- CBO 소스(`.txt`, `.md`) 정적 분석 + 선택적 LLM 보강
- 채팅 UI, CBO 분석 UI, 설정 UI 제공

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

## 아키텍처 개요

```
┌─────────────────────────────────────────┐
│ Renderer (React 18 + Zustand 5)         │
│  ChatPage │ CboPage │ SettingsPage      │
│           │         │                   │
│  stores: chatStore, cboStore,           │
│          settingsStore                  │
└────────────────┬────────────────────────┘
                 │ contextBridge (IPC)
┌────────────────▼────────────────────────┐
│ Preload (15 IPC channels)              │
│  window.sapOpsDesktop                   │
└────────────────┬────────────────────────┘
                 │ ipcRenderer.invoke
┌────────────────▼────────────────────────┐
│ Main Process                            │
│  ├── chatRuntime.ts    (세션/메시지)     │
│  ├── auth/             (OAuth + keytar) │
│  ├── cbo/              (분석 엔진)      │
│  ├── providers/        (Codex/Copilot)  │
│  └── storage/          (SQLite)         │
└─────────────────────────────────────────┘
```

---

## 채팅 UI

<!-- TODO: 스크린샷 추가 -->

- **세션 관리**: 좌측 `SessionList`에서 세션 목록 조회, 새 채팅 생성, 세션 전환
- **메시지 타임라인**: `MessageList`에서 user/assistant 메시지 표시, 자동 스크롤
- **Composer**: Provider(Codex/Copilot) + Model 드롭다운 선택 → 메시지 입력 → 전송
- **스트리밍 응답**: StreamEvent 기반 실시간 응답, `SkeletonMessage` 로딩 표시
- **메타데이터**: sources, skill_used, suggested_tcodes 표시
- **마크다운 렌더링**: react-markdown + remark-gfm + rehype-highlight + rehype-sanitize
- **키보드**: Enter로 전송, Shift+Enter로 줄바꿈
- **피드백**: 메시지별 good/bad 피드백 버튼

---

## CBO 분석 UI

<!-- TODO: 스크린샷 추가 -->

3탭 구조: **텍스트 분석** | **파일·폴더 분석** | **실행 이력**

### 텍스트 분석
- 파일명 + 소스 텍스트 직접 입력 → `텍스트 분석` 버튼
- 결과: `ResultPanel`에서 summary, risks 테이블, recommendations 카드 표시

### 파일·폴더 분석
- `파일 선택 후 분석`: OS 파일 다이얼로그 → 단일 파일 분석
- `폴더 배치 분석`: OS 폴더 다이얼로그 → 재귀 스캔 + 해시 중복 건너뛰기

### 실행 이력
- `RunsTable`: 과거 분석 실행 목록 (ID, 모드, 파일 수, 시간)
- Run 상세 조회: 파일별 리스크/권고 상세
- Run 지식 동기화: Backend `/knowledge/bulk`로 결과 동기화
- Run 리스크 비교: `DiffPanel`에서 두 Run 간 신규/해소/지속 리스크 diff

### LLM 보강
- `LlmOptions`에서 토글 ON → Provider/Model 선택
- 규칙 분석 결과를 LLM 관점으로 추가 보강

### 분석 규칙 (5개)
| 규칙 | 위험도 | 설명 |
|------|:------:|------|
| `EXEC SQL` 사용 | High | Native SQL은 DB 종속성 및 인젝션 위험 |
| `SELECT *` 사용 | Medium | 불필요한 컬럼 조회로 성능 저하 |
| `MESSAGE TYPE 'X'` | Medium | 프로그램 강제 종료, 예외 처리 권장 |
| LOOP 내 `COMMIT WORK` | High | 데이터 불일치 및 Lock 문제 가능성 |
| `AUTHORITY-CHECK` 부재 | High | 데이터 변경 시 권한 검증 누락 |

### 제한사항
- 지원 파일: `.txt`, `.md`
- 최대 파일 크기: 1MB
- UTF-8 텍스트만 허용 (바이너리 파일 차단)
- 동기화 엔드포인트: `SAP_OPS_BACKEND_API_BASE_URL` (기본값 `http://127.0.0.1:8000/api/v1`)

---

## 설정 UI (Craft-style)

<!-- TODO: 스크린샷 추가 -->

### 테마
- **system** / **light** / **dark** 3선택
- `data-theme` 속성으로 CSS 커스텀 속성 전환
- localStorage 영속화

### Default 섹션
- 기본 Provider + Model 드롭다운
- 인증된 Provider만 선택 가능

### Connections 섹션
- Provider별 인증 상태 Badge (success: 연결됨 / error: 미연결)
- `...` 액션 메뉴 (로그아웃)
- API Key 인라인 입력 → keytar SecureStore 저장

---

## 컴포넌트 구조

```
renderer/
├── App.tsx                        # QueryClientProvider + 3페이지 라우팅
├── main.tsx                       # ReactDOM 엔트리포인트
├── global.d.ts                    # window.sapOpsDesktop 타입 선언
│
├── pages/
│   ├── ChatPage.tsx + .css
│   ├── CboPage.tsx + .css
│   └── SettingsPage.tsx + .css
│
├── components/
│   ├── Sidebar.tsx + .css         # 접이식 내비게이션
│   ├── MarkdownRenderer.tsx + .css
│   ├── chat/
│   │   ├── Composer.tsx           # 입력 + Provider/Model 선택
│   │   ├── MessageList.tsx        # 메시지 목록 + 피드백
│   │   └── SessionList.tsx        # 세션 목록 + 새 채팅
│   ├── cbo/
│   │   ├── LlmOptions.tsx         # LLM 보강 토글
│   │   ├── ResultPanel.tsx        # 분석 결과 표시
│   │   ├── DiffPanel.tsx          # 리스크 diff 비교
│   │   └── RunsTable.tsx          # 실행 이력 테이블
│   └── ui/
│       ├── Badge.tsx + .css       # success/error/warning/info/neutral
│       ├── Button.tsx + .css      # primary/secondary/danger/ghost
│       ├── Skeleton.tsx + .css    # 로딩 플레이스홀더
│       └── Tooltip.tsx + .css     # 툴팁
│
├── stores/
│   ├── chatStore.ts               # 채팅 상태 (Zustand)
│   ├── cboStore.ts                # CBO 분석 상태 (Zustand)
│   └── settingsStore.ts           # 설정 상태 (Zustand + localStorage)
│
└── styles/
    ├── global.css                 # 기본 스타일
    ├── variables.css              # CSS 커스텀 속성
    └── animations.css             # 페이지 전환 애니메이션
```

---

## IPC 채널 (15개)

| # | Channel | 설명 |
|---|---------|------|
| 1 | `auth:setApiKey` | API Key를 SecureStore에 저장 |
| 2 | `auth:status` | 인증 상태 조회 |
| 3 | `auth:logout` | 로그아웃/자격증명 삭제 |
| 4 | `chat:send` | 메시지 전송 (스트리밍 응답) |
| 5 | `sessions:list` | 세션 목록 조회 |
| 6 | `sessions:messages` | 세션 메시지 조회 |
| 7 | `cbo:analyzeText` | 텍스트 직접 분석 |
| 8 | `cbo:analyzeFile` | 단일 파일 분석 |
| 9 | `cbo:analyzeFolder` | 폴더 배치 분석 |
| 10 | `cbo:pickAndAnalyzeFile` | 파일 선택 다이얼로그 + 분석 |
| 11 | `cbo:pickAndAnalyzeFolder` | 폴더 선택 다이얼로그 + 배치 |
| 12 | `cbo:runs:list` | 분석 실행 이력 조회 |
| 13 | `cbo:runs:detail` | Run 상세 (파일별 결과) |
| 14 | `cbo:runs:syncKnowledge` | Knowledge API로 동기화 |
| 15 | `cbo:runs:diff` | 두 Run 간 리스크 diff |

---

## 향후 작업 (Phase 2.5)

- [ ] OAuth 실서비스 엔드포인트 검증
- [ ] 리프레시 토큰 처리
- [ ] Electron 패키징 (electron-builder)
- [ ] 코드서명 (Windows Authenticode)
- [ ] 자동 업데이트 (electron-updater)
