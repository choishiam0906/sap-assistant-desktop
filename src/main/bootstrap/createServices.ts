import type { BrowserWindow } from "electron";

import { OAuthManager } from "../auth/oauthManager.js";
import { ChatRuntime } from "../chatRuntime.js";
import { CboAnalyzer } from "../cbo/analyzer.js";
import { CboBatchRuntime } from "../cbo/batchRuntime.js";
import type { AppConfig } from "../config.js";
import { AgentExecutor } from "../agents/executor.js";
import { OpenAiProvider } from "../providers/openaiProvider.js";
import { AnthropicProvider } from "../providers/anthropicProvider.js";
import { GoogleProvider } from "../providers/googleProvider.js";
import { CopilotProvider } from "../providers/copilotProvider.js";
import { ProviderResilience } from "../providers/providerResilience.js";
import { RoutineExecutor } from "../services/routineExecutor.js";
import { RoutineScheduler } from "../services/routineScheduler.js";
import { SkillSourceRegistry } from "../skills/registry.js";
import { LocalFolderSourceLibrary } from "../sources/localFolderLibrary.js";
import { McpConnector } from "../sources/mcpConnector.js";
import { GitHubSourceProvider } from "../sources/githubProvider.js";
import { EmailManager } from "../email/emailManager.js";
import { GmailMcpProvider } from "../email/providers/gmailMcpProvider.js";
import { OutlookGraphProvider } from "../email/providers/outlookGraphProvider.js";
import { CodeAnalyzer } from "../analysis/codeAnalyzer.js";
import { EmbeddingService } from "../embedding/embeddingService.js";
import { EmbeddingCache } from "../embedding/embeddingCache.js";
import { DocumentChunker } from "../embedding/documentChunker.js";
import { DocumentImporter } from "../embedding/documentImporter.js";
import { EmbeddingPipeline } from "../embedding/embeddingPipeline.js";
import { HybridSearchEngine } from "../search/hybridSearch.js";
import { RagPipeline } from "../search/ragPipeline.js";
import { SearchConfigRepository } from "../search/searchConfig.js";
import { FollowUpGenerator } from "../search/followUpGenerator.js";
import { ReportGenerator } from "../reports/reportGenerator.js";
import { ExportService } from "../reports/exportService.js";
import { ReportScheduler } from "../reports/reportScheduler.js";
import { DataPlatformProvider } from "../sources/dataPlatformProvider.js";
import { AgentToolkit } from "../agents/toolkit.js";
import type { LocalDatabase } from "../storage/sqlite.js";
import type { Repositories } from "./createRepositories.js";

export interface Services {
  oauthManager: OAuthManager;
  chatRuntime: ChatRuntime;
  cboAnalyzer: CboAnalyzer;
  cboBatchRuntime: CboBatchRuntime;
  skillRegistry: SkillSourceRegistry;
  localFolderLibrary: LocalFolderSourceLibrary;
  mcpConnector: McpConnector;
  routineExecutor: RoutineExecutor;
  routineScheduler: RoutineScheduler;
  agentExecutor: AgentExecutor;
  emailManager: EmailManager;
  codeAnalyzer: CodeAnalyzer;
  githubProvider: GitHubSourceProvider;
  embeddingService: EmbeddingService;
  embeddingCache: EmbeddingCache;
  embeddingPipeline: EmbeddingPipeline;
  hybridSearch: HybridSearchEngine;
  ragPipeline: RagPipeline;
  searchConfigRepo: SearchConfigRepository;
  followUpGenerator: FollowUpGenerator;
  reportGenerator: ReportGenerator;
  exportService: ExportService;
  reportScheduler: ReportScheduler;
  dataPlatformProvider: DataPlatformProvider;
  agentToolkit: AgentToolkit;
}

