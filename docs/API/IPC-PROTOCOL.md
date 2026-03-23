# IPC Protocol — 채널 레퍼런스

## 개요

모든 Renderer ↔ Main 통신은 Preload의 `contextBridge`를 통해 `window.assistantDesktop` API로 노출됩니다. 내부적으로 `ipcRenderer.invoke` → `ipcMain.handle` 패턴을 사용합니다.

**v7.1.0 기준**: 167+ 채널, 108 preload 메서드, 13개 핸들러 파일

---

## 채널 목록

### Auth (`auth:*`) — 11 채널
| 채널 | 설명 |
|------|------|
| `auth:setApiKey` | API 키 설정 |
| `auth:status` | 인증 상태 조회 |
| `auth:logout` | 로그아웃 |
| `auth:oauthAvailability` | OAuth 가용성 확인 |
| `auth:initiateOAuth` | OAuth 시작 (PKCE 포함) |
| `auth:waitOAuthCallback` | OAuth 콜백 대기 |
| `auth:cancelOAuth` | OAuth 취소 |
| `auth:submitOAuthCode` | OAuth 코드 제출 (수동 입력) |
| `auth:initiateDeviceCode` | GitHub Device Code 시작 |
| `auth:pollDeviceCode` | Device Code 폴링 |
| `auth:cancelDeviceCode` | Device Code 취소 |

### Chat (`chat:*`) — 8 채널
| 채널 | 설명 |
|------|------|
| `chat:send` | 메시지 전송 |
| `chat:stream` | SSE 스트리밍 시작 |
| `chat:stream:chunk` | 스트리밍 청크 수신 (이벤트) |
| `chat:stream:done` | 스트리밍 완료 (이벤트) |
| `chat:stream:error` | 스트리밍 에러 (이벤트) |
| `chat:setHistoryLimit` | 히스토리 윈도우 설정 |
| `chat:getHistoryLimit` | 히스토리 윈도우 조회 |
| `chat:stop` | 생성 중단 |

### Skills (`skills:*`) — 7 채널
| 채널 | 설명 |
|------|------|
| `skills:list` | 스킬 목록 (프리셋 + 커스텀) |
| `skills:listPacks` | 스킬 팩 목록 |
| `skills:recommend` | 컨텍스트 기반 스킬 추천 |
| `skills:listCustom` | 커스텀 스킬 목록 |
| `skills:saveCustom` | 커스텀 스킬 저장 |
| `skills:deleteCustom` | 커스텀 스킬 삭제 |
| `skills:openFolder` | 스킬 폴더 열기 |

### Sources (`sources:*`) — 7 채널
| 채널 | 설명 |
|------|------|
| `sources:list` | 소스 목록 |
| `sources:search` | 소스 검색 |
| `sources:listConfigured` | 설정된 소스 목록 |
| `sources:pickAndAddLocalFolder` | 로컬 폴더 추가 |
| `sources:reindex` | 소스 재인덱싱 |
| `sources:searchDocuments` | 문서 검색 |
| `sources:getDocument` | 문서 상세 조회 |

### Agents (`agents:*`) — 14 채널
| 채널 | 설명 |
|------|------|
| `agents:list` | 에이전트 목록 (프리셋 + 커스텀) |
| `agents:get` | 에이전트 상세 |
| `agents:execute` | 에이전트 실행 |
| `agents:execution:status` | 실행 상태 조회 |
| `agents:executions:list` | 실행 이력 목록 |
| `agents:execution:cancel` | 실행 취소 |
| `agents:execute:interactive` | 인터랙티브 실행 |
| `agents:execution:progress` | 실행 진행 (이벤트) |
| `agents:step:started` | 스텝 시작 (이벤트) |
| `agents:step:completed` | 스텝 완료 (이벤트) |
| `agents:execution:done` | 실행 완료 (이벤트) |
| `agents:execution:error` | 실행 에러 (이벤트) |
| `agents:listCustom` | 커스텀 에이전트 목록 |
| `agents:saveCustom` | 커스텀 에이전트 저장 |
| `agents:deleteCustom` | 커스텀 에이전트 삭제 |
| `agents:openFolder` | 에이전트 폴더 열기 |

### CBO (`cbo:*`) — 11 채널
| 채널 | 설명 |
|------|------|
| `cbo:analyzeText` | 텍스트 분석 |
| `cbo:analyzeFile` | 파일 분석 |
| `cbo:analyzeFolder` | 폴더 분석 |
| `cbo:pickAndAnalyzeFile` | 파일 선택 + 분석 |
| `cbo:pickAndAnalyzeFolder` | 폴더 선택 + 분석 |
| `cbo:runs:list` | 분석 이력 |
| `cbo:runs:detail` | 분석 상세 |
| `cbo:runs:syncKnowledge` | Knowledge 동기화 |
| `cbo:runs:diff` | 분석 비교 |
| `cbo:cancelFolder` | 폴더 분석 취소 |
| `cbo:progress` | 진행 이벤트 (on) |

