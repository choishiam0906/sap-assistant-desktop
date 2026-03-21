import type { Migration } from "../migrationRunner.js";

/**
 * 008: Email Inbox + Task Links
 *
 * Gmail MCP를 통해 가져온 메일을 로컬에 미러링하고,
 * 메일 ↔ Closing Plan 연결을 위한 테이블.
 */
export const migration008: Migration = {
  version: 8,
  name: "email_inbox",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_inbox (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        provider_message_id TEXT UNIQUE NOT NULL,
        from_email TEXT NOT NULL,
        from_name TEXT,
        subject TEXT NOT NULL,
        body_text TEXT NOT NULL,
        received_at TEXT NOT NULL,
        labels_json TEXT DEFAULT '[]',
        is_processed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_id) REFERENCES configured_sources(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS email_task_links (
        id TEXT PRIMARY KEY,
        email_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        ai_summary TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (email_id) REFERENCES email_inbox(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES closing_plans(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_email_inbox_processed
        ON email_inbox(is_processed, received_at DESC);

      CREATE INDEX IF NOT EXISTS idx_email_task_links_plan
        ON email_task_links(plan_id);
    `);
  },
};
