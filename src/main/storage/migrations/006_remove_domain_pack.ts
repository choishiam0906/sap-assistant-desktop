import type { Migration } from "../migrationRunner.js";

/**
 * 006: domain_pack 컬럼 완전 제거 (v6.2)
 *
 * DomainPack 시스템이 실제로 사용되지 않아 제거.
 * 4개 테이블에서 domain_pack 컬럼과 관련 인덱스를 삭제한다.
 *
 * better-sqlite3 v11.8 → SQLite 3.45+ → DROP COLUMN 지원.
 * 단, 인덱스에 포함된 컬럼은 먼저 인덱스를 삭제해야 함.
 */
export const migration006: Migration = {
  version: 6,
  name: "remove_domain_pack",
  up(db) {
    const safeDrop = (sql: string) => {
      try {
        db.exec(sql);
      } catch {
        // 컬럼이 존재하지 않으면 무시
      }
    };

    // 1. audit_logs — domain_pack (존재하면 삭제)
    safeDrop("ALTER TABLE audit_logs DROP COLUMN domain_pack");

    // 2. knowledge_vault — domain_pack + idx_vault_domain
    db.exec("DROP INDEX IF EXISTS idx_vault_domain");
    safeDrop("ALTER TABLE knowledge_vault DROP COLUMN domain_pack");

    // 3. configured_sources — domain_pack + 인덱스 재생성
    db.exec("DROP INDEX IF EXISTS idx_configured_sources_kind");
    safeDrop("ALTER TABLE configured_sources DROP COLUMN domain_pack");
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_configured_sources_kind
      ON configured_sources (kind, updated_at DESC)
    `);

    // 4. source_documents — domain_pack + idx_source_documents_domain
    db.exec("DROP INDEX IF EXISTS idx_source_documents_domain");
    safeDrop("ALTER TABLE source_documents DROP COLUMN domain_pack");
  },
};