### Email (`email:*`) — 8 채널
| 채널 | 설명 |
|------|------|
| `email:syncInbox` | 이메일 수신함 동기화 |
| `email:listInbox` | 수신함 목록 조회 |
| `email:getDetail` | 이메일 상세 조회 |
| `email:analyzeAndCreatePlan` | AI 분석 → 마감 플랜 생성 |
| `email:listLinkedPlans` | 이메일 연결 플랜 조회 |
| `email:listProviders` | 이메일 프로바이더 목록 |
| `email:syncProvider` | 프로바이더별 동기화 |
| `email:manualImport` | 이메일 수동 임포트 |

### GitHub (`github:*`) — 5 채널
| 채널 | 설명 |
|------|------|
| `github:connect` | GitHub 리포지토리 연결 |
| `github:sync` | 리포지토리 동기화 |
| `github:savePat` | PAT 저장 |
| `github:deletePat` | PAT 삭제 |
| `github:listSources` | 연결된 소스 목록 |

### Code Analysis (`codeAnalysis:*`) — 5 채널
| 채널 | 설명 |
|------|------|
| `codeAnalysis:run` | 소스 전체 분석 실행 |
| `codeAnalysis:runFile` | 파일 단위 분석 |
| `codeAnalysis:runs:list` | 분석 이력 조회 |
| `codeAnalysis:run:detail` | 분석 상세 조회 |
| `codeAnalysis:progress` | 진행률 이벤트 (on) |

### Schedule (`schedule:*`) — 8 채널
| 채널 | 설명 |
|------|------|
| `schedule:list` | 스케줄 작업 목록 |
| `schedule:create` | 스케줄 생성 |
| `schedule:update` | 스케줄 수정 |
| `schedule:delete` | 스케줄 삭제 |
| `schedule:executeNow` | 즉시 실행 |
| `schedule:logs` | 실행 로그 조회 |
| `schedule:logs:recent` | 최근 로그 조회 |
| `schedule:execution:complete` | 실행 완료 이벤트 (on) |

### MCP (`mcp:*`) — 6 채널
| 채널 | 설명 |
|------|------|
| `mcp:connect` | MCP 서버 연결 |
| `mcp:disconnect` | 연결 해제 |
| `mcp:listServers` | 서버 목록 |
| `mcp:listResources` | 리소스 목록 |
| `mcp:addSource` | MCP 소스 추가 |
| `mcp:syncSource` | 소스 동기화 |

### Archive (`archive:*`) — 4 채널
| 채널 | 설명 |
|------|------|
| `archive:pickFolder` | 폴더 선택 |
| `archive:listContents` | 파일 트리 조회 |
| `archive:readFile` | 파일 읽기 |
| `archive:saveFile` | 파일 저장 |

### Sessions (`sessions:*`) — 9 채널
| 채널 | 설명 |
|------|------|
| `sessions:list` | 세션 목록 |
| `sessions:messages` | 세션 메시지 |
| `sessions:listFiltered` | 필터링 목록 |
| `sessions:updateTodoState` | Todo 상태 변경 |
| `sessions:toggleFlag` | 플래그 토글 |
| `sessions:toggleArchive` | 아카이브 토글 |
| `sessions:addLabel` | 레이블 추가 |
| `sessions:removeLabel` | 레이블 제거 |
| `sessions:stats` | 세션 통계 |

### Audit & Vault (`audit:*`, `vault:*`) — 4 채널
| 채널 | 설명 |
|------|------|
| `audit:list` | 감사 로그 목록 |
| `audit:search` | 감사 로그 검색 |
| `vault:list` | 볼트 엔트리 목록 |
| `vault:searchByClassification` | 분류별 볼트 검색 |

### Cockpit (`cockpit:*`) — 13 채널
| 채널 | 설명 |
|------|------|
| `cockpit:plans:list` | 마감 플랜 목록 |
| `cockpit:plans:get` | 플랜 상세 |
| `cockpit:plans:create` | 플랜 생성 |
| `cockpit:plans:update` | 플랜 수정 |
| `cockpit:plans:delete` | 플랜 삭제 |
| `cockpit:plans:listByStatus` | 상태별 플랜 목록 |
| `cockpit:plans:listOverdue` | 기한 초과 플랜 |
| `cockpit:steps:list` | 스텝 목록 |
| `cockpit:steps:create` | 스텝 생성 |
| `cockpit:steps:update` | 스텝 수정 |
| `cockpit:steps:delete` | 스텝 삭제 |
| `cockpit:steps:reorder` | 스텝 순서 변경 |
| `cockpit:stats` | 마감 통계 |

