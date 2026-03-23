/**
 * GitHub Source Provider — GitHub REST API를 통한 코드 인덱싱
 *
 * 용도: 시스템 코드베이스를 AI 컨텍스트로 제공하여
 *       end user의 에러 자가 진단 지원
 *
 * 인증: PAT (Personal Access Token) 또는 공개 repo URL
 * API: GitHub REST API v3 (Octokit 미사용, fetch 직접 호출)
 */

import type {
  ConfiguredSource,
  SourceDocument,
  SourceIndexSummary,
  VaultClassification,
} from "../contracts.js";
import { logger } from "../logger.js";
import { SecureStore } from "../auth/secureStore.js";
import {
  ConfiguredSourceRepository,
  SourceDocumentRepository,
} from "../storage/repositories/index.js";

// ── 상수 ──

const GITHUB_API_BASE = "https://api.github.com";
const MAX_FILES = 500;
const MAX_FILE_SIZE = 512 * 1024; // 512KB
const CONCURRENT_DOWNLOADS = 5;
const SECURE_STORE_SERVICE = "github-codelab";

// 코드 파일 확장자 — CodeAnalyzer 지원 언어 기반
const CODE_EXTENSIONS = new Set([
  ".abap", ".py", ".js", ".ts", ".jsx", ".tsx",
  ".java", ".kt", ".cs", ".go", ".rs", ".rb",
  ".php", ".sql", ".sh", ".bash", ".ps1",
  ".xml", ".json", ".yaml", ".yml",
  ".md", ".txt", ".cfg", ".ini", ".conf",
]);

// ── 타입 ──

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

interface GitHubRepoMeta {
  default_branch: string;
  full_name: string;
  private: boolean;
  description: string | null;
}

interface GitHubContentResponse {
  content?: string;
  encoding?: string;
  size: number;
  name: string;
  path: string;
}

export interface GitHubConnectInput {
  repoUrl: string;
  pat?: string;
  branch?: string;
  classificationDefault?: VaultClassification;
  includeGlobs?: string[];
}

export interface GitHubConnectResult {
  source: ConfiguredSource;
  summary: SourceIndexSummary;
}

// ── Provider ──

export class GitHubSourceProvider {
  private readonly secureStore: SecureStore;

  constructor(
    private readonly sourceRepo: ConfiguredSourceRepository,
    private readonly documentRepo: SourceDocumentRepository,
  ) {
    this.secureStore = new SecureStore(SECURE_STORE_SERVICE);
  }

  // ── 공개 API ──

  /** PAT를 SecureStore에 저장 */
  async savePat(pat: string): Promise<void> {
    await this.secureStore.set("default", { accessToken: pat });
    logger.info("[GitHubProvider] PAT 저장 완료");
  }

  /** 저장된 PAT 조회 */
  async getPat(): Promise<string | null> {
    const record = await this.secureStore.get("default");
    return record?.accessToken ?? null;
  }

  /** PAT 삭제 */
  async deletePat(): Promise<void> {
    await this.secureStore.delete("default");
  }

  /** Repo URL에서 owner/repo 추출 */
  parseRepoUrl(url: string): { owner: string; repo: string } {
    // https://github.com/owner/repo 또는 https://github.com/owner/repo.git
    const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    // owner/repo 형식 직접 입력
    const slashMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
    if (slashMatch) {
      return { owner: slashMatch[1], repo: slashMatch[2] };
    }
    throw new Error("올바른 GitHub 리포지토리 URL을 입력해주세요. (예: https://github.com/owner/repo)");
  }

  /** GitHub 리포지토리 연결 + 파일 인덱싱 */
  async connectRepo(input: GitHubConnectInput): Promise<GitHubConnectResult> {
    const { owner, repo } = this.parseRepoUrl(input.repoUrl);
    const pat = input.pat || (await this.getPat());

    // PAT 저장 (제공된 경우)
    if (input.pat) {
      await this.savePat(input.pat);
    }

    // repo 메타데이터 조회
    const repoMeta = await this.fetchRepoMeta(owner, repo, pat);
    const branch = input.branch || repoMeta.default_branch;

    // ConfiguredSource 생성
    const source = this.sourceRepo.createApiSource({
      title: repoMeta.full_name,
      classificationDefault: input.classificationDefault ?? "reference",
      includeGlobs: input.includeGlobs ?? [],
      connectionMeta: {
        provider: "github",
        repoUrl: input.repoUrl,
        owner,
        repo,
        branch,
        isPrivate: String(repoMeta.private),
      },
    });

    // 파일 인덱싱
    const summary = await this.syncRepoFiles(source, owner, repo, branch, pat);

    return {
      source: this.sourceRepo.getById(source.id) ?? source,
      summary,
    };
  }

  /** 기존 source의 파일 동기화 (변경 감지) */
  async syncRepo(sourceId: string): Promise<SourceIndexSummary> {
    const source = this.sourceRepo.getById(sourceId);
    if (!source || source.kind !== "api") {
      throw new Error("GitHub source를 찾을 수 없습니다.");
    }

    const meta = source.connectionMeta as Record<string, string> | null;
    if (!meta || meta.provider !== "github") {
      throw new Error("GitHub 연결 정보가 올바르지 않습니다.");
    }

    const pat = await this.getPat();
    return this.syncRepoFiles(
      source,
      meta.owner,
      meta.repo,
      meta.branch,
      pat,
    );
  }

  // ── 내부 메서드 ──

