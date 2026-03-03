import { randomUUID } from "node:crypto";

import {
  ChatMessage,
  ChatSession,
  ProviderAccount,
  ProviderType,
} from "../contracts.js";
import { LocalDatabase } from "./sqlite.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class SessionRepository {
  constructor(private readonly db: LocalDatabase) {}

  list(limit = 50): ChatSession[] {
    const rows = this.db
      .prepare(
        `SELECT id, title, provider, model, created_at AS createdAt, updated_at AS updatedAt
         FROM sessions
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .all(limit) as ChatSession[];
    return rows;
  }

  getById(sessionId: string): ChatSession | null {
    const row = this.db
      .prepare(
        `SELECT id, title, provider, model, created_at AS createdAt, updated_at AS updatedAt
         FROM sessions WHERE id = ?`
      )
      .get(sessionId) as ChatSession | undefined;
    return row ?? null;
  }

  create(provider: ProviderType, model: string, title = "새 대화"): ChatSession {
    const now = nowIso();
    const session: ChatSession = {
      id: randomUUID(),
      title,
      provider,
      model,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO sessions(id, title, provider, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.title,
        session.provider,
        session.model,
        session.createdAt,
        session.updatedAt
      );
    return session;
  }

  touch(sessionId: string): void {
    this.db
      .prepare(
        `UPDATE sessions SET updated_at = ? WHERE id = ?`
      )
      .run(nowIso(), sessionId);
  }
}

export class MessageRepository {
  constructor(private readonly db: LocalDatabase) {}

  listBySession(sessionId: string, limit = 100): ChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id AS sessionId, role, content,
                input_tokens AS inputTokens, output_tokens AS outputTokens,
                created_at AS createdAt
         FROM messages
         WHERE session_id = ?
         ORDER BY created_at ASC
         LIMIT ?`
      )
      .all(sessionId, limit) as ChatMessage[];
    return rows;
  }

  append(
    sessionId: string,
    role: ChatMessage["role"],
    content: string,
    inputTokens = 0,
    outputTokens = 0
  ): ChatMessage {
    const message: ChatMessage = {
      id: randomUUID(),
      sessionId,
      role,
      content,
      inputTokens,
      outputTokens,
      createdAt: nowIso(),
    };
    this.db
      .prepare(
        `INSERT INTO messages(id, session_id, role, content, input_tokens, output_tokens, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        message.id,
        message.sessionId,
        message.role,
        message.content,
        message.inputTokens,
        message.outputTokens,
        message.createdAt
      );
    return message;
  }
}

export class ProviderAccountRepository {
  constructor(private readonly db: LocalDatabase) {}

  upsert(account: ProviderAccount): ProviderAccount {
    this.db
      .prepare(
        `INSERT INTO provider_accounts(provider, status, account_hint, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(provider) DO UPDATE SET
           status=excluded.status,
           account_hint=excluded.account_hint,
           updated_at=excluded.updated_at`
      )
      .run(
        account.provider,
        account.status,
        account.accountHint,
        account.updatedAt
      );
    return account;
  }

  get(provider: ProviderType): ProviderAccount | null {
    const row = this.db
      .prepare(
        `SELECT provider, status, account_hint AS accountHint, updated_at AS updatedAt
         FROM provider_accounts WHERE provider = ?`
      )
      .get(provider) as ProviderAccount | undefined;
    return row ?? null;
  }
}
