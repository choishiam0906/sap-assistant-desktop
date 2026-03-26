import type { Migration } from "../migrationRunner.js";

/**
 * 014: 검색 설정 및 분석 테이블.
 */
export const migration014: Migration = {
  version: 14,
  name: "search_config",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS search_config (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS search_analytics (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        result_count INTEGER NOT NULL,
        top_score REAL NOT NULL,
        execution_ms INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_search_analytics_created
      ON search_analytics(created_at DESC);
    `);
  },
};