  private async fetchRepoMeta(
    owner: string,
    repo: string,
    pat: string | null,
  ): Promise<GitHubRepoMeta> {
    const res = await this.githubFetch(`/repos/${owner}/${repo}`, pat);
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("GitHub 인증에 실패했어요. PAT를 확인해주세요.");
      }
      if (res.status === 404) {
        throw new Error("리포지토리를 찾을 수 없어요. URL과 권한을 확인해주세요.");
      }
      throw new Error(`GitHub API 오류 (${res.status})`);
    }
    return (await res.json()) as GitHubRepoMeta;
  }

  private async fetchTree(
    owner: string,
    repo: string,
    branch: string,
    pat: string | null,
  ): Promise<GitHubTreeItem[]> {
    const res = await this.githubFetch(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      pat,
    );
    if (!res.ok) {
      throw new Error(`파일 트리 조회 실패 (${res.status})`);
    }
    const data = (await res.json()) as GitHubTreeResponse;
    if (data.truncated) {
      logger.warn("[GitHubProvider] 트리가 잘렸어요 — 파일이 너무 많습니다");
    }
    return data.tree;
  }

  private async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    pat: string | null,
  ): Promise<string | null> {
    const res = await this.githubFetch(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      pat,
    );
    if (!res.ok) return null;

    const data = (await res.json()) as GitHubContentResponse;
    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  }

  private async syncRepoFiles(
    source: ConfiguredSource,
    owner: string,
    repo: string,
    branch: string,
    pat: string | null,
  ): Promise<SourceIndexSummary> {
    this.sourceRepo.updateSyncStatus(source.id, "indexing");

    try {
      // 1. 파일 트리 조회
      const tree = await this.fetchTree(owner, repo, branch, pat);

      // 2. 코드 파일만 필터링
      const codeFiles = tree
        .filter((item) => {
          if (item.type !== "blob") return false;
          const ext = this.getExtension(item.path);
          if (!CODE_EXTENSIONS.has(ext)) return false;
          if (item.size && item.size > MAX_FILE_SIZE) return false;
          return true;
        })
        .slice(0, MAX_FILES);

      // 3. 기존 문서 해시 매핑
      const existingDocs = this.documentRepo.listHashesBySource(source.id);
      const existingMap = new Map(
        existingDocs.map((d) => [d.relativePath, d]),
      );

      // 4. 변경된 파일만 다운로드 (SHA 비교)
      const toDownload: GitHubTreeItem[] = [];
      const unchanged: string[] = [];

      for (const file of codeFiles) {
        const existing = existingMap.get(file.path);
        if (existing && existing.contentHash === file.sha) {
          unchanged.push(file.path);
        } else {
          toDownload.push(file);
        }
      }

      // 5. 삭제된 파일 식별
      const currentPaths = new Set(codeFiles.map((f) => f.path));
      const removedIds = existingDocs
        .filter((d) => !currentPaths.has(d.relativePath))
        .map((d) => d.id);

      // 6. 파일 다운로드 (병렬, 동시 5개)
      const documents: Array<Omit<SourceDocument, "id">> = [];
      for (let i = 0; i < toDownload.length; i += CONCURRENT_DOWNLOADS) {
        const batch = toDownload.slice(i, i + CONCURRENT_DOWNLOADS);
        const results = await Promise.allSettled(
          batch.map(async (file) => {
            const content = await this.fetchFileContent(
              owner,
              repo,
              file.path,
              pat,
            );
            if (!content) return null;

            return {
              sourceId: source.id,
              relativePath: file.path,
              absolutePath: `https://github.com/${owner}/${repo}/blob/${branch}/${file.path}`,
              title: file.path.split("/").pop() ?? file.path,
              excerpt: content.slice(0, 200),
              contentText: content,
              contentHash: file.sha,
              classification: source.classificationDefault,
              tags: [] as string[],
              indexedAt: new Date().toISOString(),
            } satisfies Omit<SourceDocument, "id">;
          }),
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            documents.push(result.value);
          }
        }
      }

      // 7. DB 반영
      const existingIds = new Map(
        existingDocs.map((d) => [d.relativePath, d.id]),
      );
      if (documents.length > 0) {
        this.documentRepo.upsertDocuments(source.id, documents, existingIds);
      }
      if (removedIds.length > 0) {
        this.documentRepo.deleteByIds(removedIds);
      }

      const now = new Date().toISOString();
      this.sourceRepo.updateSyncStatus(source.id, "ready", now);

      const summary: SourceIndexSummary = {
        indexed: documents.filter(
          (d) => !existingIds.has(d.relativePath),
        ).length,
        updated: documents.filter((d) =>
          existingIds.has(d.relativePath),
        ).length,
        unchanged: unchanged.length,
        removed: removedIds.length,
        skipped: codeFiles.length - documents.length - unchanged.length,
        failed: toDownload.length - documents.length,
      };

      logger.info({ summary }, "[GitHubProvider] 동기화 완료");
      return summary;
    } catch (error) {
      this.sourceRepo.updateSyncStatus(
        source.id,
        "error",
        source.lastIndexedAt,
      );
      throw error;
    }
  }

  private async githubFetch(
    path: string,
    pat: string | null,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "SAP-Knowledge-Hub",
    };
    if (pat) {
      headers.Authorization = `Bearer ${pat}`;
    }
    return fetch(`${GITHUB_API_BASE}${path}`, { headers });
  }

  private getExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf(".");
    return lastDot >= 0 ? filePath.slice(lastDot).toLowerCase() : "";
  }
}
