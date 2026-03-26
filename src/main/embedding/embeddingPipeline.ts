import { randomUUID, createHash } from "node:crypto";

import type { DocumentChunker } from "./documentChunker.js";
import type { DocumentImporter } from "./documentImporter.js";
import type { EmbeddingService } from "./embeddingService.js";
import type { DocumentChunkRepository, DocumentChunkInput } from "../storage/repositories/chunkRepository.js";
import type { SourceDocumentRepository } from "../storage/repositories/index.js";
import type { ConfiguredSourceRepository } from "../storage/repositories/index.js";
import { logger } from "../logger.js";

const CONCURRENCY = 5;

export interface EmbeddingIndexSummary {
  documentCount: number;
  chunkCount: number;
  errorCount: number;
  errors: Array<{ documentId: string; error: string }>;
}

export class EmbeddingPipeline {
  constructor(
    private readonly chunker: DocumentChunker,
    private readonly embedder: EmbeddingService,
    private readonly chunkRepo: DocumentChunkRepository,
    private readonly sourceDocRepo: SourceDocumentRepository,
    private readonly importer: DocumentImporter,
    private readonly configuredSourceRepo: ConfiguredSourceRepository,
  ) {}

  /** 단일 source_document를 청크 → 임베딩 → 저장 */
  async indexDocument(documentId: string): Promise<number> {
    const doc = this.sourceDocRepo.getById(documentId);
    if (!doc) throw new Error(`문서를 찾을 수 없어요: ${documentId}`);

    // 증분 인덱싱: 컨텐츠 해시가 동일하면 스킵
    const newHash = this.calculateHash(doc.contentText);
    if (doc.contentHash && doc.contentHash === newHash) {
      logger.debug({ documentId, contentHash: newHash }, "문서 내용이 변경되지 않았어요 — 스킵");
      return 0;
    }

    // 기존 청크 삭제 (재인덱싱)
    this.chunkRepo.deleteByDocumentId(documentId);

    const chunks = this.chunker.chunk(doc.contentText);
    if (chunks.length === 0) return 0;

    const chunkInputs: DocumentChunkInput[] = chunks.map((c) => ({
      documentId,
      chunkIndex: c.index,
      chunkText: c.text,
      tokenCount: c.tokenCount,
    }));

    const savedChunks = this.chunkRepo.insertChunks(chunkInputs);

    // 임베딩 생성 + 저장
    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embedder.embedBatch(texts);
    this.chunkRepo.saveEmbeddings(
      savedChunks.map((c) => c.id),
      embeddings,
    );

    // 컨텐츠 해시 업데이트
    this.sourceDocRepo.updateContentHash(documentId, newHash);

    return savedChunks.length;
  }

  /** 소스 전체 문서를 인덱싱 (병렬 배치 처리) */
  async indexSource(
    sourceId: string,
    onProgress?: (indexed: number, total: number) => void,
  ): Promise<EmbeddingIndexSummary> {
    const documents = this.sourceDocRepo.listBySourceId(sourceId);
    const summary: EmbeddingIndexSummary = {
      documentCount: documents.length,
      chunkCount: 0,
      errorCount: 0,
      errors: [],
    };

    // 배치 단위로 병렬 처리 (CONCURRENCY = 5)
    for (let batchStart = 0; batchStart < documents.length; batchStart += CONCURRENCY) {
      const batchEnd = Math.min(batchStart + CONCURRENCY, documents.length);
      const batch = documents.slice(batchStart, batchEnd);

      const promises = batch.map(async (doc) => {
        try {
          const count = await this.indexDocument(doc.id);
          return { success: true, count, documentId: doc.id };
        } catch (err) {
          return {
            success: false,
            documentId: doc.id,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.success) {
          summary.chunkCount += result.count ?? 0;
        } else {
          summary.errorCount++;
          summary.errors.push({
            documentId: result.documentId,
            error: result.error ?? "Unknown error",
          });
          logger.warn({ documentId: result.documentId }, "문서 임베딩 실패 — 건너뜀");
        }
      }

      // 배치 완료 후 진행도 보고
      onProgress?.(batchEnd, documents.length);
    }

    return summary;
  }

  /** 로컬 파일을 source_documents에 임포트 후 임베딩까지 실행 */
  async importAndIndex(
    filePath: string,
    sourceId: string,
  ): Promise<EmbeddingIndexSummary> {
    const parsed = await this.importer.parseFile(filePath);

    // source_documents에 저장 (기존 replaceAllForSource 대신 단건 추가)
    const docId = randomUUID();
    this.sourceDocRepo.insertOne({
      id: docId,
      sourceId,
      relativePath: filePath,
      absolutePath: filePath,
      title: parsed.title,
      excerpt: parsed.content.slice(0, 200),
      contentText: parsed.content,
      contentHash: this.simpleHash(parsed.content),
      classification: null,
      tagsJson: JSON.stringify(parsed.metadata),
    });

    const chunkCount = await this.indexDocument(docId);

    return {
      documentCount: 1,
      chunkCount,
      errorCount: 0,
      errors: [],
    };
  }

  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash.toString(36);
  }

  private calculateHash(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }
}
