import { contextBridge, ipcRenderer } from "electron";

import type {
  AgentDefinition,
  AgentExecution,
  AgentExecutionSummary,
  AgentStepStartedEvent,
  AgentStepCompletedEvent,
  AgentExecutionDoneEvent,
  InteractiveAgentInput,
  ArchiveTreeNode,
  AuditSearchFilters,
  CboBatchProgressEvent,
  ChatSessionMeta,
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStepInput,
  ClosingStepUpdate,
  ConfiguredSource,
  CockpitStats,
  DeviceCodeInitResult,
  ListArchiveContentsInput,
  McpResourceInfo,
  McpServerConfigInput,
  PlanStatus,
  PickAndAddLocalFolderSourceInput,
  ProviderType,
  ReadArchiveFileInput,
  RoutineExecution,
  RoutineFrequency,
  RoutineKnowledgeLink,
  RoutineKnowledgeLinkInput,
  RoutineTemplate,
  RoutineTemplateInput,
  RoutineTemplateStep,
  RoutineTemplateUpdate,
  DomainLabel,
  SaveArchiveFileInput,
  SendMessageInput,
  SessionFilter,
  SetApiKeyInput,
  SourceIndexSummary,
  TodoStateKind,
  VaultClassification,
  OAuthAvailability,
  OAuthInitResult,
  ProviderAccount,
  SkillDefinition,
  SourceDefinition,
  SkillPackDefinition,
  SourceDocument,
  SourceDocumentSearchInput,
  SkillExecutionContext,
  SkillRecommendation,
} from "../main/contracts.js";
import type { AgentExecutionListOptions } from "../main/storage/repositories/agentExecutionRepository.js";
import { IPC } from "../main/ipc/channels.js";

