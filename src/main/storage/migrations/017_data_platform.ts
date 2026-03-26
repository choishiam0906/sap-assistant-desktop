import type { Migration } from "../migrationRunner.js";

/** 마이그레이션 017: Data Platform 소스 인덱스 추가 */
export const migration017: Migration = {
  version: 17,
  name: "Data Platform 소스 타입 인덱스",
  up(db) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_configured_sources_kind
        ON configured_sources(kind);
    `);
  },
};
