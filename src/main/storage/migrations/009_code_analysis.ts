import type { Migration } from "../migrationRunner.js";

/**
 * 009: Code Analysis Runs + Results
 *
 * MCP Source를 통해 색인된 코드 파일의 LLM 기반
 * 품질/리스크 분석 결과를 저장한다.
 */
export const migration009: Migration = {
  version: 9,
  name: "code_analysis",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS code_analysis_runs (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        total_files INTEGER DEFAULT 0,
        analyzed_files INTEGER DEFAULT 0,
        risks_found INTEGER DEFAULT 0,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (source_id) REFERENCES configured_sources(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS code_analysis_results (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        language TEXT,
        risks_json TEXT DEFAULT '[]',
        recommendations_json TEXT DEFAULT '[]',
        complexity_score REAL,
        analyzed_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES code_analysis_runs(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES source_documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_code_analysis_runs_source
        ON code_analysis_runs(source_id, started_at DESC);

      CREATE INDEX IF NOT EXISTS idx_code_analysis_results_run
        ON code_analysis_results(run_id);
    `);
  },
};
