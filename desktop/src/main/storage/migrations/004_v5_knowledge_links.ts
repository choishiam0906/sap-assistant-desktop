import type Database from "better-sqlite3";
import type { Migration } from "../migrationRunner.js";

/**
 * v5.0 마이그레이션 004: routine_knowledge_links 테이블
 * 루틴 프로세스에 Vault/Source 문서를 연결하는 Knowledge Link 시스템.
 */
export const migration004: Migration = {
  version: 4,
  name: "v5_knowledge_links",
  up(db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS routine_knowledge_links (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT,
        location TEXT,
        classification TEXT,
        source_type TEXT,
        created_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_routine_knowledge_target
      ON routine_knowledge_links(template_id, target_type, target_id);

      CREATE INDEX IF NOT EXISTS idx_routine_knowledge_template
      ON routine_knowledge_links(template_id, created_at DESC);
    `);
  },
};
