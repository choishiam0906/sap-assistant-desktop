/**
 * AgentToolkit — 에이전트가 실행 중 사용할 수 있는 도구 모음
 *
 * ReAct 패턴: Thought → Action → Observation → ... → Final Answer
 * 각 도구는 이름, 설명, 파라미터 스키마, 실행 함수로 구성됨
 */

import type { HybridSearchEngine } from "../search/hybridSearch.js";
import type { SourceDocumentRepository, ConfiguredSourceRepository } from "../storage/repositories/index.js";
import type { EmbeddingPipeline } from "../embedding/embeddingPipeline.js";
import { logger } from "../logger.js";

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, unknown>) => Promise<string>;
}

export interface AgentToolResult {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  durationMs: number;
}

export class AgentToolkit {
  private readonly tools = new Map<string, AgentTool>();

  constructor(
    private readonly hybridSearch: HybridSearchEngine,
    private readonly sourceDocRepo: SourceDocumentRepository,
    private readonly embeddingPipeline: EmbeddingPipeline,
    private readonly configuredSourceRepo: ConfiguredSourceRepository,
  ) {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools(): void {
    // 도구 1: search_knowledge — 하이브리드 검색
    this.tools.set("search_knowledge", {
      name: "search_knowledge",
      description:
        "지식 베이스에서 쿼리와 관련된 문서를 하이브리드 검색 (벡터 + 키워드 RRF) 합니다.",
      parameters: {
        query: { type: "string", description: "검색 쿼리", required: true },
        topK: { type: "number", description: "반환할 상위 결과 수 (기본: 5)" },
      },
      execute: async (params) => {
        const query = params.query as string;
        const topK = (params.topK as number) || 5;

        if (!query || query.trim().length === 0) {
          return JSON.stringify({ error: "쿼리가 비어있어요" });
        }

        try {
          const results = await this.hybridSearch.hybridSearch(query, { topK });
          if (results.length === 0) {
            return JSON.stringify({ results: [], message: "검색 결과가 없어요" });
          }

          return JSON.stringify({
            results: results.map((r) => ({
              chunkId: r.chunkId,
              documentId: r.documentId,
              title: r.documentTitle || "제목 없음",
              snippet: r.chunkText.substring(0, 200),
              score: r.score.toFixed(4),
              source: r.relativePath || "알 수 없음",
            })),
            totalResults: results.length,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ query, error: message }, "search_knowledge 실행 실패");
          return JSON.stringify({ error: `검색 중 오류: ${message}` });
        }
      },
    });

    // 도구 2: get_document — 문서 상세 조회
    this.tools.set("get_document", {
      name: "get_document",
      description: "문서 ID로 문서의 전체 내용을 조회합니다.",
      parameters: {
        documentId: { type: "string", description: "조회할 문서 ID", required: true },
      },
      execute: async (params) => {
        const documentId = params.documentId as string;

        if (!documentId || documentId.trim().length === 0) {
          return JSON.stringify({ error: "문서 ID가 비어있어요" });
        }

        try {
          const doc = this.sourceDocRepo.getById(documentId);
          if (!doc) {
            return JSON.stringify({ error: `문서를 찾을 수 없어요: ${documentId}` });
          }

          return JSON.stringify({
            documentId: doc.id,
            title: doc.title,
            source: doc.relativePath || "알 수 없음",
            content: doc.contentText.substring(0, 2000), // 처음 2000자만
            contentLength: doc.contentText.length,
            indexedAt: doc.indexedAt,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ documentId, error: message }, "get_document 실행 실패");
          return JSON.stringify({ error: `문서 조회 중 오류: ${message}` });
        }
      },
    });

    // 도구 3: list_sources — 설정된 소스 목록
    this.tools.set("list_sources", {
      name: "list_sources",
      description: "현재 설정된 모든 소스 (나폴더, MCP 등)를 나열합니다.",
      parameters: {},
      execute: async () => {
        try {
          const sources = this.configuredSourceRepo.list();
          if (sources.length === 0) {
            return JSON.stringify({ sources: [], message: "설정된 소스가 없어요" });
          }

          return JSON.stringify({
            sources: sources.map((s) => ({
              id: s.id,
              title: s.title,
              kind: s.kind,
              enabled: s.enabled,
              documentCount: s.documentCount ?? 0,
            })),
            totalSources: sources.length,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ error: message }, "list_sources 실행 실패");
          return JSON.stringify({ error: `소스 목록 조회 중 오류: ${message}` });
        }
      },
    });

    // 도구 4: analyze_text — 텍스트 분석 (키워드 추출, 요약)
    this.tools.set("analyze_text", {
      name: "analyze_text",
      description: "텍스트에서 키워드를 추출하거나 요약합니다.",
      parameters: {
        text: { type: "string", description: "분석할 텍스트", required: true },
        action: {
          type: "string",
          description: "'keywords' (키워드 추출) 또는 'summarize' (요약)",
          required: true,
        },
      },
      execute: async (params) => {
        const text = params.text as string;
        const action = params.action as string;

        if (!text || text.trim().length === 0) {
          return JSON.stringify({ error: "텍스트가 비어있어요" });
        }

        if (action !== "keywords" && action !== "summarize") {
          return JSON.stringify({
            error: "action은 'keywords' 또는 'summarize'여야 해요",
          });
        }

        try {
          if (action === "keywords") {
            // 간단한 키워드 추출: 공백으로 분리하고 길이 5 이상인 단어 추출
            const words = text
              .split(/\s+/)
              .filter((w) => w.length >= 5)
              .slice(0, 20);

            return JSON.stringify({
              action: "keywords",
              keywords: [...new Set(words)], // 중복 제거
              count: new Set(words).size,
            });
          } else {
            // 간단한 요약: 처음 300자
            const summary = text.substring(0, 300);
            const isTruncated = text.length > 300;

            return JSON.stringify({
              action: "summarize",
              summary,
              originalLength: text.length,
              isTruncated,
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ action, error: message }, "analyze_text 실행 실패");
          return JSON.stringify({ error: `분석 중 오류: ${message}` });
        }
      },
    });
  }

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  listTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolDescriptions(): string {
    const descriptions = this.listTools().map((tool) => {
      const paramsList = Object.entries(tool.parameters)
        .map(([name, spec]) => {
          const required = spec.required ? "(필수)" : "(선택)";
          return `  - ${name} (${spec.type}) ${required}: ${spec.description}`;
        })
        .join("\n");

      return `- **${tool.name}**: ${tool.description}\n${paramsList || "  파라미터 없음"}`;
    });

    return descriptions.join("\n\n");
  }

  async executeTool(
    name: string,
    params: Record<string, unknown>,
  ): Promise<AgentToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`도구를 찾을 수 없어요: ${name}`);
    }

    try {
      const output = await tool.execute(params);
      const durationMs = Date.now() - startTime;

      return {
        tool: name,
        input: params,
        output,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      return {
        tool: name,
        input: params,
        output: JSON.stringify({ error: errorMessage }),
        durationMs,
      };
    }
  }
}
