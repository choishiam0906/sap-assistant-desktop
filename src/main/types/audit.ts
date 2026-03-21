import type { ProviderType } from './provider.js';

export type AuditAction =
  | "send_message"
  | "send_message_stream"
  | "analyze_cbo"
  | "sync_knowledge"
  | "stream_message";

export type AuditPolicyDecision = "ALLOWED" | "BLOCKED" | "PENDING_APPROVAL";

export interface AuditLogEntry {
  id: string;
  sessionId: string | null;
  runId: string | null;
  timestamp: string;
  action: AuditAction;
  externalTransfer: boolean;
  policyDecision: AuditPolicyDecision;
  provider: ProviderType | null;
  model: string | null;
  skillId?: string | null;
  sourceIds?: string[] | null;
  sourceCount?: number;
}

export interface AuditSearchFilters {
  from?: string;
  to?: string;
  action?: AuditAction;
}
