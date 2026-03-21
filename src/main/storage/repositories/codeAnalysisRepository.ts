import { randomUUID } from "node:crypto";

import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";

// ─── Code Analysis Run ───

export interface CodeAnalysisRun {
  id: string;
  sourceId: string;
  status: "running" | "completed" | "failed";
  totalFiles: number;
  analyzedFiles: number;
  risksFound: number;
  startedAt: string;
  completedAt?: string;
}

interface RunRow {
  id: string;
  sourceId: string;
  status: string;
  totalFiles: number;
  analyzedFiles: number;
  risksFound: number;
  startedAt: string;
  completedAt: string | null;
}

function toRun(row: RunRow): CodeAnalysisRun {
  return {
    id: row.id,
    sourceId: row.sourceId,
    status: row.status as CodeAnalysisRun["status"],
    totalFiles: row.totalFiles,
    analyzedFiles: row.analyzedFiles,
    risksFound: row.risksFound,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
  };
}

// ─── Code Analysis Result ───

export interface CodeAnalysisRisk {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  line?: number;
}

export interface CodeAnalysisRecommendation {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface CodeAnalysisResult {
  id: string;
  runId: string;
  documentId: string;
  filePath: string;
  language?: string;
  risks: CodeAnalysisRisk[];
  recommendations: CodeAnalysisRecommendation[];
  complexityScore?: number;
  analyzedAt: string;
}

export interface CodeAnalysisResultInput {
  runId: string;
  documentId: string;
  filePath: string;
  language?: string;
  risks: CodeAnalysisRisk[];
  recommendations: CodeAnalysisRecommendation[];
  complexityScore?: number;
}

interface ResultRow {
  id: string;
  runId: string;
  documentId: string;
  filePath: string;
  language: string | null;
  risksJson: string;
  recommendationsJson: string;
  complexityScore: number | null;
  analyzedAt: string;
}

function toResult(row: ResultRow): CodeAnalysisResult {
  let risks: CodeAnalysisRisk[] = [];
  let recommendations: CodeAnalysisRecommendation[] = [];
  try {
    risks = JSON.parse(row.risksJson) as CodeAnalysisRisk[];
  } catch { /* empty */ }
  try {
    recommendations = JSON.parse(row.recommendationsJson) as CodeAnalysisRecommendation[];
  } catch { /* empty */ }

  return {
    id: row.id,
    runId: row.runId,
    documentId: row.documentId,
    filePath: row.filePath,
    language: row.language ?? undefined,
    risks,
    recommendations,
    complexityScore: row.complexityScore ?? undefined,
    analyzedAt: row.analyzedAt,
  };
}

export class CodeAnalysisRepository {
  constructor(private readonly db: LocalDatabase) {}

  // ─── Runs ───

  createRun(sourceId: string, totalFiles: number): CodeAnalysisRun {
    const id = randomUUID();
    const now = nowIso();

    this.db
      .prepare(
        `INSERT INTO code_analysis_runs(id, source_id, status, total_files, analyzed_files, risks_found, started_at)
         VALUES (?, ?, 'running', ?, 0, 0, ?)`
      )
      .run(id, sourceId, totalFiles, now);

    return {
      id,
      sourceId,
      status: "running",
      totalFiles,
      analyzedFiles: 0,
      risksFound: 0,
      startedAt: now,
    };
  }

  completeRun(runId: string, status: "completed" | "failed"): void {
    const now = nowIso();
    this.db
      .prepare(
        `UPDATE code_analysis_runs SET status = ?, completed_at = ? WHERE id = ?`
      )
      .run(status, now, runId);
  }

  incrementRunProgress(runId: string, risksInFile: number): void {
    this.db
      .prepare(
        `UPDATE code_analysis_runs
         SET analyzed_files = analyzed_files + 1,
             risks_found = risks_found + ?
         WHERE id = ?`
      )
      .run(risksInFile, runId);
  }

  listRuns(sourceId?: string, limit = 20): CodeAnalysisRun[] {
    if (sourceId) {
      const rows = this.db
        .prepare(
          `SELECT id, source_id AS sourceId, status, total_files AS totalFiles,
                  analyzed_files AS analyzedFiles, risks_found AS risksFound,
                  started_at AS startedAt, completed_at AS completedAt
           FROM code_analysis_runs
           WHERE source_id = ?
           ORDER BY started_at DESC
           LIMIT ?`
        )
        .all(sourceId, limit) as RunRow[];
      return rows.map(toRun);
    }

    const rows = this.db
      .prepare(
        `SELECT id, source_id AS sourceId, status, total_files AS totalFiles,
                analyzed_files AS analyzedFiles, risks_found AS risksFound,
                started_at AS startedAt, completed_at AS completedAt
         FROM code_analysis_runs
         ORDER BY started_at DESC
         LIMIT ?`
      )
      .all(limit) as RunRow[];
    return rows.map(toRun);
  }

  getRun(runId: string): CodeAnalysisRun | null {
    const row = this.db
      .prepare(
        `SELECT id, source_id AS sourceId, status, total_files AS totalFiles,
                analyzed_files AS analyzedFiles, risks_found AS risksFound,
                started_at AS startedAt, completed_at AS completedAt
         FROM code_analysis_runs
         WHERE id = ?`
      )
      .get(runId) as RunRow | undefined;
    return row ? toRun(row) : null;
  }

  // ─── Results ───

  createResult(input: CodeAnalysisResultInput): CodeAnalysisResult {
    const id = randomUUID();
    const now = nowIso();

    this.db
      .prepare(
        `INSERT INTO code_analysis_results(id, run_id, document_id, file_path, language,
                                            risks_json, recommendations_json, complexity_score, analyzed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.runId,
        input.documentId,
        input.filePath,
        input.language ?? null,
        JSON.stringify(input.risks),
        JSON.stringify(input.recommendations),
        input.complexityScore ?? null,
        now,
      );

    return {
      id,
      runId: input.runId,
      documentId: input.documentId,
      filePath: input.filePath,
      language: input.language,
      risks: input.risks,
      recommendations: input.recommendations,
      complexityScore: input.complexityScore,
      analyzedAt: now,
    };
  }

  listResultsByRun(runId: string, limit = 500): CodeAnalysisResult[] {
    const rows = this.db
      .prepare(
        `SELECT id, run_id AS runId, document_id AS documentId, file_path AS filePath,
                language, risks_json AS risksJson, recommendations_json AS recommendationsJson,
                complexity_score AS complexityScore, analyzed_at AS analyzedAt
         FROM code_analysis_results
         WHERE run_id = ?
         ORDER BY file_path ASC
         LIMIT ?`
      )
      .all(runId, limit) as ResultRow[];
    return rows.map(toResult);
  }
}
