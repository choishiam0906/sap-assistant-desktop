import type Database from "better-sqlite3";
import type { Migration } from "../migrationRunner.js";

export const migration010: Migration = {
  version: 10,
  name: "email_provider",
  up(db: Database.Database) {
    db.exec(
      `ALTER TABLE email_inbox ADD COLUMN provider TEXT NOT NULL DEFAULT 'gmail'`,
    );
    db.exec(
      `CREATE INDEX idx_email_inbox_provider ON email_inbox(provider, received_at DESC)`,
    );
  },
};
