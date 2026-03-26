import { createHash } from "node:crypto";
import type { SecureStore } from "../auth/secureStore.js";
import type { ProviderResilience } from "../providers/providerResilience.js";
import type { EmbeddingCache } from "./embeddingCache.js";
import { logger } from "../logger.js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 2048;

export interface EmbeddingModelInfo {
  model: string;
  dimensions: number;
}

export class EmbeddingService {
  private cache?: EmbeddingCache;

  constructor(
    private readonly secureStore: SecureStore,
    private readonly resilience?: ProviderResilience,
  ) {}

  setCache(cache: EmbeddingCache): void {
    this.cache = cache;
  }

  getModelInfo(): EmbeddingModelInfo {
    return { model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS };
  }

  /** 단일 또는 소수 텍스트 임베딩 생성 */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return this.callEmbeddingApi(texts);
  }

  /** 대량 텍스트를 배치 분할하여 임베딩 생성 */
  async embedBatch(texts: string[], batchSize = MAX_BATCH_SIZE): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await this.callEmbeddingApiWithCache(batch);
      results.push(...embeddings);
    }
    return results;
  }

  private async callEmbeddingApiWithCache(texts: string[]): Promise<number[][]> {
    // 캐시가 없으면 직접 API 호출
    if (!this.cache) {
      return this.callEmbeddingApi(texts);
    }

    // 캐시된 임베딩과 캐시되지 않은 텍스트 분리
    const uncachedIndices: number[] = [];
    const cachedResults: Array<number[] | null> = [];

    for (let i = 0; i < texts.length; i++) {
      const hash = this.hashContent(texts[i]);
      const cached = this.cache.get(hash, EMBEDDING_MODEL);
      cachedResults.push(cached);
      if (!cached) {
        uncachedIndices.push(i);
      }
    }

    // 캐시되지 않은 텍스트만 API 호출
    let apiResults: number[][] = [];
    if (uncachedIndices.length > 0) {
      const uncachedTexts = uncachedIndices.map((i) => texts[i]);
      apiResults = await this.callEmbeddingApi(uncachedTexts);

      // API 결과를 캐시에 저장
      for (let j = 0; j < uncachedIndices.length; j++) {
        const textIndex = uncachedIndices[j];
        const hash = this.hashContent(texts[textIndex]);
        this.cache.put(hash, EMBEDDING_MODEL, apiResults[j]);
      }
    }

    // 결과 재조립
    let apiIndex = 0;
    return cachedResults.map((cached, i) => {
      if (cached) return cached;
      return apiResults[apiIndex++];
    });
  }

  private hashContent(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }

  private async callEmbeddingApi(texts: string[]): Promise<number[][]> {
    const token = await this.secureStore.get("openai");
    if (!token?.accessToken) {
      throw new Error("OpenAI API 키가 설정되지 않았어요. 설정에서 API 키를 등록해주세요.");
    }

    const callFn = async (): Promise<number[][]> => {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.accessToken}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: texts,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        logger.error({ status: res.status, body }, "임베딩 API 호출 실패");
        throw new Error(`임베딩 API 에러 (${res.status}): ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      // API 응답은 index 순서가 보장되지 않으므로 정렬
      return json.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    };

    return this.resilience
      ? this.resilience.withProviderCall("openai", callFn)
      : callFn();
  }
}
