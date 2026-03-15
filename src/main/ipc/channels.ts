/**
 * IPC 채널명 상수 — Main ↔ Renderer 간 모든 채널을 중앙 정의.
 * 문자열 리터럴 대신 이 상수를 사용하여 오타 방지 + IDE 자동완성.
 */
export const IPC = {
  // ── Auth ──
  AUTH_SET_API_KEY: 'auth:setApiKey',
  AUTH_STATUS: 'auth:status',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_OAUTH_AVAILABILITY: 'auth:oauthAvailability',
  AUTH_INITIATE_OAUTH: 'auth:initiateOAuth',
  AUTH_WAIT_OAUTH_CALLBACK: 'auth:waitOAuthCallback',
  AUTH_CANCEL_OAUTH: 'auth:cancelOAuth',
  AUTH_SUBMIT_OAUTH_CODE: 'auth:submitOAuthCode',
  AUTH_INITIATE_DEVICE_CODE: 'auth:initiateDeviceCode',
  AUTH_POLL_DEVICE_CODE: 'auth:pollDeviceCode',
  AUTH_CANCEL_DEVICE_CODE: 'auth:cancelDeviceCode',

  // ── Chat ──
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream-message',
  CHAT_STREAM_CHUNK: 'chat:stream-chunk',
  CHAT_STREAM_DONE: 'chat:stream-done',
  CHAT_STREAM_ERROR: 'chat:stream-error',
  CHAT_SET_HISTORY_LIMIT: 'chat:set-history-limit',
  CHAT_GET_HISTORY_LIMIT: 'chat:get-history-limit',
  CHAT_STOP: 'chat:stop',

  // ── Sessions ──
  SESSIONS_LIST: 'sessions:list',
  SESSIONS_MESSAGES: 'sessions:messages',
  SESSIONS_LIST_FILTERED: 'sessions:listFiltered',
  SESSIONS_UPDATE_TODO_STATE: 'sessions:updateTodoState',
  SESSIONS_TOGGLE_FLAG: 'sessions:toggleFlag',
  SESSIONS_TOGGLE_ARCHIVE: 'sessions:toggleArchive',
  SESSIONS_ADD_LABEL: 'sessions:addLabel',
  SESSIONS_REMOVE_LABEL: 'sessions:removeLabel',
  SESSIONS_STATS: 'sessions:stats',

  // ── Skills ──
  SKILLS_LIST: 'skills:list',
  SKILLS_LIST_PACKS: 'skills:listPacks',
  SKILLS_RECOMMEND: 'skills:recommend',
  SKILLS_LIST_CUSTOM: 'skills:listCustom',
  SKILLS_SAVE_CUSTOM: 'skills:saveCustom',
  SKILLS_DELETE_CUSTOM: 'skills:deleteCustom',
  SKILLS_OPEN_FOLDER: 'skills:openFolder',

  // ── Sources ──
  SOURCES_LIST: 'sources:list',
  SOURCES_SEARCH: 'sources:search',
  SOURCES_LIST_CONFIGURED: 'sources:listConfigured',
  SOURCES_PICK_AND_ADD_LOCAL_FOLDER: 'sources:pickAndAddLocalFolder',
  SOURCES_REINDEX: 'sources:reindex',
  SOURCES_SEARCH_DOCUMENTS: 'sources:searchDocuments',
  SOURCES_GET_DOCUMENT: 'sources:getDocument',

  // ── CBO (코드 분석) ──
  CBO_ANALYZE_TEXT: 'cbo:analyzeText',
  CBO_ANALYZE_FILE: 'cbo:analyzeFile',
  CBO_ANALYZE_FOLDER: 'cbo:analyzeFolder',
  CBO_PICK_AND_ANALYZE_FILE: 'cbo:pickAndAnalyzeFile',
  CBO_PICK_AND_ANALYZE_FOLDER: 'cbo:pickAndAnalyzeFolder',
  CBO_RUNS_LIST: 'cbo:runs:list',
  CBO_RUNS_DETAIL: 'cbo:runs:detail',
  CBO_RUNS_SYNC_KNOWLEDGE: 'cbo:runs:syncKnowledge',
  CBO_RUNS_DIFF: 'cbo:runs:diff',
  CBO_CANCEL_FOLDER: 'cbo:cancelFolder',
  CBO_PROGRESS: 'cbo:progress',

  // ── Audit ──
  AUDIT_LIST: 'audit:list',
  AUDIT_SEARCH: 'audit:search',

  // ── Vault ──
  VAULT_LIST: 'vault:list',
  VAULT_SEARCH_BY_CLASSIFICATION: 'vault:searchByClassification',
  VAULT_LIST_BY_DOMAIN_PACK: 'vault:listByDomainPack',

  // ── MCP ──
  MCP_CONNECT: 'mcp:connect',
  MCP_DISCONNECT: 'mcp:disconnect',
  MCP_LIST_SERVERS: 'mcp:listServers',
  MCP_LIST_RESOURCES: 'mcp:listResources',
  MCP_ADD_SOURCE: 'mcp:addSource',
  MCP_SYNC_SOURCE: 'mcp:syncSource',

  // ── Archive ──
  ARCHIVE_PICK_FOLDER: 'archive:pickFolder',
  ARCHIVE_LIST_CONTENTS: 'archive:listContents',
  ARCHIVE_READ_FILE: 'archive:readFile',
  ARCHIVE_SAVE_FILE: 'archive:saveFile',

  // ── Cockpit (마감 관리) ──
  COCKPIT_PLANS_LIST: 'cockpit:plans:list',
  COCKPIT_PLANS_GET: 'cockpit:plans:get',
  COCKPIT_PLANS_CREATE: 'cockpit:plans:create',
  COCKPIT_PLANS_UPDATE: 'cockpit:plans:update',
  COCKPIT_PLANS_DELETE: 'cockpit:plans:delete',
  COCKPIT_PLANS_LIST_BY_STATUS: 'cockpit:plans:listByStatus',
  COCKPIT_PLANS_LIST_OVERDUE: 'cockpit:plans:listOverdue',
  COCKPIT_STEPS_LIST: 'cockpit:steps:list',
  COCKPIT_STEPS_CREATE: 'cockpit:steps:create',
  COCKPIT_STEPS_UPDATE: 'cockpit:steps:update',
  COCKPIT_STEPS_DELETE: 'cockpit:steps:delete',
  COCKPIT_STEPS_REORDER: 'cockpit:steps:reorder',
  COCKPIT_STATS: 'cockpit:stats',

  // ── Routine (루틴 자동화) ──
  ROUTINE_TEMPLATES_LIST: 'routine:templates:list',
  ROUTINE_TEMPLATES_LIST_BY_FREQUENCY: 'routine:templates:listByFrequency',
  ROUTINE_TEMPLATES_GET: 'routine:templates:get',
  ROUTINE_TEMPLATES_CREATE: 'routine:templates:create',
  ROUTINE_TEMPLATES_UPDATE: 'routine:templates:update',
  ROUTINE_TEMPLATES_DELETE: 'routine:templates:delete',
  ROUTINE_TEMPLATES_TOGGLE: 'routine:templates:toggle',
  ROUTINE_KNOWLEDGE_LIST: 'routine:knowledge:list',
  ROUTINE_KNOWLEDGE_LINK: 'routine:knowledge:link',
  ROUTINE_KNOWLEDGE_UNLINK: 'routine:knowledge:unlink',
  ROUTINE_EXECUTE_NOW: 'routine:execute:now',
  ROUTINE_EXECUTIONS_LIST: 'routine:executions:list',
  ROUTINE_EXECUTIONS_PLAN_IDS: 'routine:executions:planIds',

  // ── Agents ──
  AGENTS_LIST: 'agents:list',
  AGENTS_GET: 'agents:get',
  AGENTS_EXECUTE: 'agents:execute',
  AGENTS_EXECUTION_STATUS: 'agents:execution:status',
  AGENTS_EXECUTIONS_LIST: 'agents:executions:list',
  AGENTS_EXECUTION_CANCEL: 'agents:execution:cancel',
  AGENTS_LIST_CUSTOM: 'agents:listCustom',
  AGENTS_SAVE_CUSTOM: 'agents:saveCustom',
  AGENTS_DELETE_CUSTOM: 'agents:deleteCustom',
  AGENTS_OPEN_FOLDER: 'agents:openFolder',

  // ── Policy (정책 엔진) ──
  POLICY_RULES_LIST: 'policy:rules:list',
  POLICY_RULES_CREATE: 'policy:rules:create',
  POLICY_RULES_UPDATE: 'policy:rules:update',
  POLICY_RULES_DELETE: 'policy:rules:delete',
  POLICY_EVALUATE: 'policy:evaluate',
  POLICY_APPROVALS_LIST: 'policy:approvals:list',
  POLICY_APPROVALS_DECIDE: 'policy:approvals:decide',

  // ── Schedule (스케줄) ──
  SCHEDULE_LIST: 'schedule:list',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_UPDATE: 'schedule:update',
  SCHEDULE_DELETE: 'schedule:delete',
  SCHEDULE_EXECUTE_NOW: 'schedule:execute-now',
  SCHEDULE_LOGS: 'schedule:logs',
  SCHEDULE_LOGS_RECENT: 'schedule:logs:recent',
  SCHEDULE_EXECUTION_COMPLETE: 'schedule:execution-complete',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
