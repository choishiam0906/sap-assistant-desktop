import { randomUUID } from "node:crypto";

import type { LocalDatabase } from "../sqlite.js";
import { nowIso } from "./utils.js";
import { logger } from "../../logger.js";

// ─── Types ───

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  metadataJson: string;
  createdAt: string;
}

export interface DocumentChunkInput {
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkSearchResult {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  score: number;
  /** source_documents.title */
  documentTitle?: string;
  /** source_documents.relative_path */
  relativePath?: string;
}

interface ChunkRow {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  metadataJson: string;
  createdAt: string;
}

function toChunk(row: ChunkRow): DocumentChunk {
  return {
    id: row.id,
    documentId: row.documentId,
    chunkIndex: row.chunkIndex,
    chunkText: row.chunkText,
    tokenCount: row.tokenCount,
    metadataJson: row.metadataJson,
    createdAt: row.createdAt,
  };
}

// ─── Repository ───

export class DocumentChunkRepository {
  private vectorEnabled = true;

  constructor(private readonly db: LocalDatabase) {
    // sqlite-vec 가용 여부 확인
    try {
      this.db.prepare("SELECT typeof(embedding) FROM chunk_embeddings LIMIT 0").get();
    } catch {
      this.vectorEnabled = false;
      logger.warn("sqlite-vec 확장을 사용할 수 없어요 — 키워드 검색만 동작해요");
    }
  }

  isVectorEnabled(): boolean {
    return this.vectorEnabled;
  }

  insertChunks(inputs: DocumentChunkInput[]): DocumentChunk[] {
    const insertChunk = this.db.prepare(
      `INSERT INTO document_chunks (id, document_id, chunk_index, chunk_text, token_count, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    const chunks: DocumentChunk[] = [];
    const now = nowIso();

    const runAll = this.db.transaction(() => {
      for (const input of inputs) {
        const id = randomUUID();
        const metaJson = JSON.stringify(input.metadata ?? {});

        insertChunk.run(id, input.documentId, input.chunkIndex, input.chunkText, input.tokenCount, metaJson, now);

        chunks.push({
          id,
          documentId: input.documentId,
          chunkIndex: input.chunkIndex,
          chunkText: input.chunkText,
          tokenCount: input.tokenCount,
          metadataJson: metaJson,
          createdAt: now,
        });
      }
    });

    runAll();
    return chunks;
  }

  /** 벡터 임베딩을 chunk_embeddings에 저장 */
  saveEmbeddings(chunkIds: string[], embeddings: number[][]): void {
    if (!this.vectorEnabled) return;

    const stmt = this.db.prepare(
      `INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (?, ?)`,
    );

    const runAll = this.db.transaction(() => {
      for (let i = 0; i < chunkIds.length; i++) {
        // sqlite-vec는 JSON 배열 또는 raw blob 지원
        stmt.run(chunkIds[i], JSON.stringify(embeddings[i]));
      }
    });

    runAll();
  }

  deleteByDocumentId(documentId: string): void {
    const runAll = this.db.transaction(() => {
      // 먼저 chunk_embeddings에서 삭제 (FK 없으므로 수동)
      if (this.vectorEnabled) {
        const chunkIds = this.db
          .prepare("SELECT id FROM document_chunks WHERE document_id = ?")
          .all(documentId) as Array<{ id: string }>;

        if (chunkIds.length > 0) {
          const placeholders = chunkIds.map(() => "?").join(",");
          this.db
            .prepare(`DELETE FROM chunk_embeddings WHERE chunk_id IN (${placeholders})`)
            .run(...chunkIds.map((r) => r.id));
        }
      }

      this.db.prepare("DELETE FROM document_chunks WHERE document_id = ?").run(documentId);
    });

    runAll();
  }

  /** sqlite-vec 벡터 유사도 검색 (코사인 유사도) */
  searchByVector(embedding: number[], limit: number): ChunkSearchResult[] {
    if (!this.vectorEnabled) return [];

    const rows = this.db
      .prepare(
        `SELECT
           ce.chunk_id AS chunkId,
           ce.distance AS dist,
           dc.document_id AS documentId,
           dc.chunk_index AS chunkIndex,
           dc.chunk_text AS chunkText,
           sd.title AS documentTitle,
           sd.relative_path AS relativePath
         FROM chunk_embeddings ce
         JOIN document_chunks dc ON dc.id = ce.chunk_id
         LEFT JOIN source_documents sd ON sd.id = dc.document_id
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?`,
      )
      .all(JSON.stringify(embedding), limit) as Array<{
      chunkId: string;
      dist: number;
      documentId: string;
      chunkIndex: number;
      chunkText: string;
      documentTitle: string | null;
      relativePath: string | null;
    }>;

    return rows.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      chunkIndex: r.chunkIndex,
      chunkText: r.chunkText,
      score: 1 - r.dist, // distance → similarity
      documentTitle: r.documentTitle ?? undefined,
      relativePath: r.relativePath ?? undefined,
    }));
  }

  /** FTS5 키워드 검색 */
  searchByKeyword(query: string, limit: number): ChunkSearchResult[] {
    // FTS5 쿼리 이스케이프 — 특수문자 제거
    const safeQuery = query.replace(/[^\w\sㄱ-ㅎ가-힣]/g, " ").trim();
    if (!safeQuery) return [];

    const rows = this.db
      .prepare(
        `SELECT
           dc.id AS chunkId,
           dc.document_id AS documentId,
           dc.chunk_index AS chunkIndex,
           dc.chunk_text AS chunkText,
           rank AS score,
           sd.title AS documentTitle,
           sd.relative_path AS relativePath
         FROM document_chunks_fts fts
         JOIN document_chunks dc ON dc.rowid = fts.rowid
         LEFT JOIN source_documents sd ON sd.id = dc.document_id
         WHERE document_chunks_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(safeQuery, limit) as Array<{
      chunkId: string;
      documentId: string;
      chunkIndex: number;
      chunkText: string;
      score: number;
      documentTitle: string | null;
      relativePath: string | null;
    }>;

    // FTS5 rank는 음수(높을수록 관련도 높음), 정규화 — NaN 방지
    const maxAbs = rows.length > 0 ? Math.max(...rows.map((r) => Math.abs(r.score))) : 1;
    const safeMax = maxAbs > 0 && Number.isFinite(maxAbs) ? maxAbs : 1;
    return rows.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      chunkIndex: r.chunkIndex,
      chunkText: r.chunkText,
      score: Math.abs(r.score) / safeMax,
      documentTitle: r.documentTitle ?? undefined,
      relativePath: r.relativePath ?? undefined,
    }));
  }

  listByDocumentId(documentId: string): DocumentChunk[] {
    const rows = this.db
      .prepare(
        `SELECT id, document_id AS documentId, chunk_index AS chunkIndex,
                chunk_text AS chunkText, token_count AS tokenCount,
                metadata_json AS metadataJson, created_at AS createdAt
         FROM document_chunks
         WHERE document_id = ?
         ORDER BY chunk_index`,
      )
      .all(documentId) as ChunkRow[];
    return rows.map(toChunk);
  }

  getStats(): { totalChunks: number; totalDocuments: number; vectorEnabled: boolean } {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS cnt, COUNT(DISTINCT document_id) AS docs FROM document_chunks",
      )
      .get() as { cnt: number; docs: number };
    return {
      totalChunks: row.cnt,
      totalDocuments: row.docs,
      vectorEnabled: this.vectorEnabled,
    };
  }
}
