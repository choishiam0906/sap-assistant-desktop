import type { Migration } from "../migrationRunner.js";

/**
 * 011: 누락 인덱스 보강.
 *
 * 탐색 결과 FK 컬럼과 빈번한 WHERE/JOIN 패턴에 인덱스가 없는 케이스를 보강한다.
 * LIKE '%keyword%' 패턴은 B-tree 인덱스로 커버 불가 → FTS5는 별도 마이그레이션으로 분리.
 */
export const migration011: Migration = {
  version: 11,
  name: "add_missing_indexes",
  up(db) {
    db.exec(`
      -- FK: email_task_links.email_id (JOIN email_inbox)
      CREATE INDEX IF NOT EXISTS idx_email_task_links_email
      ON email_task_links (email_id);

      -- FK: code_analysis_results.document_id (JOIN source_documents)
      CREATE INDEX IF NOT EXISTS idx_code_analysis_results_doc
      ON code_analysis_results (document_id);

      -- source_documents.classification (WHERE classification = ?)
      CREATE INDEX IF NOT EXISTS idx_source_documents_classification
      ON source_documents (classification);

      -- closing_steps: deadline + status 복합 쿼리 (WHERE deadline < ? AND status != 'completed')
      CREATE INDEX IF NOT EXISTS idx_closing_steps_deadline_status
      ON closing_steps (deadline, status);

      -- sessions: provider 기반 필터링
      CREATE INDEX IF NOT EXISTS idx_sessions_provider
      ON sessions (provider);

      -- email_inbox: from_email 기반 검색
      CREATE INDEX IF NOT EXISTS idx_email_inbox_from
      ON email_inbox (from_email);
    `);
  },
};