### Routine (`routine:*`) — 13 채널
| 채널 | 설명 |
|------|------|
| `routine:templates:list` | 루틴 템플릿 목록 |
| `routine:templates:listByFrequency` | 빈도별 템플릿 목록 |
| `routine:templates:get` | 템플릿 상세 |
| `routine:templates:create` | 템플릿 생성 |
| `routine:templates:update` | 템플릿 수정 |
| `routine:templates:delete` | 템플릿 삭제 |
| `routine:templates:toggle` | 템플릿 활성/비활성 |
| `routine:knowledge:list` | 지식 연결 목록 |
| `routine:knowledge:link` | 지식 연결 |
| `routine:knowledge:unlink` | 지식 연결 해제 |
| `routine:execute:now` | 즉시 실행 |
| `routine:executions:list` | 실행 이력 |
| `routine:executions:planIds` | 실행 관련 플랜 ID |

---

## 핸들러 파일 매핑

| 핸들러 파일 | 채널 그룹 | 설명 |
|------------|-----------|------|
| `authHandlers.ts` | `auth:*` | OAuth, PKCE, Device Code, API 키 |
| `chatHandlers.ts` | `chat:*` | SSE 스트리밍, 이력 관리 |
| `sourceHandlers.ts` | `sources:*`, `skills:*` | 소스 인덱싱, 스킬 CRUD |
| `cboHandlers.ts` | `cbo:*` | CBO 분석 (텍스트/파일/폴더) |
| `emailHandlers.ts` | `email:*` | 이메일 동기화, AI 분석 |
| `codeAnalysisHandlers.ts` | `codeAnalysis:*` | 코드 분석 실행/조회 |
| `scheduleHandlers.ts` | `schedule:*` | 스케줄 CRUD, 실행 로그 |
| `agentHandlers.ts` | `agents:*` | 에이전트 실행, 인터랙티브 |
| `routineHandlers.ts` | `routine:*` | 루틴 템플릿/실행/지식 |
| `closingHandlers.ts` | `cockpit:*` | 마감 플랜/스텝 CRUD |
| `auditHandlers.ts` | `audit:*`, `vault:*` | 감사 로그, 볼트 |
| `archiveHandlers.ts` | `archive:*` | 아카이브 파일 I/O |

---

## 이벤트 채널 (Main → Renderer)

스트리밍 및 진행률 추적에 사용되는 단방향 이벤트 채널입니다.

| 채널 | 방향 | 용도 |
|------|------|------|
| `chat:stream:chunk` | Main → Renderer | LLM 토큰 스트리밍 |
| `chat:stream:done` | Main → Renderer | 스트리밍 완료 |
| `chat:stream:error` | Main → Renderer | 스트리밍 에러 |
| `cbo:progress` | Main → Renderer | CBO 분석 진행률 |
| `codeAnalysis:progress` | Main → Renderer | 코드 분석 진행률 |
| `agents:step:started` | Main → Renderer | 에이전트 스텝 시작 |
| `agents:step:completed` | Main → Renderer | 에이전트 스텝 완료 |
| `agents:execution:done` | Main → Renderer | 에이전트 실행 완료 |
| `agents:execution:error` | Main → Renderer | 에이전트 실행 에러 |
| `schedule:execution:complete` | Main → Renderer | 스케줄 실행 완료 |

---

## Preload Bridge 요약

`src/preload/index.ts`에서 `window.assistantDesktop`으로 노출되는 **108개 메서드**:

| 도메인 | 메서드 수 | 주요 메서드 |
|--------|----------|------------|
| Auth | 13 | `setApiKey`, `initiateOAuth`, `waitOAuthCallback`, `cancelOAuth` |
| Chat | 10 | `sendMessage`, `streamMessage`, `onStreamChunk`, `stopGeneration` |
| Sessions | 9 | `listSessions`, `getSessionMessages`, `updateSessionTodoState` |
| Skills | 10 | `listSkills`, `listSkillPacks`, `saveCustomSkill` |
| Sources | 7 | `listConfiguredSources`, `reindexSource`, `searchSourceDocuments` |
| CBO | 11 | `analyzeCboText`, `analyzeCboFolder`, `listCboRuns` |
| Email | 9 | `emailSyncInbox`, `emailAnalyzeAndCreatePlan`, `emailManualImport` |
| GitHub | 5 | `githubConnect`, `githubSync`, `githubSavePat`, `githubListSources` |
| Code Analysis | 5 | `codeAnalysisRun`, `codeAnalysisRunFile`, `codeAnalysisRunsList` |
| Schedule | 8 | `listScheduledTasks`, `createScheduledTask`, `executeScheduleNow` |
| MCP | 6 | `mcpConnect`, `mcpAddSource`, `mcpSyncSource` |
| Archive | 4 | `archivePickFolder`, `archiveReadFile`, `archiveSaveFile` |
| Cockpit | 13 | `listPlans`, `createPlan`, `createStep`, `getClosingStats` |
| Routine | 13 | `listRoutineTemplates`, `executeRoutinesNow`, `linkRoutineKnowledge` |
| Agents | 16 | `executeAgent`, `executeAgentInteractive`, `onAgentStepStarted` |
| Audit/Vault | 4 | `listAuditLogs`, `searchAuditLogs`, `listVaultEntries` |