export function createServices(
  config: AppConfig,
  repos: Repositories,
  db: LocalDatabase,
  getMainWindow: () => BrowserWindow | null,
): Services {
  const openaiProvider = new OpenAiProvider(config.openaiApiBaseUrl);
  const anthropicProvider = new AnthropicProvider(config.anthropicApiBaseUrl);
  const googleProvider = new GoogleProvider(config.googleApiBaseUrl);
  const copilotProvider = new CopilotProvider();
  const providers = [openaiProvider, anthropicProvider, googleProvider, copilotProvider];
  const providerResilience = new ProviderResilience();

  const skillRegistry = new SkillSourceRegistry(
    repos.vaultRepo,
    repos.analysisRepo,
    repos.configuredSourceRepo,
    repos.sourceDocumentRepo,
  );

  const chatRuntime = new ChatRuntime(
    providers,
    repos.secureStore,
    repos.sessionRepo,
    repos.messageRepo,
    repos.auditRepo,
    skillRegistry,
    providerResilience,
  );

  const oauthManager = new OAuthManager(repos.secureStore, repos.accountRepo, config);

  const localFolderLibrary = new LocalFolderSourceLibrary(
    repos.configuredSourceRepo,
    repos.sourceDocumentRepo,
  );
  const mcpConnector = new McpConnector(repos.configuredSourceRepo, repos.sourceDocumentRepo);
  const githubProvider = new GitHubSourceProvider(repos.configuredSourceRepo, repos.sourceDocumentRepo);

  const routineExecutor = new RoutineExecutor(
    repos.routineTemplateRepo,
    repos.routineExecutionRepo,
    repos.closingPlanRepo,
    repos.closingStepRepo,
  );

  const routineScheduler = new RoutineScheduler(
    repos.scheduledTaskRepo,
    repos.scheduleLogRepo,
    routineExecutor,
    getMainWindow,
  );

  const agentExecutor = new AgentExecutor(chatRuntime, skillRegistry, repos.agentExecutionRepo, getMainWindow);

  const cboAnalyzer = new CboAnalyzer(providers, repos.secureStore, providerResilience);
  const cboBatchRuntime = new CboBatchRuntime(
    cboAnalyzer,
    repos.analysisRepo,
    config.backendApiBaseUrl,
    repos.vaultRepo,
  );

  const gmailProvider = new GmailMcpProvider(mcpConnector);
  const outlookProvider = new OutlookGraphProvider(repos.secureStore, config);
  const emailProviders = [gmailProvider, outlookProvider];

  const emailManager = new EmailManager(
    emailProviders,
    repos.emailInboxRepo,
    repos.emailTaskLinkRepo,
    repos.closingPlanRepo,
    repos.closingStepRepo,
    chatRuntime,
    repos.secureStore,
  );

  const codeAnalyzer = new CodeAnalyzer(
    providers,
    repos.secureStore,
    providerResilience,
    repos.codeAnalysisRepo,
    repos.sourceDocumentRepo,
  );

  // ─── v8.0: 벡터 임베딩 + RAG + 리포트 ───
  const embeddingCache = new EmbeddingCache(db);
  const embeddingService = new EmbeddingService(repos.secureStore, providerResilience);
  embeddingService.setCache(embeddingCache);
  const documentChunker = new DocumentChunker();
  const documentImporter = new DocumentImporter();
  const embeddingPipeline = new EmbeddingPipeline(
    documentChunker,
    embeddingService,
    repos.chunkRepo,
    repos.sourceDocumentRepo,
    documentImporter,
    repos.configuredSourceRepo,
  );

  const hybridSearch = new HybridSearchEngine(embeddingService, repos.chunkRepo);
  const ragPipeline = new RagPipeline(hybridSearch);
  const searchConfigRepo = new SearchConfigRepository(db);
  const followUpGenerator = new FollowUpGenerator();

  // ChatRuntime에 RAG 파이프라인 주입 (순환 의존 방지를 위한 setter 주입)
  chatRuntime.setRagPipeline(ragPipeline);
  const reportGenerator = new ReportGenerator(hybridSearch, providers, repos.secureStore, providerResilience);
  const exportService = new ExportService();
  const reportScheduler = new ReportScheduler(db, reportGenerator, repos.reportRepo, getMainWindow);

  // ─── v9.0: Data Platform + Agent Tool-Use ───
  const dataPlatformProvider = new DataPlatformProvider(repos.configuredSourceRepo, repos.sourceDocumentRepo);
  const agentToolkit = new AgentToolkit(hybridSearch, repos.sourceDocumentRepo, embeddingPipeline, repos.configuredSourceRepo);

  return {
    oauthManager,
    chatRuntime,
    cboAnalyzer,
    cboBatchRuntime,
    skillRegistry,
    localFolderLibrary,
    mcpConnector,
    routineExecutor,
    routineScheduler,
    agentExecutor,
    emailManager,
    codeAnalyzer,
    githubProvider,
    embeddingService,
    embeddingCache,
    embeddingPipeline,
    hybridSearch,
    ragPipeline,
    searchConfigRepo,
    followUpGenerator,
    reportGenerator,
    exportService,
    reportScheduler,
    dataPlatformProvider,
    agentToolkit,
  };
}
