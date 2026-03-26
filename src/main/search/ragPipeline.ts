import type { HybridSearchEngine, SearchResult } from "./hybridSearch.js";

export interface SourceCitation {
  documentId: string;
  documentTitle?: string;
  relativePath?: string;
  chunkText: string;
  score: number;
}

export interface RagContext {
  /** ChatRuntime.composeMessage()에 주입할 컨텍스트 배열 */
  promptContext: string[];
  /** UI 출처 표시용 */
  sources: SourceCitation[];
  /** 원본 검색 결과 */
  searchResults: SearchResult[];
  status: "success" | "partial" | "failed" | "skipped";
  metrics?: {
    queryTimeMs: number;
    resultCount: number;
    contextTokens: number;
  };
}

export interface RagOptions {
  topK?: number;
  minScore?: number;
  maxContextTokens?: number;
}

const DEFAULT_RAG_OPTIONS: Required<RagOptions> = {
  topK: 5,
  minScore: 0.01,
  maxContextTokens: 3000,
};

/**
 * 사용자 질문 → 하이브리드 검색 → LLM promptContext 생성.
 * ChatRuntime의 composeMessage에 주입되어 RAG 응답을 가능하게 한다.
 */
export class RagPipeline {
  constructor(
    private readonly search: HybridSearchEngine,
  ) {}

  async buildContext(query: string, options?: RagOptions): Promise<RagContext> {
    const opts = { ...DEFAULT_RAG_OPTIONS, ...options };
    const startTime = Date.now();

    try {
      const searchResults = await this.search.hybridSearch(query, {
        topK: opts.topK,
        minScore: opts.minScore,
      });

      const queryTimeMs = Date.now() - startTime;

      if (searchResults.length === 0) {
        return {
          promptContext: [],
          sources: [],
          searchResults: [],
          status: "partial",
          metrics: { queryTimeMs, resultCount: 0, contextTokens: 0 },
        };
      }

      // 컨텍스트 토큰 제한 내에서 청크 선별
      const selectedResults: SearchResult[] = [];
      let totalChars = 0;
      const charLimit = opts.maxContextTokens * 4; // 대략적 토큰→문자 변환

      for (const result of searchResults) {
        if (totalChars + result.chunkText.length > charLimit) break;
        selectedResults.push(result);
        totalChars += result.chunkText.length;
      }

      // promptContext 구성
      const contextSections = selectedResults.map((r, i) => {
        const source = r.documentTitle || r.relativePath || "알 수 없는 문서";
        return `[참고 문서 ${i + 1}: ${source}]\n${r.chunkText}`;
      });

      const promptContext = contextSections.length > 0
        ? [`[관련 문서 컨텍스트]\n아래는 사용자 질문과 관련된 사내 문서 내용이에요. 이 정보를 참고하여 답변해주세요.\n\n${contextSections.join("\n\n---\n\n")}`]
        : [];

      // 출처 인용 정보
      const sources: SourceCitation[] = selectedResults.map((r) => ({
        documentId: r.documentId,
        documentTitle: r.documentTitle,
        relativePath: r.relativePath,
        chunkText: r.chunkText.slice(0, 200),
        score: r.score,
      }));

      const contextTokens = Math.ceil(totalChars / 4);

      return {
        promptContext,
        sources,
        searchResults: selectedResults,
        status: selectedResults.length > 0 ? "success" : "partial",
        metrics: { queryTimeMs, resultCount: selectedResults.length, contextTokens },
      };
    } catch (err) {
      const queryTimeMs = Date.now() - startTime;
      return {
        promptContext: [],
        sources: [],
        searchResults: [],
        status: "failed",
        metrics: { queryTimeMs, resultCount: 0, contextTokens: 0 },
      };
    }
  }
}
