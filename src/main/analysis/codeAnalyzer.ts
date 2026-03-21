import type { ProviderType } from "../contracts.js";
import type { SecureStore } from "../auth/secureStore.js";
import type { LlmProvider } from "../providers/base.js";
import type { ProviderResilience } from "../providers/providerResilience.js";
import type { CodeAnalysisRepository } from "../storage/repositories/codeAnalysisRepository.js";
import type { SourceDocumentRepository } from "../storage/repositories/sourceRepository.js";
import type { CodeAnalysisRun, CodeAnalysisResult, CodeAnalysisRisk, CodeAnalysisRecommendation } from "../storage/repositories/codeAnalysisRepository.js";
import { buildCodeAnalysisPrompt, detectLanguage } from "./analysisPrompts.js";
import { logger } from "../logger.js";

interface AnalyzeLlmResponse {
  risks: CodeAnalysisRisk[];
  recommendations: CodeAnalysisRecommendation[];
  complexityScore: number;
}

export class CodeAnalyzer {
  private readonly providers: Map<ProviderType, LlmProvider>;

  constructor(
    providers: LlmProvider[],
    private readonly secureStore: SecureStore,
    private readonly resilience: ProviderResilience | undefined,
    private readonly codeAnalysisRepo: CodeAnalysisRepository,
    private readonly sourceDocumentRepo: SourceDocumentRepository,
  ) {
    this.providers = new Map(providers.map((p) => [p.type, p]));
  }

  /**
   * 특정 MCP Source의 모든 코드 파일을 분석한다.
   * source_documents에 이미 색인된 파일을 대상으로 LLM 분석 수행.
   */
  async analyzeSource(
    sourceId: string,
    providerType: ProviderType,
    model: string,
    onProgress?: (analyzed: number, total: number) => void,
  ): Promise<CodeAnalysisRun> {
    const documents = this.sourceDocumentRepo.search({ sourceId, limit: 1000 });
    // 코드 파일만 필터 (non-binary, non-config)
    const codeDocuments = documents.filter((doc) => {
      const lang = detectLanguage(doc.relativePath);
      return lang && lang !== "json" && lang !== "yaml" && lang !== "markdown";
    });

    const run = this.codeAnalysisRepo.createRun(sourceId, codeDocuments.length);

    try {
      for (const doc of codeDocuments) {
        try {
          const language = detectLanguage(doc.relativePath);
          const prompt = buildCodeAnalysisPrompt(doc.relativePath, doc.contentText, language);

          const llmResult = await this.callLlm(providerType, model, prompt);

          this.codeAnalysisRepo.createResult({
            runId: run.id,
            documentId: doc.id,
            filePath: doc.relativePath,
            language,
            risks: llmResult.risks,
            recommendations: llmResult.recommendations,
            complexityScore: llmResult.complexityScore,
          });

          this.codeAnalysisRepo.incrementRunProgress(run.id, llmResult.risks.length);
          onProgress?.(run.analyzedFiles + 1, run.totalFiles);
        } catch (err) {
          logger.warn({ filePath: doc.relativePath, err }, "파일 분석 실패, 건너뜀");
          this.codeAnalysisRepo.incrementRunProgress(run.id, 0);
        }
      }

      this.codeAnalysisRepo.completeRun(run.id, "completed");
    } catch (err) {
      this.codeAnalysisRepo.completeRun(run.id, "failed");
      throw err;
    }

    return this.codeAnalysisRepo.getRun(run.id) ?? run;
  }

  /** 단일 파일 분석 (document ID로 조회) */
  async analyzeFile(
    documentId: string,
    providerType: ProviderType,
    model: string,
  ): Promise<CodeAnalysisResult | null> {
    const doc = this.sourceDocumentRepo.getById(documentId);
    if (!doc) return null;

    const language = detectLanguage(doc.relativePath);
    const prompt = buildCodeAnalysisPrompt(doc.relativePath, doc.contentText, language);
    const llmResult = await this.callLlm(providerType, model, prompt);

    // 임시 run 생성 (단일 파일 분석용)
    const run = this.codeAnalysisRepo.createRun(doc.sourceId, 1);

    const result = this.codeAnalysisRepo.createResult({
      runId: run.id,
      documentId: doc.id,
      filePath: doc.relativePath,
      language,
      risks: llmResult.risks,
      recommendations: llmResult.recommendations,
      complexityScore: llmResult.complexityScore,
    });

    this.codeAnalysisRepo.incrementRunProgress(run.id, llmResult.risks.length);
    this.codeAnalysisRepo.completeRun(run.id, "completed");

    return result;
  }

  private async callLlm(
    providerType: ProviderType,
    model: string,
    prompt: string,
  ): Promise<AnalyzeLlmResponse> {
    const provider = this.providers.get(providerType);
    const token = await this.secureStore.get(providerType);
    if (!provider || !token?.accessToken) {
      throw new Error(`${providerType} 인증이 필요합니다.`);
    }

    const callFn = () => provider.sendMessage(token, {
      model,
      message: prompt,
      history: [],
    });

    const response = this.resilience
      ? await this.resilience.withProviderCall(providerType, callFn)
      : await callFn();

    return this.parseAnalysisResponse(response.content);
  }

  private parseAnalysisResponse(raw: string): AnalyzeLlmResponse {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as AnalyzeLlmResponse;
      return {
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        complexityScore: typeof parsed.complexityScore === "number" ? parsed.complexityScore : 0,
      };
    } catch {
      return { risks: [], recommendations: [], complexityScore: 0 };
    }
  }
}
