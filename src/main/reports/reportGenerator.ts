import { randomUUID } from "node:crypto";

import type { HybridSearchEngine } from "../search/hybridSearch.js";
import type { LlmProvider } from "../providers/base.js";
import type { SecureStore } from "../auth/secureStore.js";
import type { ProviderResilience } from "../providers/providerResilience.js";
import type { ProviderType } from "../contracts.js";
import { logger } from "../logger.js";

// ─── Types ───

export interface TemplateSectionDef {
  title: string;
  prompt: string;
  dataSource?: "rag" | "static";
  ragQuery?: string;
  ragTopK?: number;
}

export interface ReportTemplate {
  id: string;
  title: string;
  description?: string;
  sections: TemplateSectionDef[];
  outputFormat: "pdf" | "excel" | "html";
  createdAt: string;
  updatedAt: string;
}

export interface ReportParams {
  provider: ProviderType;
  model: string;
  query?: string;
  variables?: Record<string, string>;
}

export interface ReportSection {
  title: string;
  content: string;
  sources?: Array<{ title: string; path?: string }>;
}

export interface Report {
  id: string;
  templateId: string;
  title: string;
  sections: ReportSection[];
  generatedAt: string;
}

// ─── Generator ───

export class ReportGenerator {
  private readonly providers: Map<ProviderType, LlmProvider>;

  constructor(
    private readonly search: HybridSearchEngine,
    providers: LlmProvider[],
    private readonly secureStore: SecureStore,
    private readonly resilience?: ProviderResilience,
  ) {
    this.providers = new Map(providers.map((p) => [p.type, p]));
  }

  async generate(
    template: ReportTemplate,
    params: ReportParams,
    onProgress?: (completed: number, total: number) => void,
    onSectionChunk?: (sectionIndex: number, chunk: string) => void,
  ): Promise<Report> {
    const report: Report = {
      id: randomUUID(),
      templateId: template.id,
      title: template.title,
      sections: [],
      generatedAt: new Date().toISOString(),
    };

    for (let i = 0; i < template.sections.length; i++) {
      const sectionDef = template.sections[i];
      try {
        const section = await this.generateSection(sectionDef, params);
        report.sections.push(section);
        onSectionChunk?.(i, section.content);
      } catch (err) {
        logger.warn({ section: sectionDef.title, err }, "리포트 섹션 생성 실패");
        const errorContent = `섹션 생성 중 오류가 발생했어요: ${err instanceof Error ? err.message : String(err)}`;
        report.sections.push({
          title: sectionDef.title,
          content: errorContent,
        });
        onSectionChunk?.(i, errorContent);
      }
      onProgress?.(i + 1, template.sections.length);
    }

    return report;
  }

  private async generateSection(
    sectionDef: TemplateSectionDef,
    params: ReportParams,
  ): Promise<ReportSection> {
    // RAG 컨텍스트 수집
    let ragContext = "";
    const sources: Array<{ title: string; path?: string }> = [];

    if (sectionDef.dataSource !== "static") {
      // 섹션별 RAG 쿼리가 있으면 사용, 없으면 전체 쿼리 사용
      const query = sectionDef.ragQuery || params.query;
      const topK = sectionDef.ragTopK || 5;

      if (query) {
        const searchResults = await this.search.hybridSearch(query, { topK });
        ragContext = searchResults
          .map((r, i) => `[참고 ${i + 1}: ${r.documentTitle || r.relativePath || "문서"}]\n${r.chunkText}`)
          .join("\n\n");
        sources.push(
          ...searchResults.map((r) => ({
            title: r.documentTitle || "알 수 없는 문서",
            path: r.relativePath,
          })),
        );
      }
    }

    // 프롬프트 구성 — {{}} 인젝션 방지: 선언된 변수만 치환
    let prompt = sectionDef.prompt;
    if (params.variables) {
      for (const [key, value] of Object.entries(params.variables)) {
        // 값에 포함된 {{}} 패턴 제거 (중첩 인젝션 방지)
        const safeValue = String(value).replace(/\{\{.*?\}\}/g, "");
        prompt = prompt.replaceAll(`{{${key}}}`, safeValue);
      }
    }
    // 미치환 변수 제거 (선언되지 않은 {{placeholder}} 잔존 방지)
    prompt = prompt.replace(/\{\{[^}]*\}\}/g, "");

    const fullPrompt = ragContext
      ? `${ragContext}\n\n---\n\n${prompt}\n\n위 참고 문서를 기반으로 "${sectionDef.title}" 섹션 내용을 작성해주세요. 한국어로 작성하고, 구조화된 형식으로 답변해주세요.`
      : `${prompt}\n\n"${sectionDef.title}" 섹션 내용을 작성해주세요. 한국어로 작성하고, 구조화된 형식으로 답변해주세요.`;

    // LLM 호출
    const content = await this.callLlm(params.provider, params.model, fullPrompt);

    return { title: sectionDef.title, content, sources };
  }

  private async callLlm(providerType: ProviderType, model: string, prompt: string): Promise<string> {
    const provider = this.providers.get(providerType);
    if (!provider) throw new Error(`프로바이더를 찾을 수 없어요: ${providerType}`);

    const token = await this.secureStore.get(providerType);
    if (!token?.accessToken) {
      throw new Error(`${providerType} 인증이 필요해요. 설정에서 API 키를 등록해주세요.`);
    }

    const callFn = () => provider.sendMessage(token, {
      model,
      message: prompt,
      history: [],
    });

    // 60초 타임아웃
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("LLM 응답 시간이 60초를 초과했어요")), 60_000),
    );

    const callPromise = this.resilience
      ? this.resilience.withProviderCall(providerType, callFn)
      : callFn();

    const result = await Promise.race([callPromise, timeout]);

    return result.content;
  }
}
