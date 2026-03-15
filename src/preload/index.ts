import { contextBridge, ipcRenderer } from "electron";

import type {
  AgentDefinition,
  AgentExecution,
  AgentExecutionSummary,
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
  DomainPack,
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
  SapLabel,
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
  SapSkillDefinition,
  SapSourceDefinition,
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
  listSkills(): Promise<SapSkillDefinition[]> {
    return ipcRenderer.invoke(IPC.SKILLS_LIST);
  },
  listSkillPacks(): Promise<SkillPackDefinition[]> {
    return ipcRenderer.invoke(IPC.SKILLS_LIST_PACKS);
  },
  recommendSkills(context: SkillExecutionContext): Promise<SkillRecommendation[]> {
    return ipcRenderer.invoke(IPC.SKILLS_RECOMMEND, context);
  },
  listSources(context: SkillExecutionContext): Promise<SapSourceDefinition[]> {
    return ipcRenderer.invoke(IPC.SOURCES_LIST, context);
  },
  searchSources(query: string, context: SkillExecutionContext): Promise<SapSourceDefinition[]> {
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
  listVaultByDomainPack(pack: DomainPack, limit?: number) {
    return ipcRenderer.invoke(IPC.VAULT_LIST_BY_DOMAIN_PACK, pack, limit);
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
    input: { title?: string; domainPack: DomainPack; classificationDefault: VaultClassification }
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
  addSessionLabel(sessionId: string, label: SapLabel): Promise<void> {
    return ipcRenderer.invoke(IPC.SESSIONS_ADD_LABEL, sessionId, label);
  },
  removeSessionLabel(sessionId: string, label: SapLabel): Promise<void> {
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

  listAgents(domainPack?: DomainPack): Promise<AgentDefinition[]> {
    return ipcRenderer.invoke(IPC.AGENTS_LIST, domainPack);
  },
  getAgent(id: string): Promise<AgentDefinition | null> {
    return ipcRenderer.invoke(IPC.AGENTS_GET, id);
  },
  executeAgent(agentId: string, domainPack: DomainPack): Promise<string> {
    return ipcRenderer.invoke(IPC.AGENTS_EXECUTE, agentId, domainPack);
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

  // ─── Policy (정책 엔진) API ───

  listPolicyRules() {
    return ipcRenderer.invoke(IPC.POLICY_RULES_LIST);
  },
  createPolicyRule(input: { name: string; description?: string; conditions: unknown[]; action: string; priority?: number }) {
    return ipcRenderer.invoke(IPC.POLICY_RULES_CREATE, input);
  },
  updatePolicyRule(id: string, patch: Record<string, unknown>) {
    return ipcRenderer.invoke(IPC.POLICY_RULES_UPDATE, id, patch);
  },
  deletePolicyRule(id: string) {
    return ipcRenderer.invoke(IPC.POLICY_RULES_DELETE, id);
  },
  evaluatePolicy(context: { action: string; provider?: string; domainPack?: string; skillId?: string; externalTransfer?: boolean }) {
    return ipcRenderer.invoke(IPC.POLICY_EVALUATE, context);
  },
  listPendingApprovals() {
    return ipcRenderer.invoke(IPC.POLICY_APPROVALS_LIST);
  },
  decideApproval(requestId: string, approved: boolean) {
    return ipcRenderer.invoke(IPC.POLICY_APPROVALS_DECIDE, requestId, approved);
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

  listCustomSkills(): Promise<SapSkillDefinition[]> {
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
};

contextBridge.exposeInMainWorld("sapOpsDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
