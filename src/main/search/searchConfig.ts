import { randomUUID } from "node:crypto";
import type { LocalDatabase } from "../storage/sqlite.js";
import { nowIso } from "../storage/repositories/utils.js";

export interface SearchConfig {
  topK: number;
  vectorWeight: number;
  keywordWeight: number;
  enableRecencyBoost: boolean;
  recencyBoostDays: number;
  enableDedup: boolean;
  dedupThreshold: number;
  minScore: number;
}

export interface SearchAnalyticsEntry {
  id: string;
  query: string;
  resultCount: number;
  topScore: number;
  executionMs: number;
  createdAt: string;
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  topK: 5,
  vectorWeight: 0.7,
  keywordWeight: 0.3,
  enableRecencyBoost: true,
  recencyBoostDays: 7,
  enableDedup: true,
  dedupThreshold: 0.85,
  minScore: 0.01,
};

export class SearchConfigRepository {
  constructor(private readonly db: LocalDatabase) {}

  get(): SearchConfig {
    try {
      const row = this.db.prepare(
        "SELECT value_json FROM search_config WHERE key = ?"
      ).get("default") as { value_json: string } | undefined;

      if (row) {
        return JSON.parse(row.value_json);
      }
    } catch {
      // Fall through to default
    }
    return { ...DEFAULT_SEARCH_CONFIG };
  }

  set(config: Partial<SearchConfig>): void {
    const existing = this.get();
    const updated = { ...existing, ...config };
    const valueJson = JSON.stringify(updated);

    const existing_row = this.db.prepare(
      "SELECT key FROM search_config WHERE key = ?"
    ).get("default");

    if (existing_row) {
      this.db.prepare(
        "UPDATE search_config SET value_json = ? WHERE key = ?"
      ).run(valueJson, "default");
    } else {
      this.db.prepare(
        "INSERT INTO search_config (key, value_json) VALUES (?, ?)"
      ).run("default", valueJson);
    }
  }

  logAnalytics(entry: SearchAnalyticsEntry): void {
    this.db.prepare(
      `INSERT INTO search_analytics (id, query, result_count, top_score, execution_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      entry.id,
      entry.query,
      entry.resultCount,
      entry.topScore,
      entry.executionMs,
      entry.createdAt
    );
  }

  listAnalytics(limit = 100): SearchAnalyticsEntry[] {
    return this.db.prepare(
      `SELECT id, query, result_count, top_score, execution_ms, created_at
       FROM search_analytics
       ORDER BY created_at DESC
       LIMIT ?`
    ).all(limit) as SearchAnalyticsEntry[];
  }
}
