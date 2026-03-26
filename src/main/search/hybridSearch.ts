import type { EmbeddingService } from "../embedding/embeddingService.js";
import type { DocumentChunkRepository } from "../storage/repositories/chunkRepository.js";

export interface SearchOptions {
  topK: number;
  vectorWeight: number;
  keywordWeight: number;
  sourceFilter?: string;
  minScore?: number;
  enableRecencyBoost?: boolean;
  recencyBoostDays?: number;
  enableDedup?: boolean;
  dedupThreshold?: number;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  score: number;
  documentTitle?: string;
  relativePath?: string;
  searchType: "vector" | "keyword" | "hybrid";
}

const DEFAULT_OPTIONS: SearchOptions = {
  topK: 5,
  vectorWeight: 0.7,
  keywordWeight: 0.3,
  minScore: 0,
};

/**
 * 벡터 유사도 + FTS5 키워드를 RRF(Reciprocal Rank Fusion)로 병합하는
 * 하이브리드 검색 엔진.
 *
 * RRF 공식: score(doc) = Σ 1/(k + rank_i(doc))
 * k=60 상수, rank=해당 검색에서의 순위
 */
export class HybridSearchEngine {
  constructor(
    private readonly embedder: EmbeddingService,
    private readonly chunkRepo: DocumentChunkRepository,
  ) {}

  /** 벡터 유사도 검색 */
  async vectorSearch(query: string, k = 10): Promise<SearchResult[]> {
    if (!this.chunkRepo.isVectorEnabled()) return [];

    const [queryEmbedding] = await this.embedder.embed([query]);
    const results = this.chunkRepo.searchByVector(queryEmbedding, k);

    return results.map((r) => ({
      ...r,
      searchType: "vector" as const,
    }));
  }

  /** FTS5 키워드 검색 */
  keywordSearch(query: string, k = 10): SearchResult[] {
    const results = this.chunkRepo.searchByKeyword(query, k);
    return results.map((r) => ({
      ...r,
      searchType: "keyword" as const,
    }));
  }

  /** RRF 병합 하이브리드 검색 */
  async hybridSearch(query: string, options?: Partial<SearchOptions>): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const fetchK = opts.topK * 3; // 병합 전 더 많이 가져옴

    // 벡터 + 키워드 병렬 실행
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, fetchK),
      Promise.resolve(this.keywordSearch(query, fetchK)),
    ]);

    // RRF 병합
    let merged = this.rrfMerge(vectorResults, keywordResults, opts);

    // 신경도 부스트 적용
    if (opts.enableRecencyBoost && opts.recencyBoostDays) {
      merged = this.applyRecencyBoost(merged, opts.recencyBoostDays);
    }

    // 문서별 중복 제거
    if (opts.enableDedup && opts.dedupThreshold) {
      merged = this.deduplicateByDocument(merged, opts.dedupThreshold);
    }

    // sourceFilter 적용 (documentId 기준)
    let filtered = merged;
    if (opts.sourceFilter) {
      filtered = filtered.filter((r) => r.documentId === opts.sourceFilter);
    }

    // minScore 필터
    if (opts.minScore && opts.minScore > 0) {
      filtered = filtered.filter((r) => r.score >= opts.minScore!);
    }

    return filtered.slice(0, opts.topK);
  }

  /**
   * RRF(Reciprocal Rank Fusion) 알고리즘.
   * 두 검색 결과의 순위를 역수 가중 합산하여 최종 순위 결정.
   */
  private rrfMerge(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    opts: SearchOptions,
  ): SearchResult[] {
    const K = 60; // RRF 상수
    const scoreMap = new Map<string, { result: SearchResult; score: number }>();

    // 벡터 검색 결과 점수 계산
    for (let rank = 0; rank < vectorResults.length; rank++) {
      const r = vectorResults[rank];
      const rrfScore = opts.vectorWeight / (K + rank + 1);
      const existing = scoreMap.get(r.chunkId);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scoreMap.set(r.chunkId, { result: { ...r, searchType: "hybrid" }, score: rrfScore });
      }
    }

    // 키워드 검색 결과 점수 합산
    for (let rank = 0; rank < keywordResults.length; rank++) {
      const r = keywordResults[rank];
      const rrfScore = opts.keywordWeight / (K + rank + 1);
      const existing = scoreMap.get(r.chunkId);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scoreMap.set(r.chunkId, { result: { ...r, searchType: "hybrid" }, score: rrfScore });
      }
    }

    // 점수 내림차순 정렬
    return [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .map(({ result, score }) => ({ ...result, score }));
  }

  private applyRecencyBoost(results: SearchResult[], boostDays: number): SearchResult[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - boostDays);
    const cutoffIso = cutoffDate.toISOString();

    return results.map((result) => {
      try {
        const metadata = JSON.parse(result.chunkText.includes("```")
          ? "{}"
          : result.chunkText.slice(0, 100)
        ) as Record<string, unknown> | undefined;

        if (metadata?.updatedAt && typeof metadata.updatedAt === "string") {
          if (metadata.updatedAt >= cutoffIso) {
            return { ...result, score: result.score * 1.3 };
          }
        }
      } catch {
        // metadata 파싱 실패 시 무시
      }
      return result;
    });
  }

  private deduplicateByDocument(results: SearchResult[], threshold: number): SearchResult[] {
    const byDocument = new Map<string, SearchResult[]>();

    for (const result of results) {
      if (!byDocument.has(result.documentId)) {
        byDocument.set(result.documentId, []);
      }
      byDocument.get(result.documentId)!.push(result);
    }

    const deduped: SearchResult[] = [];

    for (const chunks of byDocument.values()) {
      if (chunks.length <= 1) {
        deduped.push(...chunks);
        continue;
      }

      chunks.sort((a, b) => b.score - a.score);
      deduped.push(chunks[0]);

      for (let i = 1; i < chunks.length; i++) {
        const current = chunks[i];
        let isDuplicate = false;

        for (let j = 0; j < i; j++) {
          const prev = chunks[j];
          if (this.cosineSimilarity(current.chunkText, prev.chunkText) >= threshold) {
            isDuplicate = true;
            break;
          }
        }

        if (!isDuplicate) {
          deduped.push(current);
        }
      }
    }

    return deduped.sort((a, b) => b.score - a.score);
  }

  private cosineSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = [...tokens1].filter((t) => tokens2.has(t)).length;
    const union = tokens1.size + tokens2.size - intersection;

    return union === 0 ? 0 : intersection / union;
  }
}
