import type { VaultClassification, VaultSourceType } from './vault.js';

export interface SourceReference {
  id?: string;
  title: string;
  category: string;
  relevance_score: number;
  description?: string | null;
}

export type SkillOutputFormat =
  | "chat-answer"
  | "structured-report"
  | "checklist"
  | "explanation";

export type SourceKind =
  | "vault"
  | "run"
  | "local-file"
  | "workspace"
  | "local-folder"
  | "mcp"
  | "api";
export type SourceAvailability = "ready" | "empty" | "unavailable";
export type ConfiguredSourceKind = "local-folder" | "mcp" | "api" | "data-platform";
export type SourceSyncStatus = "idle" | "indexing" | "ready" | "error";

export interface ConfiguredSource {
  id: string;
  kind: ConfiguredSourceKind;
  title: string;
  rootPath: string | null;
  classificationDefault: VaultClassification | null;
  includeGlobs: string[];
  enabled: boolean;
  syncStatus: SourceSyncStatus;
  lastIndexedAt: string | null;
  documentCount: number;
  connectionMeta: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PickAndAddLocalFolderSourceInput {
  title?: string;
  classificationDefault: VaultClassification;
  includeGlobs?: string[];
}

export interface SourceIndexSummary {
  indexed: number;
  updated: number;
  unchanged: number;
  removed: number;
  skipped: number;
  failed: number;
}

// MCP 공유 타입
export interface McpServerConfigInput {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface PickAndAddLocalFolderSourceOutput {
  canceled: boolean;
  source: ConfiguredSource | null;
  summary: SourceIndexSummary | null;
}

export interface SourceDocument {
  id: string;
  sourceId: string;
  relativePath: string;
  absolutePath: string;
  title: string;
  excerpt: string | null;
  contentText: string;
  contentHash: string;
  classification: VaultClassification | null;
  tags: string[];
  indexedAt: string;
}

export interface SourceDocumentSearchInput {
  query?: string;
  sourceId?: string;
  sourceKind?: ConfiguredSourceKind;
  limit?: number;
}

export interface SkillPackDefinition {
  id: string;
  title: string;
  description: string;
  audience: "ops" | "functional" | "mixed";
  skillIds: string[];
}

export interface SkillDefinition {
  id: string;
  title: string;
  description: string;
  supportedDataTypes: Array<"chat" | "cbo">;
  defaultPromptTemplate: string;
  outputFormat: SkillOutputFormat;
  requiredSources: string[];
  suggestedInputs: string[];
  domainCodes?: string[];
  isCustom?: boolean;
}

export interface SourceDefinition {
  id: string;
  title: string;
  description: string;
  kind: SourceKind;
  classification: VaultClassification | "mixed" | null;
  availability: SourceAvailability;
  sourceType:
    | VaultSourceType
    | "current_run"
    | "local_file"
    | "workspace_context"
    | "local_folder_library"
    | "mcp_connector"
    | "api_connector"
    | "data_platform_connector";
  linkedId?: string | null;
  configuredSourceId?: string | null;
  rootPath?: string | null;
  documentCount?: number;
}
