import type { AuditSearchFilters, SessionFilter, VaultClassification } from '../../main/contracts.js'

/**
 * 전체 앱의 React Query key를 중앙 관리하는 팩토리.
 * invalidateQueries / setQueryData 등에서 동일한 키를 참조하도록 보장한다.
 */
export const queryKeys = {
  sessions: {
    all: ['sessions'] as const,
    list: (limit: number) => ['sessions', limit] as const,
    filtered: (filter: SessionFilter, limit: number) => ['sessions:filtered', filter, limit] as const,
    stats: () => ['sessions:stats'] as const,
  },

  messages: {
    list: (sessionId: string | null, limit: number) => ['messages', sessionId, limit] as const,
  },

  routines: {
    templates: () => ['routine:templates'] as const,
    templatesByFrequency: (freq: string) => ['routine:templates', freq] as const,
    template: (id: string | null) => ['routine:template', id] as const,
    knowledge: (templateId: string | null) => ['routine:knowledge', templateId] as const,
    executions: (date?: string) => ['routine:executions', date] as const,
    planIds: (date: string) => ['routine:planIds', date] as const,
  },

  closing: {
    all: ['closing'] as const,
    plans: (limit?: number) => ['closing:plans', limit] as const,
    plan: (planId: string | null) => ['closing:plan', planId] as const,
    steps: (planId: string | null) => ['closing:steps', planId] as const,
    stats: () => ['closing:stats'] as const,
  },

  audit: {
    logs: (limit: number) => ['auditLogs', limit] as const,
    search: (filters: AuditSearchFilters) => ['auditLogs', 'search', filters] as const,
  },

  cbo: {
    runs: (limit: number) => ['cboRuns', limit] as const,
  },

  vault: {
    list: (limit: number) => ['vault', limit] as const,
    byClassification: (classification: VaultClassification, query?: string, limit?: number) =>
      ['vault', classification, query, limit] as const,
  },

  auth: {
    allStatus: () => ['auth', 'all-status'] as const,
  },

  skills: {
    all: () => ['skills', 'all'] as const,
    custom: () => ['skills', 'custom'] as const,
    list: () => ['skills', 'list'] as const,
    packs: () => ['skills', 'packs'] as const,
    recommend: (domainPack: string) => ['skills', 'recommend', domainPack] as const,
  },

  agents: {
    list: (domainPack: string) => ['agents', 'list', domainPack] as const,
    executions: (agentId?: string) => ['agents', 'executions', agentId] as const,
    execution: (executionId: string) => ['agents', 'execution', executionId] as const,
  },

  sources: {
    configured: () => ['sources', 'configured'] as const,
    documents: (...params: unknown[]) => ['sources', 'documents', ...params] as const,
    list: (...params: unknown[]) => ['sources', ...params] as const,
  },

  mcp: {
    servers: () => ['mcp', 'servers'] as const,
    resources: (server: string) => ['mcp', 'resources', server] as const,
  },

  process: {
    knowledge: (templateId: string | undefined, domainPack: string, candidates: string) =>
      ['process', 'knowledge', templateId, domainPack, candidates] as const,
  },

  schedule: {
    all: ['schedule'] as const,
    tasks: () => ['schedule', 'tasks'] as const,
    logs: (taskId: string | null) => ['schedule', 'logs', taskId] as const,
  },

  policy: {
    all: ['policy'] as const,
    rules: () => ['policy', 'rules'] as const,
  },
}
