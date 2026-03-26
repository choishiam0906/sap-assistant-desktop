import type { BrowserWindow } from "electron";
import type { OAuthManager } from "../auth/oauthManager.js";
import type { ChatRuntime } from "../chatRuntime.js";
import type { CboAnalyzer } from "../cbo/analyzer.js";
import type { CboBatchRuntime } from "../cbo/batchRuntime.js";
import type { SkillSourceRegistry } from "../skills/registry.js";
import type { LocalFolderSourceLibrary } from "../sources/localFolderLibrary.js";
import type { McpConnector } from "../sources/mcpConnector.js";
import type {
  AgentExecutionRepository,
  AuditRepository,
  ClosingPlanRepository,
  ClosingStepRepository,
  ConfiguredSourceRepository,
  RoutineExecutionRepository,
  RoutineKnowledgeLinkRepository,
  RoutineTemplateRepository,
  ScheduledTaskRepository,
  ScheduleLogRepository,
  SessionRepository,
  SourceDocumentRepository,
  VaultRepository,
} from "../storage/repositories/index.js";
import type { RoutineExecutor } from "../services/routineExecutor.js";
import type { RoutineScheduler } from "../services/routineScheduler.js";
import type { AgentExecutor } from "../agents/executor.js";
import type { EmailManager } from "../email/emailManager.js";
import type { CodeAnalyzer } from "../analysis/codeAnalyzer.js";
import type { GitHubSourceProvider } from "../sources/githubProvider.js";
import type {
  EmailInboxRepository,
  EmailTaskLinkRepository,
  CodeAnalysisRepository,
  DocumentChunkRepository,
} from "../storage/repositories/index.js";
import type { EmbeddingPipeline } from "../embedding/embeddingPipeline.js";
import type { EmbeddingService } from "../embedding/embeddingService.js";
import type { HybridSearchEngine } from "../search/hybridSearch.js";
import type { RagPipeline } from "../search/ragPipeline.js";
import type { ReportGenerator } from "../reports/reportGenerator.js";
import type { ExportService } from "../reports/exportService.js";
import type { ReportRepository } from "../reports/reportRepository.js";
import type { ReportScheduler } from "../reports/reportScheduler.js";
import type { SearchConfigRepository } from "../search/searchConfig.js";
import type { AgentToolkit } from "../agents/toolkit.js";
import type { DataPlatformProvider } from "../sources/dataPlatformProvider.js";
export interface IpcContext {
  oauthManager: OAuthManager;
  chatRuntime: ChatRuntime;
  cboAnalyzer: CboAnalyzer;
  cboBatchRuntime: CboBatchRuntime;
  auditRepo: AuditRepository;
  vaultRepo: VaultRepository;
  sessionRepo: SessionRepository;
  skillRegistry: SkillSourceRegistry;
  configuredSourceRepo: ConfiguredSourceRepository;
  sourceDocumentRepo: SourceDocumentRepository;
  localFolderLibrary: LocalFolderSourceLibrary;
  mcpConnector: McpConnector;
  closingPlanRepo: ClosingPlanRepository;
  closingStepRepo: ClosingStepRepository;
  routineTemplateRepo: RoutineTemplateRepository;
  routineExecutionRepo: RoutineExecutionRepository;
  routineKnowledgeLinkRepo: RoutineKnowledgeLinkRepository;
  routineExecutor: RoutineExecutor;
  routineScheduler: RoutineScheduler;
  scheduledTaskRepo: ScheduledTaskRepository;
  scheduleLogRepo: ScheduleLogRepository;
  agentExecutionRepo: AgentExecutionRepository;
  agentExecutor: AgentExecutor;
  emailManager: EmailManager;
  emailInboxRepo: EmailInboxRepository;
  emailTaskLinkRepo: EmailTaskLinkRepository;
  codeAnalyzer: CodeAnalyzer;
  codeAnalysisRepo: CodeAnalysisRepository;
  githubProvider: GitHubSourceProvider;
  chunkRepo: DocumentChunkRepository;
  embeddingPipeline: EmbeddingPipeline;
  embeddingService: EmbeddingService;
  hybridSearch: HybridSearchEngine;
  ragPipeline: RagPipeline;
  searchConfigRepo: SearchConfigRepository;
  reportGenerator: ReportGenerator;
  exportService: ExportService;
  reportRepo: ReportRepository;
  reportScheduler: ReportScheduler;
  agentToolkit: AgentToolkit;
  dataPlatformProvider: DataPlatformProvider;
  getMainWindow: () => BrowserWindow | null;
}
