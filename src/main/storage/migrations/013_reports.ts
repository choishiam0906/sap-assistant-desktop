import type { Migration } from "../migrationRunner.js";

/**
 * 013: 리포트 템플릿 + 실행 이력 테이블.
 */
export const migration013: Migration = {
  version: 13,
  name: "reports",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        sections_json TEXT NOT NULL,
        output_format TEXT NOT NULL DEFAULT 'pdf',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS report_runs (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        result_json TEXT,
        output_path TEXT,
        started_at TEXT,
        completed_at TEXT,
        FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_report_runs_template
      ON report_runs (template_id, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_report_runs_status
      ON report_runs (status);
    `);
  },
};
