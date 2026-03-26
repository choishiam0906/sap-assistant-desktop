/**
 * Data Platform Source Provider — REST API/파일 기반 외부 데이터 소스 연동
 *
 * 용도: SAP, MES, QMS 등 외부 시스템의 데이터를 HTTP API 또는
 *       파일 공유를 통해 Knowledge Hub에 연동
 *
 * 지원 형식: JSON, CSV, XML
 * 인증: API Key (header/query), Bearer Token, Basic Auth
 */

import { createHash } from "node:crypto";
import type {
  ConfiguredSource,
  SourceDocument,
  SourceIndexSummary,
  VaultClassification,
} from "../contracts.js";
import { logger } from "../logger.js";
import {
  ConfiguredSourceRepository,
  SourceDocumentRepository,
} from "../storage/repositories/index.js";
import { transformJson, transformCsv, transformXml } from "./dataTransformer.js";

// ── 상수 ──

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const REQUEST_TIMEOUT = 30000; // 30초

// ── 타입 ──

export interface DataPlatformConnectInput {
  name: string;
  endpointUrl: string;
  authType: "none" | "api-key" | "bearer" | "basic";
  authConfig?: Record<string, string>;
  format: "json" | "csv" | "xml";
  dataPath?: string;
  refreshIntervalMinutes?: number;
  classificationDefault?: VaultClassification;
}

export interface DataPlatformConnectResult {
  source: ConfiguredSource;
  summary: SourceIndexSummary;
}

interface TransformedData {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

// ── Provider ──

export class DataPlatformProvider {
  constructor(
    private readonly sourceRepo: ConfiguredSourceRepository,
    private readonly documentRepo: SourceDocumentRepository,
  ) {}

  // ── 공개 API ──

  /**
   * Data Platform 연결 + 데이터 인덱싱
   */
  async connectSource(input: DataPlatformConnectInput): Promise<DataPlatformConnectResult> {
    // 연결 테스트
    await this.testConnection(input);

    // ConfiguredSource 생성
    const source = this.sourceRepo.createDataPlatformSource({
      title: input.name,
      classificationDefault: input.classificationDefault ?? "reference",
      connectionMeta: {
        provider: "data-platform",
        endpointUrl: input.endpointUrl,
        authType: input.authType,
        format: input.format,
        dataPath: input.dataPath ?? "",
        refreshIntervalMinutes: String(input.refreshIntervalMinutes ?? 60),
        ...(input.authConfig ?? {}),
      },
    });

    // 데이터 동기화
    const summary = await this.syncSource(source.id);

    return {
      source: this.sourceRepo.getById(source.id) ?? source,
      summary,
    };
  }

  /**
   * 기존 source의 데이터 동기화
   */
  async syncSource(sourceId: string): Promise<SourceIndexSummary> {
    const source = this.sourceRepo.getById(sourceId);
    if (!source || source.kind !== "data-platform") {
      throw new Error("Data Platform source를 찾을 수 없어요.");
    }

    const meta = source.connectionMeta as Record<string, string> | null;
    if (!meta || meta.provider !== "data-platform") {
      throw new Error("Data Platform 연결 정보가 올바르지 않아요.");
    }

    this.sourceRepo.updateSyncStatus(sourceId, "indexing");

    try {
      // 데이터 가져오기
      const data = await this.fetchData(
        meta.endpointUrl,
        meta.authType as "none" | "api-key" | "bearer" | "basic",
        meta,
      );

      // 데이터 변환
      const transformed = this.transformData(data, meta.format as "json" | "csv" | "xml", meta.dataPath);

      // 문서 생성
      const documents = transformed.map(
        (item): Omit<SourceDocument, "id"> => ({
          sourceId,
          relativePath: item.title,
          absolutePath: meta.endpointUrl,
          title: item.title,
          excerpt: item.content.slice(0, 200),
          contentText: item.content,
          contentHash: generateHash(item.content),
          classification: source.classificationDefault,
          tags: Object.keys(item.metadata),
          indexedAt: new Date().toISOString(),
        }),
      );

      // 기존 문서 해시 매핑
      const existingDocs = this.documentRepo.listHashesBySource(sourceId);
      const existingMap = new Map(existingDocs.map((d) => [d.relativePath, d]));

      // 변경된 문서 식별
      const newDocs: Array<Omit<SourceDocument, "id">> = [];
      const updatedPaths = new Set<string>();
      for (const doc of documents) {
        const existing = existingMap.get(doc.relativePath);
        if (!existing || existing.contentHash !== doc.contentHash) {
          newDocs.push(doc);
        }
        updatedPaths.add(doc.relativePath);
      }

      // 삭제된 문서 식별
      const removedIds = existingDocs
        .filter((d) => !updatedPaths.has(d.relativePath))
        .map((d) => d.id);

      // DB 반영
      const existingIds = new Map(existingDocs.map((d) => [d.relativePath, d.id]));
      if (newDocs.length > 0) {
        this.documentRepo.upsertDocuments(sourceId, newDocs, existingIds);
      }
      if (removedIds.length > 0) {
        this.documentRepo.deleteByIds(removedIds);
      }

      // 상태 업데이트
      const now = new Date().toISOString();
      this.sourceRepo.updateSyncStatus(sourceId, "ready", now);

      const summary: SourceIndexSummary = {
        indexed: newDocs.filter((d) => !existingIds.has(d.relativePath)).length,
        updated: newDocs.filter((d) => existingIds.has(d.relativePath)).length,
        unchanged: documents.length - newDocs.length,
        removed: removedIds.length,
        skipped: 0,
        failed: 0,
      };

      logger.info({ summary }, "[DataPlatformProvider] 동기화 완료");
      return summary;
    } catch (error) {
      this.sourceRepo.updateSyncStatus(
        sourceId,
        "error",
        source.lastIndexedAt,
      );
      throw error;
    }
  }

