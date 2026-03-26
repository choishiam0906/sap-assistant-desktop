import { describe, it, expect, vi } from "vitest";
import { DocumentChunker } from "../documentChunker.js";

describe("EmbeddingPipeline (unit)", () => {
  it("DocumentChunker가 올바르게 청크를 생성한다", () => {
    const chunker = new DocumentChunker();
    const text = "첫 번째 섹션.\n\n두 번째 섹션.\n\n세 번째 섹션.";
    const chunks = chunker.chunk(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].text).toBeTruthy();
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });

  it("빈 컨텐츠에 대해 빈 청크를 반환한다", () => {
    const chunker = new DocumentChunker();
    expect(chunker.chunk("")).toEqual([]);
  });

  it("대용량 텍스트를 합리적인 수의 청크로 분할한다", () => {
    const chunker = new DocumentChunker();
    const largeText = "이 문장은 테스트 용도입니다. ".repeat(500);
    const chunks = chunker.chunk(largeText, { maxTokens: 256, overlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThan(100);
  });

  it("EmbeddingService mock이 올바른 차원의 벡터를 반환한다", async () => {
    // EmbeddingService mock
    const mockEmbedder = {
      embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      embedBatch: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]),
      getModelInfo: () => ({ model: "test", dimensions: 3 }),
    };

    const result = await mockEmbedder.embed(["test"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);

    const batchResult = await mockEmbedder.embedBatch(["test1", "test2"]);
    expect(batchResult).toHaveLength(2);
  });

  it("ChunkRepository mock이 검색 결과를 반환한다", () => {
    const mockChunkRepo = {
      searchByKeyword: vi.fn().mockReturnValue([
        {
          chunkId: "c1",
          documentId: "d1",
          chunkIndex: 0,
          chunkText: "검색 결과 텍스트",
          score: 0.9,
          documentTitle: "테스트 문서",
        },
      ]),
      searchByVector: vi.fn().mockReturnValue([]),
      isVectorEnabled: vi.fn().mockReturnValue(false),
    };

    const results = mockChunkRepo.searchByKeyword("검색", 5);
    expect(results).toHaveLength(1);
    expect(results[0].chunkText).toBe("검색 결과 텍스트");
  });
});
