import type { Migration } from "../migrationRunner.js";

/**
 * 012: 벡터 임베딩 인프라.
 *
 * document_chunks — 문서 청크 텍스트 + 메타데이터
 * chunk_embeddings — sqlite-vec 가상 테이블 (1536차원 벡터)
 * document_chunks_fts — FTS5 전문 검색 가상 테이블
 */
export const migration012: Migration = {
  version: 12,
  name: "vector_embeddings",
  up(db) {
    // ─── 문서 청크 테이블 ───
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        token_count INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES source_documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_document_chunks_doc
      ON document_chunks (document_id, chunk_index);
    `);

    // ─── sqlite-vec 가상 테이블 (벡터 유사도 검색) ───
    // sqlite-vec 미설치 시 graceful skip
    try {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS chunk_embeddings USING vec0(
          chunk_id TEXT PRIMARY KEY,
          embedding float[1536]
        );
      `);
    } catch {
      // sqlite-vec 확장이 없으면 skip — 런타임에서 벡터 검색 비활성화
    }

    // ─── FTS5 전문 검색 가상 테이블 ───
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts
      USING fts5(chunk_text, content='document_chunks', content_rowid='rowid');
    `);

    // FTS5 트리거 — 청크 INSERT/DELETE 시 인덱스 동기화
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON document_chunks BEGIN
        INSERT INTO document_chunks_fts(rowid, chunk_text) VALUES (new.rowid, new.chunk_text);
      END;

      CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON document_chunks BEGIN
        INSERT INTO document_chunks_fts(document_chunks_fts, rowid, chunk_text)
        VALUES ('delete', old.rowid, old.chunk_text);
      END;

      CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON document_chunks BEGIN
        INSERT INTO document_chunks_fts(document_chunks_fts, rowid, chunk_text)
        VALUES ('delete', old.rowid, old.chunk_text);
        INSERT INTO document_chunks_fts(rowid, chunk_text) VALUES (new.rowid, new.chunk_text);
      END;
    `);
  },
};
