import type { Migration } from "../migrationRunner.js";

/**
 * 016: 리포트 스케줄 테이블.
 */
export const migration016: Migration = {
  version: 16,
  name: "report_schedules",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS report_schedules (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        params_json TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_run_at TEXT,
        next_run_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_report_schedules_active
      ON report_schedules(is_active);
    `);
  },
};
