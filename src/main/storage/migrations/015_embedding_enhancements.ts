import type { Migration } from "../migrationRunner.js";

/**
 * 015: 임베딩 성능 개선.
 *
 * - embedding_cache: 임베딩 API 캐시 (content_hash + model 기반)
 */
export const migration015: Migration = {
  version: 15,
  name: "embedding_enhancements",
  up(db) {
    // ─── 임베딩 캐시 테이블 ───
    db.exec(`
      CREATE TABLE IF NOT EXISTS embedding_cache (
        content_hash TEXT NOT NULL,
        model TEXT NOT NULL,
        embedding BLOB NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (content_hash, model)
      );

      CREATE INDEX IF NOT EXISTS idx_embedding_cache_created
      ON embedding_cache(created_at DESC);
    `);
  },
};
