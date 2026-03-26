import { describe, it, expect, vi } from "vitest";
import { RagPipeline } from "../ragPipeline.js";

describe("RagPipeline", () => {
  function createMockPipeline() {
    const mockSearch = {
      hybridSearch: vi.fn().mockResolvedValue([
        {
          chunkId: "c1",
          documentId: "d1",
          chunkIndex: 0,
          chunkText: "SAP 트랜잭션 코드 SE38은 ABAP 에디터에요.",
          score: 0.9,
          searchType: "hybrid" as const,
          documentTitle: "SAP 기초 가이드",
          relativePath: "docs/sap-basics.md",
        },
        {
          chunkId: "c2",
          documentId: "d2",
          chunkIndex: 0,
          chunkText: "MM 모듈은 자재 관리를 담당해요.",
          score: 0.7,
          searchType: "hybrid" as const,
          documentTitle: "MM 모듈 개요",
        },
      ]),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline = new RagPipeline(mockSearch as any);
    return { pipeline, mockSearch };
  }

  it("buildContext가 검색 결과를 promptContext로 변환한다", async () => {
    const { pipeline } = createMockPipeline();
    const result = await pipeline.buildContext("SE38이 뭐에요?");

    expect(result.promptContext).toHaveLength(1);
    expect(result.promptContext[0]).toContain("관련 문서 컨텍스트");
    expect(result.promptContext[0]).toContain("SAP 트랜잭션 코드");
  });

  it("sources 배열이 chunkText를 200자 이내로 잘라낸다", async () => {
    const { pipeline } = createMockPipeline();
    const result = await pipeline.buildContext("SE38");

    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].documentTitle).toBe("SAP 기초 가이드");
    expect(result.sources[0].chunkText.length).toBeLessThanOrEqual(200);
  });

  it("검색 결과가 비어있으면 빈 컨텍스트를 반환한다", async () => {
    const { pipeline, mockSearch } = createMockPipeline();
    mockSearch.hybridSearch.mockResolvedValue([]);

    const result = await pipeline.buildContext("없는 내용");

    expect(result.promptContext).toEqual([]);
    expect(result.sources).toEqual([]);
    expect(result.searchResults).toEqual([]);
  });

  it("maxContextTokens 제한이 동작한다", async () => {
    const { pipeline, mockSearch } = createMockPipeline();
    // 매우 긴 청크 텍스트 mock
    mockSearch.hybridSearch.mockResolvedValue([
      {
        chunkId: "c1",
        documentId: "d1",
        chunkIndex: 0,
        chunkText: "A".repeat(5000),
        score: 0.9,
        searchType: "hybrid" as const,
        documentTitle: "긴 문서",
      },
      {
        chunkId: "c2",
        documentId: "d2",
        chunkIndex: 0,
        chunkText: "B".repeat(5000),
        score: 0.7,
        searchType: "hybrid" as const,
        documentTitle: "또 다른 긴 문서",
      },
    ]);

    const result = await pipeline.buildContext("테스트", { maxContextTokens: 500 });

    // 500 * 4 = 2000 char limit → 5000자 첫 번째만 통과 불가, 빈 결과 or 첫 번째만
    expect(result.searchResults.length).toBeLessThanOrEqual(1);
  });
});