  /**
   * 연결 테스트 — URL 접근성 + 데이터 형식 확인
   */
  async testConnection(input: DataPlatformConnectInput): Promise<{
    success: boolean;
    message: string;
    recordCount?: number;
  }> {
    try {
      const data = await this.fetchData(
        input.endpointUrl,
        input.authType,
        input.authConfig ?? {},
      );

      const transformed = this.transformData(data, input.format, input.dataPath);
      return {
        success: true,
        message: `연결 성공해요. ${transformed.length}개 레코드를 발견했어요.`,
        recordCount: transformed.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
      logger.error({ error }, "[DataPlatformProvider] 연결 테스트 실패");
      return {
        success: false,
        message,
      };
    }
  }

  // ── 내부 메서드 ──

  private async fetchData(
    endpointUrl: string,
    authType: "none" | "api-key" | "bearer" | "basic",
    authConfig: Record<string, string>,
  ): Promise<unknown> {
    const headers = this.buildHeaders(authType, authConfig);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(endpointUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      let data: unknown;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else if (contentType.includes("text/csv")) {
        const text = await response.text();
        // CSV는 문자열로 그대로 반환 (transformCsv에서 처리)
        data = text;
      } else if (contentType.includes("text/xml") || contentType.includes("application/xml")) {
        const text = await response.text();
        // XML은 문자열로 그대로 반환 (transformXml에서 처리)
        data = text;
      } else {
        // 기본: JSON 시도
        data = await response.json();
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("요청 시간이 초과되었어요. 엔드포인트를 확인해주세요.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildHeaders(
    authType: "none" | "api-key" | "bearer" | "basic",
    authConfig: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "SAP-Knowledge-Hub/DataPlatform",
    };

    switch (authType) {
      case "api-key":
        const apiKeyHeader = authConfig.apiKeyHeader ?? "X-API-Key";
        const apiKey = authConfig.apiKey ?? "";
        headers[apiKeyHeader] = apiKey;
        break;

      case "bearer":
        const token = authConfig.token ?? "";
        headers.Authorization = `Bearer ${token}`;
        break;

      case "basic":
        const username = authConfig.username ?? "";
        const password = authConfig.password ?? "";
        const credentials = Buffer.from(`${username}:${password}`).toString("base64");
        headers.Authorization = `Basic ${credentials}`;
        break;

      case "none":
      default:
        // 인증 없음
        break;
    }

    return headers;
  }

  private transformData(
    data: unknown,
    format: "json" | "csv" | "xml",
    dataPath?: string,
  ): TransformedData[] {
    try {
      switch (format) {
        case "json":
          return transformJson(data, dataPath) as TransformedData[];
        case "csv":
          if (typeof data !== "string") {
            throw new Error("CSV 형식이 문자열이어야 해요.");
          }
          return transformCsv(data) as TransformedData[];
        case "xml":
          if (typeof data !== "string") {
            throw new Error("XML 형식이 문자열이어야 해요.");
          }
          return transformXml(data) as TransformedData[];
        default:
          throw new Error(`지원하지 않는 형식: ${format}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "변환 실패";
      throw new Error(`데이터 변환에 실패했어요: ${message}`);
    }
  }
}

// ── 유틸 ──

function generateHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
