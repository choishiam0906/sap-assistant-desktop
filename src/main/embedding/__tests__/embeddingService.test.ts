import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

import { EmbeddingService } from "../embeddingService.js";
import type { SecureStore } from "../../auth/secureStore.js";

// SecureStore 모킹
function createMockSecureStore(hasToken = true): SecureStore {
  return {
    get: vi.fn().mockResolvedValue(
      hasToken ? { accessToken: "test-api-key", refreshToken: null, expiresAt: null } : null,
    ),
    save: vi.fn(),
    delete: vi.fn(),
  } as unknown as SecureStore;
}

// fetch 모킹 헬퍼
function mockFetchSuccess(embeddings: number[][]) {
  const data = embeddings.map((embedding, index) => ({ embedding, index }));
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data }),
  });
}

function mockFetchError(status: number, body: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
}

describe("EmbeddingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getModelInfo", () => {
    it("모델 정보를 반환한다", () => {
      const service = new EmbeddingService(createMockSecureStore());
      const info = service.getModelInfo();

      expect(info.model).toBe("text-embedding-3-small");
      expect(info.dimensions).toBe(1536);
    });
  });

  describe("embed", () => {
    it("빈 배열 입력 시 빈 배열을 반환한다", async () => {
      const service = new EmbeddingService(createMockSecureStore());
      const result = await service.embed([]);
      expect(result).toEqual([]);
    });

    it("API를 호출하여 임베딩을 반환한다", async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
      mockFetchSuccess(mockEmbeddings);

      const service = new EmbeddingService(createMockSecureStore());
      const result = await service.embed(["hello", "world"]);

      expect(result).toEqual(mockEmbeddings);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/embeddings",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        }),
      );
    });

    it("API 키가 없으면 에러를 던진다", async () => {
      const service = new EmbeddingService(createMockSecureStore(false));

      await expect(service.embed(["test"])).rejects.toThrow(
        "OpenAI API 키가 설정되지 않았어요",
      );
    });

    it("API 에러 시 에러를 던진다", async () => {
      mockFetchError(429, "Rate limit exceeded");

      const service = new EmbeddingService(createMockSecureStore());

      await expect(service.embed(["test"])).rejects.toThrow(
        "임베딩 API 에러 (429)",
      );
    });

    it("응답의 index 순서에 따라 정렬한다", async () => {
      // 역순으로 반환되는 API 응답 시뮬레이션
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { embedding: [0.4, 0.5], index: 1 },
              { embedding: [0.1, 0.2], index: 0 },
            ],
          }),
      });

      const service = new EmbeddingService(createMockSecureStore());
      const result = await service.embed(["first", "second"]);

      // index 0이 먼저 와야 함
      expect(result[0]).toEqual([0.1, 0.2]);
      expect(result[1]).toEqual([0.4, 0.5]);
    });
  });

  describe("embedBatch", () => {
    it("빈 배열 입력 시 빈 배열을 반환한다", async () => {
      const service = new EmbeddingService(createMockSecureStore());
      const result = await service.embedBatch([]);
      expect(result).toEqual([]);
    });

    it("batchSize에 맞게 분할하여 호출한다", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        const embedding = callCount === 1
          ? [{ embedding: [0.1], index: 0 }, { embedding: [0.2], index: 1 }]
          : [{ embedding: [0.3], index: 0 }];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: embedding }),
        });
      });

      const service = new EmbeddingService(createMockSecureStore());
      const result = await service.embedBatch(["a", "b", "c"], 2);

      expect(result).toHaveLength(3);
      expect(global.fetch).toHaveBeenCalledTimes(2); // 2개 + 1개 = 2번 호출
    });
  });
});
