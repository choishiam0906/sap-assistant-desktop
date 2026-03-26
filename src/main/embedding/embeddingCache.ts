import type { LocalDatabase } from "../storage/sqlite.js";
import { nowIso } from "../storage/repositories/utils.js";

export class EmbeddingCache {
  constructor(private readonly db: LocalDatabase) {}

  get(contentHash: string, model: string): number[] | null {
    const row = this.db
      .prepare(
        "SELECT embedding FROM embedding_cache WHERE content_hash = ? AND model = ?",
      )
      .get(contentHash, model) as { embedding: Buffer } | undefined;

    if (!row) return null;

    // BLOB을 Buffer로 받아서 JSON 문자열로 파싱
    const json = row.embedding.toString("utf-8");
    return JSON.parse(json) as number[];
  }

  put(contentHash: string, model: string, embedding: number[]): void {
    const embeddingBlob = Buffer.from(JSON.stringify(embedding), "utf-8");
    const now = nowIso();

    this.db
      .prepare(
        `INSERT OR REPLACE INTO embedding_cache (content_hash, model, embedding, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(contentHash, model, embeddingBlob, now);
  }

  stats(): { totalEntries: number; sizeBytes: number } {
    const countRow = this.db
      .prepare("SELECT COUNT(*) AS cnt FROM embedding_cache")
      .get() as { cnt: number };

    const sizeRow = this.db
      .prepare("SELECT SUM(LENGTH(embedding)) AS total FROM embedding_cache")
      .get() as { total: number | null };

    return {
      totalEntries: countRow.cnt,
      sizeBytes: sizeRow.total ?? 0,
    };
  }

  clear(): void {
    this.db.prepare("DELETE FROM embedding_cache").run();
  }
}
