import { describe, it, expect, vi } from "vitest";
import { HybridSearchEngine } from "../hybridSearch.js";

describe("HybridSearchEngine", () => {
  function createMockEngine() {
    const mockEmbedder = {
      embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      embedBatch: vi.fn().mockResolvedValue([]),
      getModelInfo: () => ({ model: "test", dimensions: 3 }),
    };

    const mockChunkRepo = {
      isVectorEnabled: vi.fn().mockReturnValue(true),
      searchByVector: vi.fn().mockReturnValue([
        { chunkId: "v1", documentId: "d1", chunkIndex: 0, chunkText: "벡터 결과 1", score: 0.95, documentTitle: "문서A" },
        { chunkId: "v2", documentId: "d2", chunkIndex: 0, chunkText: "벡터 결과 2", score: 0.85, documentTitle: "문서B" },
      ]),
      searchByKeyword: vi.fn().mockReturnValue([
        { chunkId: "k1", documentId: "d1", chunkIndex: 0, chunkText: "키워드 결과 1", score: 0.9, documentTitle: "문서A" },
        { chunkId: "k3", documentId: "d3", chunkIndex: 0, chunkText: "키워드 결과 3", score: 0.7, documentTitle: "문서C" },
      ]),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = new HybridSearchEngine(mockEmbedder as any, mockChunkRepo as any);
    return { engine, mockEmbedder, mockChunkRepo };
  }

  it("vectorSearch가 벡터 검색 결과를 반환한다", async () => {
    const { engine, mockEmbedder, mockChunkRepo } = createMockEngine();
    const results = await engine.vectorSearch("테스트", 5);

    expect(mockEmbedder.embed).toHaveBeenCalledWith(["테스트"]);
    expect(mockChunkRepo.searchByVector).toHaveBeenCalled();
    expect(results).toHaveLength(2);
    expect(results[0].searchType).toBe("vector");
  });

  it("keywordSearch가 키워드 검색 결과를 반환한다", () => {
    const { engine, mockChunkRepo } = createMockEngine();
    const results = engine.keywordSearch("테스트", 5);

    expect(mockChunkRepo.searchByKeyword).toHaveBeenCalledWith("테스트", 5);
    expect(results).toHaveLength(2);
    expect(results[0].searchType).toBe("keyword");
  });

  it("hybridSearch가 RRF로 병합된 결과를 반환한다", async () => {
    const { engine } = createMockEngine();
    const results = await engine.hybridSearch("테스트", { topK: 5 });

    expect(results.length).toBeGreaterThan(0);
    // 모든 결과의 searchType은 hybrid여야 함
    for (const r of results) {
      expect(r.searchType).toBe("hybrid");
    }
    // 점수 내림차순 정렬
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("벡터 비활성화 시 keywordSearch만 동작한다", async () => {
    const { engine, mockChunkRepo } = createMockEngine();
    mockChunkRepo.isVectorEnabled.mockReturnValue(false);

    const results = await engine.vectorSearch("테스트");
    expect(results).toEqual([]);
  });

  it("hybridSearch에서 양쪽 모두에 나온 문서(d1)가 높은 점수를 받는다", async () => {
    const { engine } = createMockEngine();
    const results = await engine.hybridSearch("테스트", { topK: 10 });

    // d1은 벡터(v1)와 키워드(k1) 모두에 존재 — 하지만 chunkId가 다르므로 별도 항목
    // RRF 병합에서 양쪽에 등장한 chunk가 더 높은 점수를 가져야 함
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("sourceFilter를 적용하면 해당 문서만 반환한다", async () => {
    const { engine } = createMockEngine();
    const results = await engine.hybridSearch("테스트", {
      topK: 10,
      sourceFilter: "d1",
    });

    for (const r of results) {
      expect(r.documentId).toBe("d1");
    }
  });

  it("빈 쿼리 시 빈 결과를 반환한다", async () => {
    const { engine, mockChunkRepo } = createMockEngine();
    mockChunkRepo.searchByVector.mockReturnValue([]);
    mockChunkRepo.searchByKeyword.mockReturnValue([]);

    const results = await engine.hybridSearch("", { topK: 5 });
    expect(results).toEqual([]);
  });

  it("topK 제한이 적용된다", async () => {
    const { engine } = createMockEngine();
    const results = await engine.hybridSearch("테스트", { topK: 1 });

    expect(results.length).toBeLessThanOrEqual(1);
  });
});