const desktopApi = {
  setApiKey(input: SetApiKeyInput) {
    return ipcRenderer.invoke(IPC.AUTH_SET_API_KEY, input);
  },
  getAuthStatus(provider: ProviderType) {
    return ipcRenderer.invoke(IPC.AUTH_STATUS, provider);
  },
  logout(provider: ProviderType) {
    return ipcRenderer.invoke(IPC.AUTH_LOGOUT, provider);
  },
  getOAuthAvailability(): Promise<OAuthAvailability[]> {
    return ipcRenderer.invoke(IPC.AUTH_OAUTH_AVAILABILITY);
  },
  initiateOAuth(provider: ProviderType): Promise<OAuthInitResult> {
    return ipcRenderer.invoke(IPC.AUTH_INITIATE_OAUTH, provider);
  },
  waitOAuthCallback(provider: ProviderType): Promise<ProviderAccount> {
    return ipcRenderer.invoke(IPC.AUTH_WAIT_OAUTH_CALLBACK, provider);
  },
  cancelOAuth(provider: ProviderType): Promise<void> {
    return ipcRenderer.invoke(IPC.AUTH_CANCEL_OAUTH, provider);
  },
  submitOAuthCode(provider: ProviderType, code: string): Promise<ProviderAccount> {
    return ipcRenderer.invoke(IPC.AUTH_SUBMIT_OAUTH_CODE, provider, code);
  },
  // GitHub Device Code (Copilot)
  initiateDeviceCode(): Promise<DeviceCodeInitResult> {
    return ipcRenderer.invoke(IPC.AUTH_INITIATE_DEVICE_CODE);
  },
  pollDeviceCode(): Promise<ProviderAccount> {
    return ipcRenderer.invoke(IPC.AUTH_POLL_DEVICE_CODE);
  },
  cancelDeviceCode(): Promise<void> {
    return ipcRenderer.invoke(IPC.AUTH_CANCEL_DEVICE_CODE);
  },
  sendMessage(input: SendMessageInput) {
    return ipcRenderer.invoke(IPC.CHAT_SEND, input);
  },
  streamMessage(input: SendMessageInput) {
    return ipcRenderer.invoke(IPC.CHAT_STREAM, input);
  },
  onStreamChunk(callback: (chunk: { delta: string; inputTokens?: number; outputTokens?: number }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { delta: string; inputTokens?: number; outputTokens?: number }) =>
      callback(data);
    ipcRenderer.on(IPC.CHAT_STREAM_CHUNK, handler);
    return () => { ipcRenderer.removeListener(IPC.CHAT_STREAM_CHUNK, handler); };
  },
  onStreamDone(callback: (data: { session: unknown; assistantMessage: unknown; meta: unknown }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { session: unknown; assistantMessage: unknown; meta: unknown }) =>
      callback(data);
    ipcRenderer.on(IPC.CHAT_STREAM_DONE, handler);
    return () => { ipcRenderer.removeListener(IPC.CHAT_STREAM_DONE, handler); };
  },
  onStreamError(callback: (data: { error: string }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { error: string }) =>
      callback(data);
    ipcRenderer.on(IPC.CHAT_STREAM_ERROR, handler);
    return () => { ipcRenderer.removeListener(IPC.CHAT_STREAM_ERROR, handler); };
  },
  setChatHistoryLimit(limit: number): Promise<void> {
    return ipcRenderer.invoke(IPC.CHAT_SET_HISTORY_LIMIT, limit);
  },
  getChatHistoryLimit(): Promise<number> {
    return ipcRenderer.invoke(IPC.CHAT_GET_HISTORY_LIMIT);
  },
  stopGeneration(): Promise<void> {
    return ipcRenderer.invoke(IPC.CHAT_STOP);
  },
  listSkills(): Promise<SkillDefinition[]> {
    return ipcRenderer.invoke(IPC.SKILLS_LIST);
  },
  listSkillPacks(): Promise<SkillPackDefinition[]> {
    return ipcRenderer.invoke(IPC.SKILLS_LIST_PACKS);
  },
  recommendSkills(context: SkillExecutionContext): Promise<SkillRecommendation[]> {
    return ipcRenderer.invoke(IPC.SKILLS_RECOMMEND, context);
  },
  listSources(context: SkillExecutionContext): Promise<SourceDefinition[]> {
    return ipcRenderer.invoke(IPC.SOURCES_LIST, context);
  },
  searchSources(query: string, context: SkillExecutionContext): Promise<SourceDefinition[]> {
    return ipcRenderer.invoke(IPC.SOURCES_SEARCH, query, context);
  },
  listConfiguredSources(): Promise<ConfiguredSource[]> {
    return ipcRenderer.invoke(IPC.SOURCES_LIST_CONFIGURED);
  },
  pickAndAddLocalFolderSource(input: PickAndAddLocalFolderSourceInput) {
    return ipcRenderer.invoke(IPC.SOURCES_PICK_AND_ADD_LOCAL_FOLDER, input);
  },
  reindexSource(sourceId: string) {
    return ipcRenderer.invoke(IPC.SOURCES_REINDEX, sourceId);
  },
  searchSourceDocuments(input: SourceDocumentSearchInput): Promise<SourceDocument[]> {
    return ipcRenderer.invoke(IPC.SOURCES_SEARCH_DOCUMENTS, input);
  },
  getSourceDocument(documentId: string): Promise<SourceDocument | null> {
    return ipcRenderer.invoke(IPC.SOURCES_GET_DOCUMENT, documentId);
  },
  listSessions(limit = 50) {
    return ipcRenderer.invoke(IPC.SESSIONS_LIST, limit);
  },
  getSessionMessages(sessionId: string, limit = 100) {
    return ipcRenderer.invoke(IPC.SESSIONS_MESSAGES, sessionId, limit);
  },
  analyzeCboText(input: CboAnalyzeTextInput) {
    return ipcRenderer.invoke(IPC.CBO_ANALYZE_TEXT, input);
  },
  analyzeCboFile(input: CboAnalyzeFileInput) {
    return ipcRenderer.invoke(IPC.CBO_ANALYZE_FILE, input);
  },
  analyzeCboFolder(input: CboAnalyzeFolderInput) {
    return ipcRenderer.invoke(IPC.CBO_ANALYZE_FOLDER, input);
  },
  pickAndAnalyzeCboFile(input?: CboAnalyzePickInput) {
    return ipcRenderer.invoke(IPC.CBO_PICK_AND_ANALYZE_FILE, input);
  },
  pickAndAnalyzeCboFolder(input?: CboAnalyzeFolderPickInput) {
    return ipcRenderer.invoke(IPC.CBO_PICK_AND_ANALYZE_FOLDER, input);
  },
  listCboRuns(limit = 20) {
    return ipcRenderer.invoke(IPC.CBO_RUNS_LIST, limit);
  },
  getCboRunDetail(runId: string, limitFiles = 500) {
    return ipcRenderer.invoke(IPC.CBO_RUNS_DETAIL, runId, limitFiles);
  },
  syncCboRunKnowledge(input: CboSyncKnowledgeInput) {
    return ipcRenderer.invoke(IPC.CBO_RUNS_SYNC_KNOWLEDGE, input);
  },
  diffCboRuns(input: CboRunDiffInput) {
    return ipcRenderer.invoke(IPC.CBO_RUNS_DIFF, input);
  },
  cancelCboFolder() {
    return ipcRenderer.invoke(IPC.CBO_CANCEL_FOLDER);
  },
  onCboProgress(callback: (event: CboBatchProgressEvent) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: CboBatchProgressEvent) =>
      callback(data);
    ipcRenderer.on(IPC.CBO_PROGRESS, handler);
    return () => {
      ipcRenderer.removeListener(IPC.CBO_PROGRESS, handler);
    };
  },
  listAuditLogs(limit = 50) {
    return ipcRenderer.invoke(IPC.AUDIT_LIST, limit);
  },
  searchAuditLogs(filters: AuditSearchFilters) {
    return ipcRenderer.invoke(IPC.AUDIT_SEARCH, filters);
  },
  listVaultEntries(limit = 50) {
    return ipcRenderer.invoke(IPC.VAULT_LIST, limit);
  },
  searchVaultByClassification(classification: VaultClassification, query?: string, limit?: number) {
    return ipcRenderer.invoke(IPC.VAULT_SEARCH_BY_CLASSIFICATION, classification, query, limit);
  },
  // ─── MCP API ───

  mcpConnect(config: McpServerConfigInput): Promise<{ connected: boolean; name: string }> {
    return ipcRenderer.invoke(IPC.MCP_CONNECT, config);
  },
  mcpDisconnect(serverName: string): Promise<{ disconnected: boolean }> {
    return ipcRenderer.invoke(IPC.MCP_DISCONNECT, serverName);
  },
  mcpListServers(): Promise<string[]> {
    return ipcRenderer.invoke(IPC.MCP_LIST_SERVERS);
  },
  mcpListResources(serverName: string): Promise<McpResourceInfo[]> {
    return ipcRenderer.invoke(IPC.MCP_LIST_RESOURCES, serverName);
  },
  mcpAddSource(
    serverName: string,
    input: { title?: string; classificationDefault: VaultClassification }
  ): Promise<{ source: ConfiguredSource; summary: SourceIndexSummary }> {
    return ipcRenderer.invoke(IPC.MCP_ADD_SOURCE, serverName, input);
  },
  mcpSyncSource(sourceId: string): Promise<{ source: ConfiguredSource | null; summary: SourceIndexSummary }> {
    return ipcRenderer.invoke(IPC.MCP_SYNC_SOURCE, sourceId);
  },

  // ─── Archive (소스코드 아카이브) API ───

  archivePickFolder(): Promise<{ canceled: boolean; path: string | null }> {
    return ipcRenderer.invoke(IPC.ARCHIVE_PICK_FOLDER);
  },
  archiveListContents(input: ListArchiveContentsInput): Promise<ArchiveTreeNode[]> {
    return ipcRenderer.invoke(IPC.ARCHIVE_LIST_CONTENTS, input);
  },
  archiveReadFile(input: ReadArchiveFileInput): Promise<{ content: string; size: number }> {
    return ipcRenderer.invoke(IPC.ARCHIVE_READ_FILE, input);
  },
  archiveSaveFile(input: SaveArchiveFileInput): Promise<{ success: boolean; error?: string }> {
    return ipcRenderer.invoke(IPC.ARCHIVE_SAVE_FILE, input);
  },

  // ─── Cockpit: 세션 API (Ask SAP 등에서 사용) ───

  listSessionsFiltered(filter: SessionFilter, limit = 50): Promise<ChatSessionMeta[]> {
    return ipcRenderer.invoke(IPC.SESSIONS_LIST_FILTERED, filter, limit);
  },
  updateSessionTodoState(sessionId: string, state: TodoStateKind): Promise<void> {
    return ipcRenderer.invoke(IPC.SESSIONS_UPDATE_TODO_STATE, sessionId, state);
  },
  toggleSessionFlag(sessionId: string): Promise<void> {
    return ipcRenderer.invoke(IPC.SESSIONS_TOGGLE_FLAG, sessionId);
  },
  toggleSessionArchive(sessionId: string): Promise<void> {
    return ipcRenderer.invoke(IPC.SESSIONS_TOGGLE_ARCHIVE, sessionId);
  },
  addSessionLabel(sessionId: string, label: DomainLabel): Promise<void> {
    return ipcRenderer.invoke(IPC.SESSIONS_ADD_LABEL, sessionId, label);
  },
  removeSessionLabel(sessionId: string, label: DomainLabel): Promise<void> {
    return ipcRenderer.invoke(IPC.SESSIONS_REMOVE_LABEL, sessionId, label);
  },
  getSessionStats(): Promise<CockpitStats> {
    return ipcRenderer.invoke(IPC.SESSIONS_STATS);
  },

  // ─── Closing (마감 관리) API ───

  listPlans(limit?: number) {
    return ipcRenderer.invoke(IPC.COCKPIT_PLANS_LIST, limit);
  },
  getPlan(planId: string) {
    return ipcRenderer.invoke(IPC.COCKPIT_PLANS_GET, planId);
  },
  createPlan(input: ClosingPlanInput) {
    return ipcRenderer.invoke(IPC.COCKPIT_PLANS_CREATE, input);
  },
  updatePlan(planId: string, update: ClosingPlanUpdate) {
    return ipcRenderer.invoke(IPC.COCKPIT_PLANS_UPDATE, { planId, update });
  },
  deletePlan(planId: string) {
    return ipcRenderer.invoke(IPC.COCKPIT_PLANS_DELETE, planId);
  },
  listPlansByStatus(status: PlanStatus) {
    return ipcRenderer.invoke(IPC.COCKPIT_PLANS_LIST_BY_STATUS, status);
  },
  listOverduePlans() {
    return ipcRenderer.invoke(IPC.COCKPIT_PLANS_LIST_OVERDUE);
  },
  listSteps(planId: string) {
    return ipcRenderer.invoke(IPC.COCKPIT_STEPS_LIST, planId);
  },
  createStep(input: ClosingStepInput) {
    return ipcRenderer.invoke(IPC.COCKPIT_STEPS_CREATE, input);
  },
  updateStep(stepId: string, update: ClosingStepUpdate) {
    return ipcRenderer.invoke(IPC.COCKPIT_STEPS_UPDATE, { stepId, update });
  },
  deleteStep(stepId: string) {
    return ipcRenderer.invoke(IPC.COCKPIT_STEPS_DELETE, stepId);
  },
  reorderSteps(planId: string, stepIds: string[]) {
    return ipcRenderer.invoke(IPC.COCKPIT_STEPS_REORDER, { planId, stepIds });
  },
  getClosingStats() {
    return ipcRenderer.invoke(IPC.COCKPIT_STATS);
  },

  // ─── Routine (루틴 업무 자동화) API ───

  listRoutineTemplates(): Promise<RoutineTemplate[]> {
    return ipcRenderer.invoke(IPC.ROUTINE_TEMPLATES_LIST);
  },
  listRoutineTemplatesByFrequency(frequency: RoutineFrequency): Promise<RoutineTemplate[]> {
    return ipcRenderer.invoke(IPC.ROUTINE_TEMPLATES_LIST_BY_FREQUENCY, frequency);
  },
  getRoutineTemplate(id: string): Promise<{ template: RoutineTemplate; steps: RoutineTemplateStep[] } | null> {
    return ipcRenderer.invoke(IPC.ROUTINE_TEMPLATES_GET, id);
  },
  createRoutineTemplate(input: RoutineTemplateInput): Promise<RoutineTemplate> {
    return ipcRenderer.invoke(IPC.ROUTINE_TEMPLATES_CREATE, input);
  },
  updateRoutineTemplate(id: string, patch: RoutineTemplateUpdate): Promise<RoutineTemplate | null> {
    return ipcRenderer.invoke(IPC.ROUTINE_TEMPLATES_UPDATE, { id, patch });
  },
  deleteRoutineTemplate(id: string): Promise<boolean> {
    return ipcRenderer.invoke(IPC.ROUTINE_TEMPLATES_DELETE, id);
  },
  toggleRoutineTemplate(id: string): Promise<RoutineTemplate | null> {
    return ipcRenderer.invoke(IPC.ROUTINE_TEMPLATES_TOGGLE, id);
  },
  listRoutineKnowledgeLinks(templateId: string): Promise<RoutineKnowledgeLink[]> {
    return ipcRenderer.invoke(IPC.ROUTINE_KNOWLEDGE_LIST, templateId);
  },
  linkRoutineKnowledge(input: RoutineKnowledgeLinkInput): Promise<RoutineKnowledgeLink> {
    return ipcRenderer.invoke(IPC.ROUTINE_KNOWLEDGE_LINK, input);
  },
  unlinkRoutineKnowledge(linkId: string): Promise<boolean> {
    return ipcRenderer.invoke(IPC.ROUTINE_KNOWLEDGE_UNLINK, linkId);
  },
  executeRoutinesNow(): Promise<{ created: number; skipped: number }> {
    return ipcRenderer.invoke(IPC.ROUTINE_EXECUTE_NOW);
  },
  listRoutineExecutions(date?: string): Promise<RoutineExecution[]> {
    return ipcRenderer.invoke(IPC.ROUTINE_EXECUTIONS_LIST, date);
  },
  getRoutineExecutionPlanIds(date: string): Promise<string[]> {
    return ipcRenderer.invoke(IPC.ROUTINE_EXECUTIONS_PLAN_IDS, date);
  },

  // ─── Agent (스킬 조합 워크플로우) API ───

  listAgents(): Promise<AgentDefinition[]> {
    return ipcRenderer.invoke(IPC.AGENTS_LIST);
  },
  getAgent(id: string): Promise<AgentDefinition | null> {
    return ipcRenderer.invoke(IPC.AGENTS_GET, id);
  },
  executeAgent(agentId: string): Promise<string> {
    return ipcRenderer.invoke(IPC.AGENTS_EXECUTE, agentId);
  },
  getAgentExecution(execId: string): Promise<AgentExecution | null> {
    return ipcRenderer.invoke(IPC.AGENTS_EXECUTION_STATUS, execId);
  },
  listAgentExecutions(opts?: AgentExecutionListOptions): Promise<AgentExecutionSummary[]> {
    return ipcRenderer.invoke(IPC.AGENTS_EXECUTIONS_LIST, opts);
  },
  cancelAgentExecution(execId: string): Promise<void> {
    return ipcRenderer.invoke(IPC.AGENTS_EXECUTION_CANCEL, execId);
  },

  // ─── 대화형 에이전트 API ───

  executeAgentInteractive(input: InteractiveAgentInput): Promise<string> {
    return ipcRenderer.invoke(IPC.AGENTS_EXECUTE_INTERACTIVE, input);
  },
  onAgentStepStarted(callback: (event: AgentStepStartedEvent) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: AgentStepStartedEvent) => callback(data);
    ipcRenderer.on(IPC.AGENT_STEP_STARTED, handler);
    return () => { ipcRenderer.removeListener(IPC.AGENT_STEP_STARTED, handler); };
  },
  onAgentStepCompleted(callback: (event: AgentStepCompletedEvent) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: AgentStepCompletedEvent) => callback(data);
    ipcRenderer.on(IPC.AGENT_STEP_COMPLETED, handler);
    return () => { ipcRenderer.removeListener(IPC.AGENT_STEP_COMPLETED, handler); };
  },
  onAgentExecutionDone(callback: (event: AgentExecutionDoneEvent) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: AgentExecutionDoneEvent) => callback(data);
    ipcRenderer.on(IPC.AGENT_EXECUTION_DONE, handler);
    return () => { ipcRenderer.removeListener(IPC.AGENT_EXECUTION_DONE, handler); };
  },
  onAgentExecutionError(callback: (data: { executionId: string; error: string }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { executionId: string; error: string }) => callback(data);
    ipcRenderer.on(IPC.AGENT_EXECUTION_ERROR, handler);
    return () => { ipcRenderer.removeListener(IPC.AGENT_EXECUTION_ERROR, handler); };
  },

  // ─── 커스텀 에이전트 CRUD ───

  listCustomAgents(): Promise<AgentDefinition[]> {
    return ipcRenderer.invoke(IPC.AGENTS_LIST_CUSTOM);
  },
  saveCustomAgent(content: string, fileName: string): Promise<void> {
    return ipcRenderer.invoke(IPC.AGENTS_SAVE_CUSTOM, content, fileName);
  },
  deleteCustomAgent(fileName: string): Promise<void> {
    return ipcRenderer.invoke(IPC.AGENTS_DELETE_CUSTOM, fileName);
  },
  openAgentFolder(): Promise<void> {
    return ipcRenderer.invoke(IPC.AGENTS_OPEN_FOLDER);
  },

  // ─── Email (메일 → 업무) API ───

  emailSyncInbox(sourceId: string): Promise<{ added: number; skipped: number }> {
    return ipcRenderer.invoke(IPC.EMAIL_SYNC_INBOX, sourceId);
  },
  emailListInbox(options?: { limit?: number; unprocessedOnly?: boolean }) {
    return ipcRenderer.invoke(IPC.EMAIL_LIST_INBOX, options);
  },
  emailGetDetail(emailId: string) {
    return ipcRenderer.invoke(IPC.EMAIL_GET_DETAIL, emailId);
  },
  emailAnalyzeAndCreatePlan(payload: { emailId: string; provider: string; model: string }) {
    return ipcRenderer.invoke(IPC.EMAIL_ANALYZE_AND_CREATE_PLAN, payload);
  },
  emailListLinkedPlans(emailId: string) {
    return ipcRenderer.invoke(IPC.EMAIL_LIST_LINKED_PLANS, emailId);
  },
  emailListProviders(): Promise<Array<{ type: string; connected: boolean }>> {
    return ipcRenderer.invoke(IPC.EMAIL_LIST_PROVIDERS);
  },
  emailSyncProvider(providerType: string): Promise<{ added: number; skipped: number }> {
    return ipcRenderer.invoke(IPC.EMAIL_SYNC_PROVIDER, providerType);
  },
  emailManualImport(input: { subject: string; bodyText: string; fromEmail?: string; fromName?: string }) {
    return ipcRenderer.invoke(IPC.EMAIL_MANUAL_IMPORT, input);
  },

  // ─── GitHub (CodeLab 연동) API ───

  githubConnect(input: { repoUrl: string; pat?: string; branch?: string }) {
    return ipcRenderer.invoke(IPC.GITHUB_CONNECT, input);
  },
  githubSync(sourceId: string) {
    return ipcRenderer.invoke(IPC.GITHUB_SYNC, sourceId);
  },
  githubSavePat(pat: string) {
    return ipcRenderer.invoke(IPC.GITHUB_SAVE_PAT, pat);
  },
  githubDeletePat() {
    return ipcRenderer.invoke(IPC.GITHUB_DELETE_PAT);
  },
  githubListSources() {
    return ipcRenderer.invoke(IPC.GITHUB_LIST_SOURCES);
  },

  // ─── Code Analysis (코드 분석) API ───

  codeAnalysisRun(sourceId: string) {
    return ipcRenderer.invoke(IPC.CODE_ANALYSIS_RUN, sourceId);
  },
  codeAnalysisRunFile(documentId: string) {
    return ipcRenderer.invoke(IPC.CODE_ANALYSIS_RUN_FILE, documentId);
  },
  codeAnalysisRunsList(sourceId?: string, limit?: number) {
    return ipcRenderer.invoke(IPC.CODE_ANALYSIS_RUNS_LIST, sourceId, limit);
  },
  codeAnalysisRunDetail(runId: string) {
    return ipcRenderer.invoke(IPC.CODE_ANALYSIS_RUN_DETAIL, runId);
  },
  onCodeAnalysisProgress(callback: (event: { runId: string; analyzedFiles: number; totalFiles: number }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { runId: string; analyzedFiles: number; totalFiles: number }) =>
      callback(data);
    ipcRenderer.on(IPC.CODE_ANALYSIS_PROGRESS, handler);
    return () => { ipcRenderer.removeListener(IPC.CODE_ANALYSIS_PROGRESS, handler); };
  },

  // ─── Schedule (스케줄 자동 실행) API ───

  listScheduledTasks() {
    return ipcRenderer.invoke(IPC.SCHEDULE_LIST);
  },
  createScheduledTask(input: { templateId: string; cronExpression: string; enabled?: boolean }) {
    return ipcRenderer.invoke(IPC.SCHEDULE_CREATE, input);
  },
  updateScheduledTask(id: string, patch: { cronExpression?: string; enabled?: boolean }) {
    return ipcRenderer.invoke(IPC.SCHEDULE_UPDATE, id, patch);
  },
  deleteScheduledTask(id: string) {
    return ipcRenderer.invoke(IPC.SCHEDULE_DELETE, id);
  },
  executeScheduleNow(id: string) {
    return ipcRenderer.invoke(IPC.SCHEDULE_EXECUTE_NOW, id);
  },
  listScheduleLogs(taskId: string, limit?: number) {
    return ipcRenderer.invoke(IPC.SCHEDULE_LOGS, taskId, limit);
  },
  listRecentScheduleLogs(limit?: number) {
    return ipcRenderer.invoke(IPC.SCHEDULE_LOGS_RECENT, limit);
  },
  onScheduleExecutionComplete(callback: (data: unknown) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(IPC.SCHEDULE_EXECUTION_COMPLETE, handler);
    return () => { ipcRenderer.removeListener(IPC.SCHEDULE_EXECUTION_COMPLETE, handler); };
  },

  // ─── 커스텀 스킬 CRUD ───

  listCustomSkills(): Promise<SkillDefinition[]> {
    return ipcRenderer.invoke(IPC.SKILLS_LIST_CUSTOM);
  },
  saveCustomSkill(content: string, fileName: string): Promise<void> {
    return ipcRenderer.invoke(IPC.SKILLS_SAVE_CUSTOM, content, fileName);
  },
  deleteCustomSkill(fileName: string): Promise<void> {
    return ipcRenderer.invoke(IPC.SKILLS_DELETE_CUSTOM, fileName);
  },
  openSkillFolder(): Promise<void> {
    return ipcRenderer.invoke(IPC.SKILLS_OPEN_FOLDER);
  },

  // ─── Embedding (벡터 임베딩) API ───

  embeddingIndexSource(sourceId: string) {
    return ipcRenderer.invoke(IPC.EMBEDDING_INDEX_SOURCE, sourceId);
  },
  embeddingIndexDocument(documentId: string) {
    return ipcRenderer.invoke(IPC.EMBEDDING_INDEX_DOCUMENT, documentId);
  },
  embeddingImportFile(payload: { filePath: string; sourceId: string }) {
    return ipcRenderer.invoke(IPC.EMBEDDING_IMPORT_FILE, payload);
  },
  embeddingPickAndImport(sourceId: string) {
    return ipcRenderer.invoke(IPC.EMBEDDING_PICK_AND_IMPORT, sourceId);
  },
  embeddingStatus() {
    return ipcRenderer.invoke(IPC.EMBEDDING_STATUS);
  },
  onEmbeddingProgress(callback: (event: { sourceId: string; indexed: number; total: number }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { sourceId: string; indexed: number; total: number }) =>
      callback(data);
    ipcRenderer.on(IPC.EMBEDDING_PROGRESS, handler);
    return () => { ipcRenderer.removeListener(IPC.EMBEDDING_PROGRESS, handler); };
  },

  // ─── Search (하이브리드 검색) API ───

  searchHybrid(payload: { query: string; topK?: number; minScore?: number }) {
    return ipcRenderer.invoke(IPC.SEARCH_HYBRID, payload);
  },
  searchSemantic(payload: { query: string; k?: number }) {
    return ipcRenderer.invoke(IPC.SEARCH_SEMANTIC, payload);
  },
  searchKeyword(payload: { query: string; k?: number }) {
    return ipcRenderer.invoke(IPC.SEARCH_KEYWORD, payload);
  },

  // ─── Reports (리포트) API ───

  reportTemplatesList() {
    return ipcRenderer.invoke(IPC.REPORTS_TEMPLATES_LIST);
  },
  reportTemplatesCreate(input: { title: string; description?: string; sections: unknown[]; outputFormat: string }) {
    return ipcRenderer.invoke(IPC.REPORTS_TEMPLATES_CREATE, input);
  },
  reportTemplatesUpdate(payload: { id: string; input: Record<string, unknown> }) {
    return ipcRenderer.invoke(IPC.REPORTS_TEMPLATES_UPDATE, payload);
  },
  reportTemplatesDelete(id: string) {
    return ipcRenderer.invoke(IPC.REPORTS_TEMPLATES_DELETE, id);
  },
  reportGenerate(payload: { templateId: string; provider: string; model: string; query?: string }) {
    return ipcRenderer.invoke(IPC.REPORTS_GENERATE, payload);
  },
  reportRunsList(templateId?: string, limit?: number) {
    return ipcRenderer.invoke(IPC.REPORTS_RUNS_LIST, templateId, limit);
  },
  reportExport(payload: { report: unknown; format: string; outputPath: string }) {
    return ipcRenderer.invoke(IPC.REPORTS_EXPORT, payload);
  },
  onReportProgress(callback: (event: { runId: string; completed: number; total: number }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { runId: string; completed: number; total: number }) =>
      callback(data);
    ipcRenderer.on(IPC.REPORTS_PROGRESS, handler);
    return () => { ipcRenderer.removeListener(IPC.REPORTS_PROGRESS, handler); };
  },

  // ─── Report Schedule (리포트 스케줄) API ───

  reportScheduleList() {
    return ipcRenderer.invoke(IPC.REPORTS_SCHEDULE_LIST);
  },
  reportScheduleCreate(input: { templateId: string; cronExpression: string; enabled?: boolean; provider?: string; model?: string }) {
    return ipcRenderer.invoke(IPC.REPORTS_SCHEDULE_CREATE, input);
  },
  reportScheduleUpdate(payload: { id: string; patch: Record<string, unknown> }) {
    return ipcRenderer.invoke(IPC.REPORTS_SCHEDULE_UPDATE, payload);
  },
  reportScheduleDelete(id: string) {
    return ipcRenderer.invoke(IPC.REPORTS_SCHEDULE_DELETE, id);
  },
  reportScheduleToggle(id: string) {
    return ipcRenderer.invoke(IPC.REPORTS_SCHEDULE_TOGGLE, id);
  },

  // ─── Search Config (검색 설정) API ───

  searchConfigGet() {
    return ipcRenderer.invoke(IPC.SEARCH_CONFIG_GET);
  },
  searchConfigUpdate(config: Record<string, unknown>) {
    return ipcRenderer.invoke(IPC.SEARCH_CONFIG_SET, config);
  },
  searchConfigReset() {
    return ipcRenderer.invoke(IPC.SEARCH_CONFIG_SET, {});
  },

  // ─── Data Platform (외부 데이터 연동) API ───

  dataPlatformConnect(input: {
    name: string;
    endpointUrl: string;
    authType: string;
    authConfig?: Record<string, string>;
    format: string;
    dataPath?: string;
    refreshIntervalMinutes?: number;
  }) {
    return ipcRenderer.invoke(IPC.DATA_PLATFORM_CONNECT, input);
  },
  dataPlatformSync(sourceId: string) {
    return ipcRenderer.invoke(IPC.DATA_PLATFORM_SYNC, sourceId);
  },
  dataPlatformList() {
    return ipcRenderer.invoke(IPC.DATA_PLATFORM_LIST);
  },
  dataPlatformTestConnection(input: {
    name: string;
    endpointUrl: string;
    authType: string;
    authConfig?: Record<string, string>;
    format: string;
    dataPath?: string;
  }) {
    return ipcRenderer.invoke(IPC.DATA_PLATFORM_TEST_CONNECTION, input);
  },

  // ─── Agent Tool-Use (ReAct) API ───

  agentReactExecute(input: { query: string; provider: string; model: string; sessionId?: string; maxIterations?: number }) {
    return ipcRenderer.invoke(IPC.AGENTS_REACT_EXECUTE, input);
  },
  agentToolsList() {
    return ipcRenderer.invoke(IPC.AGENTS_TOOLS_LIST);
  },
  onAgentReactStep(callback: (step: { iteration: number; thought: string; action?: unknown; observation?: string; isFinal: boolean; finalAnswer?: string }) => void) {
    const handler = (_event: Electron.IpcRendererEvent, data: { iteration: number; thought: string; action?: unknown; observation?: string; isFinal: boolean; finalAnswer?: string }) =>
      callback(data);
    ipcRenderer.on(IPC.AGENTS_REACT_STEP, handler);
    return () => { ipcRenderer.removeListener(IPC.AGENTS_REACT_STEP, handler); };
  },
};

contextBridge.exposeInMainWorld("assistantDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
