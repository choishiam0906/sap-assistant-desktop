import { CboBatchRuntime } from "../batchRuntime.js";
import type { CboAnalysisResult, CboAnalysisRunDetail, CboAnalysisRunSummary } from "../../types/cbo.js";

vi.mock("../parser.js", () => ({
  parseCboFile: vi.fn().mockResolvedValue({ fileName: "test.abap", content: "REPORT ZTEST." }),
}));

const mockResult: CboAnalysisResult = {
  summary: "분석 요약",
  risks: [{ severity: "medium", title: "리스크", detail: "상세" }],
  recommendations: [{ priority: "p1", action: "조치", rationale: "근거" }],
  metadata: { fileName: "test.abap", charCount: 50, languageHint: "abap" },
};

function createMockAnalyzer() {
  return {
    analyzeContent: vi.fn().mockResolvedValue(mockResult),
    analyzeText: vi.fn(),
    analyzeFile: vi.fn(),
  };
}

function createMockAnalysisRepo() {
  const runData: CboAnalysisRunSummary = {
    id: "run-1",
    mode: "folder",
    rootPath: "/tmp",
    provider: "copilot",
    model: "gpt-4o",
    totalFiles: 2,
    successFiles: 0,
    failedFiles: 0,
    skippedFiles: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  return {
    createRun: vi.fn().mockReturnValue(runData),
    hasSuccessfulFile: vi.fn().mockReturnValue(false),
    recordSuccessFile: vi.fn().mockReturnValue("file-id-1"),
    recordSkippedFile: vi.fn(),
    recordFailedFile: vi.fn(),
    finalizeRun: vi.fn().mockReturnValue({ ...runData, finishedAt: new Date().toISOString(), successFiles: 2 }),
    listRuns: vi.fn().mockReturnValue([runData]),
    getRunDetail: vi.fn().mockReturnValue({
      run: runData,
      files: [
        {
          id: "f1",
          runId: "run-1",
          filePath: "/tmp/a.txt",
          fileName: "a.abap",
          fileHash: "abc",
          status: "success",
          errorCode: null,
          errorMessage: null,
          result: mockResult,
          analyzedAt: new Date().toISOString(),
        },
      ],
    } satisfies CboAnalysisRunDetail),
  };
}

function createMockVaultRepo() {
  return { store: vi.fn() };
}

/** collectCandidateFiles를 우회하여 가상 파일 목록을 반환하도록 spy */
function spyCollectFiles(runtime: CboBatchRuntime, files: string[]) {
  vi.spyOn(runtime as any, "collectCandidateFiles").mockResolvedValue(files);
}

const FAKE_FILES = ["/tmp/file1.txt", "/tmp/file2.md"];

describe("CboBatchRuntime", () => {
  // ─── analyzeFolder ───

  describe("analyzeFolder", () => {
    it("폴더 파일 분석 후 결과 반환", async () => {
      const analyzer = createMockAnalyzer();
      const repo = createMockAnalysisRepo();
      const vault = createMockVaultRepo();
      const runtime = new CboBatchRuntime(analyzer as never, repo as never, "http://api", vault as never);
      spyCollectFiles(runtime, FAKE_FILES);

      const result = await runtime.analyzeFolder({ rootPath: "/tmp" });

      expect(repo.createRun).toHaveBeenCalledWith("folder", expect.objectContaining({ rootPath: expect.any(String), totalFiles: 2 }));
      expect(result.run).toBeDefined();
      expect(result.errors).toEqual([]);
      expect(analyzer.analyzeContent).toHaveBeenCalledTimes(2);
      expect(vault.store).toHaveBeenCalledTimes(2);
    });

    it("onProgress 콜백 호출", async () => {
      const analyzer = createMockAnalyzer();
      const repo = createMockAnalysisRepo();
      const runtime = new CboBatchRuntime(analyzer as never, repo as never, "http://api");
      spyCollectFiles(runtime, FAKE_FILES);
      const onProgress = vi.fn();

      await runtime.analyzeFolder({ rootPath: "/tmp" }, { onProgress });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls[0][0]).toHaveProperty("status", "analyzing");
    });

    it("signal abort 시 중단", async () => {
      const analyzer = createMockAnalyzer();
      const repo = createMockAnalysisRepo();
      const runtime = new CboBatchRuntime(analyzer as never, repo as never, "http://api");
      spyCollectFiles(runtime, FAKE_FILES);

      const controller = new AbortController();
      controller.abort(); // 즉시 취소

      await runtime.analyzeFolder({ rootPath: "/tmp" }, { signal: controller.signal });

      // 파일 분석이 실행되지 않음
      expect(analyzer.analyzeContent).not.toHaveBeenCalled();
    });

    it("skipUnchanged — 해시 일치 시 스킵", async () => {
      const analyzer = createMockAnalyzer();
      const repo = createMockAnalysisRepo();
      repo.hasSuccessfulFile.mockReturnValue(true); // 이미 분석됨
      const runtime = new CboBatchRuntime(analyzer as never, repo as never, "http://api");
      spyCollectFiles(runtime, FAKE_FILES);

      await runtime.analyzeFolder({ rootPath: "/tmp", skipUnchanged: true });

      expect(repo.recordSkippedFile).toHaveBeenCalled();
      expect(analyzer.analyzeContent).not.toHaveBeenCalled();
    });

    it("분석 실패 시 에러 수집", async () => {
      const analyzer = createMockAnalyzer();
      analyzer.analyzeContent.mockRejectedValue(new Error("API 오류"));
      const repo = createMockAnalysisRepo();
      const runtime = new CboBatchRuntime(analyzer as never, repo as never, "http://api");
      spyCollectFiles(runtime, FAKE_FILES);

      const result = await runtime.analyzeFolder({ rootPath: "/tmp" });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(repo.recordFailedFile).toHaveBeenCalled();
    });
  });

  // ─── listRuns / getRunDetail ───

  describe("listRuns", () => {
    it("실행 목록 조회", () => {
      const repo = createMockAnalysisRepo();
      const runtime = new CboBatchRuntime({} as never, repo as never, "http://api");
      const runs = runtime.listRuns(10);
      expect(repo.listRuns).toHaveBeenCalledWith(10);
      expect(runs).toHaveLength(1);
    });
  });

  describe("getRunDetail", () => {
    it("실행 상세 조회", () => {
      const repo = createMockAnalysisRepo();
      const runtime = new CboBatchRuntime({} as never, repo as never, "http://api");
      const detail = runtime.getRunDetail("run-1");
      expect(detail?.run.id).toBe("run-1");
      expect(detail?.files).toHaveLength(1);
    });
  });

  // ─── diffRuns ───

  describe("diffRuns", () => {
    it("두 실행 비교", () => {
      const repo = createMockAnalysisRepo();
      // from과 to 동일 → 모든 리스크가 persisted
      const runtime = new CboBatchRuntime({} as never, repo as never, "http://api");
      const diff = runtime.diffRuns({ fromRunId: "run-1", toRunId: "run-2" });

      expect(diff.fromRunId).toBe("run-1");
      expect(diff.toRunId).toBe("run-2");
      expect(diff.persisted).toBeGreaterThanOrEqual(0);
    });

    it("존재하지 않는 run은 에러", () => {
      const repo = createMockAnalysisRepo();
      repo.getRunDetail.mockReturnValueOnce(null);
      const runtime = new CboBatchRuntime({} as never, repo as never, "http://api");

      expect(() => runtime.diffRuns({ fromRunId: "bad", toRunId: "run-2" })).toThrow("Base run not found");
    });
  });
});
