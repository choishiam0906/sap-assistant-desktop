import { randomUUID } from "node:crypto";

import type { LocalDatabase } from "../sqlite.js";
import { nowIso, parseStringArray } from "./utils.js";

// ─── Email Inbox Types ───

export interface EmailInbox {
  id: string;
  sourceId: string;
  providerMessageId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  labels: string[];
  isProcessed: boolean;
  createdAt: string;
}

export interface EmailInboxInput {
  sourceId: string;
  providerMessageId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  labels?: string[];
}

interface EmailInboxRow {
  id: string;
  sourceId: string;
  providerMessageId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string;
  receivedAt: string;
  labelsJson: string;
  isProcessed: number;
  createdAt: string;
}

function toEmailInbox(row: EmailInboxRow): EmailInbox {
  return {
    id: row.id,
    sourceId: row.sourceId,
    providerMessageId: row.providerMessageId,
    fromEmail: row.fromEmail,
    fromName: row.fromName ?? undefined,
    subject: row.subject,
    bodyText: row.bodyText,
    receivedAt: row.receivedAt,
    labels: parseStringArray(row.labelsJson),
    isProcessed: row.isProcessed === 1,
    createdAt: row.createdAt,
  };
}

export class EmailInboxRepository {
  constructor(private readonly db: LocalDatabase) {}

  list(options?: { limit?: number; unprocessedOnly?: boolean }): EmailInbox[] {
    const limit = options?.limit ?? 50;
    const where = options?.unprocessedOnly ? "WHERE is_processed = 0" : "";
    const rows = this.db
      .prepare(
        `SELECT id, source_id AS sourceId, provider_message_id AS providerMessageId,
                from_email AS fromEmail, from_name AS fromName,
                subject, body_text AS bodyText, received_at AS receivedAt,
                labels_json AS labelsJson, is_processed AS isProcessed,
                created_at AS createdAt
         FROM email_inbox
         ${where}
         ORDER BY received_at DESC
         LIMIT ?`
      )
      .all(limit) as EmailInboxRow[];
    return rows.map(toEmailInbox);
  }

  getById(id: string): EmailInbox | null {
    const row = this.db
      .prepare(
        `SELECT id, source_id AS sourceId, provider_message_id AS providerMessageId,
                from_email AS fromEmail, from_name AS fromName,
                subject, body_text AS bodyText, received_at AS receivedAt,
                labels_json AS labelsJson, is_processed AS isProcessed,
                created_at AS createdAt
         FROM email_inbox
         WHERE id = ?`
      )
      .get(id) as EmailInboxRow | undefined;
    return row ? toEmailInbox(row) : null;
  }

  findByProviderMessageId(providerMessageId: string): EmailInbox | null {
    const row = this.db
      .prepare(
        `SELECT id, source_id AS sourceId, provider_message_id AS providerMessageId,
                from_email AS fromEmail, from_name AS fromName,
                subject, body_text AS bodyText, received_at AS receivedAt,
                labels_json AS labelsJson, is_processed AS isProcessed,
                created_at AS createdAt
         FROM email_inbox
         WHERE provider_message_id = ?`
      )
      .get(providerMessageId) as EmailInboxRow | undefined;
    return row ? toEmailInbox(row) : null;
  }

  create(input: EmailInboxInput): EmailInbox {
    const id = randomUUID();
    const now = nowIso();
    const labelsJson = JSON.stringify(input.labels ?? []);

    this.db
      .prepare(
        `INSERT INTO email_inbox(id, source_id, provider_message_id, from_email, from_name,
                                  subject, body_text, received_at, labels_json, is_processed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        id,
        input.sourceId,
        input.providerMessageId,
        input.fromEmail,
        input.fromName ?? null,
        input.subject,
        input.bodyText,
        input.receivedAt,
        labelsJson,
        now,
      );

    return {
      id,
      sourceId: input.sourceId,
      providerMessageId: input.providerMessageId,
      fromEmail: input.fromEmail,
      fromName: input.fromName,
      subject: input.subject,
      bodyText: input.bodyText,
      receivedAt: input.receivedAt,
      labels: input.labels ?? [],
      isProcessed: false,
      createdAt: now,
    };
  }

  markProcessed(id: string): void {
    this.db
      .prepare(`UPDATE email_inbox SET is_processed = 1 WHERE id = ?`)
      .run(id);
  }
}

// ─── Email Task Links ───

export interface EmailTaskLink {
  id: string;
  emailId: string;
  planId: string;
  aiSummary?: string;
  createdAt: string;
}

export interface EmailTaskLinkInput {
  emailId: string;
  planId: string;
  aiSummary?: string;
}

interface EmailTaskLinkRow {
  id: string;
  emailId: string;
  planId: string;
  aiSummary: string | null;
  createdAt: string;
}

function toEmailTaskLink(row: EmailTaskLinkRow): EmailTaskLink {
  return {
    id: row.id,
    emailId: row.emailId,
    planId: row.planId,
    aiSummary: row.aiSummary ?? undefined,
    createdAt: row.createdAt,
  };
}

export class EmailTaskLinkRepository {
  constructor(private readonly db: LocalDatabase) {}

  create(input: EmailTaskLinkInput): EmailTaskLink {
    const id = randomUUID();
    const now = nowIso();

    this.db
      .prepare(
        `INSERT INTO email_task_links(id, email_id, plan_id, ai_summary, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, input.emailId, input.planId, input.aiSummary ?? null, now);

    return {
      id,
      emailId: input.emailId,
      planId: input.planId,
      aiSummary: input.aiSummary,
      createdAt: now,
    };
  }

  listByEmail(emailId: string): EmailTaskLink[] {
    const rows = this.db
      .prepare(
        `SELECT id, email_id AS emailId, plan_id AS planId,
                ai_summary AS aiSummary, created_at AS createdAt
         FROM email_task_links
         WHERE email_id = ?
         ORDER BY created_at DESC`
      )
      .all(emailId) as EmailTaskLinkRow[];
    return rows.map(toEmailTaskLink);
  }

  listByPlan(planId: string): EmailTaskLink[] {
    const rows = this.db
      .prepare(
        `SELECT id, email_id AS emailId, plan_id AS planId,
                ai_summary AS aiSummary, created_at AS createdAt
         FROM email_task_links
         WHERE plan_id = ?
         ORDER BY created_at DESC`
      )
      .all(planId) as EmailTaskLinkRow[];
    return rows.map(toEmailTaskLink);
  }
}
