import { CboAnalyzer } from "../analyzer.js";
import type { LlmProvider, ProviderChatOutput } from "../../providers/base.js";
import type { ProviderResilience } from "../../providers/providerResilience.js";
import type { CboAnalysisResult } from "../../types/cbo.js";

vi.mock("../parser.js", () => ({
  parseCboText: vi.fn((_fn: string, content: string) => ({ fileName: "test.abap", content })),
  parseCboFile: vi.fn(() => Promise.resolve({ fileName: "test.abap", content: "REPORT ZTEST." })),
}));

const mockBaseResult: CboAnalysisResult = {
  summary: "규칙 기반 분석 결과",
  risks: [{ severity: "medium", title: "테스트 리스크", detail: "상세 내용" }],
  recommendations: [],
  metadata: { fileName: "test.abap", charCount: 100, languageHint: "abap" },
};

vi.mock("../rules.js", () => ({
  analyzeByRules: vi.fn(() => ({ ...mockBaseResult })),
}));

vi.mock("../../skills/registry.js", () => ({
  getSkillDefinition: vi.fn(() => ({
    id: "cbo-impact-analysis",
    title: "CBO 변경 영향 분석",
    defaultPromptTemplate: "분석하세요",
    suggestedTcodes: ["SE80"],
  })),
}));

function createMockProvider(): LlmProvider {
  return {
    type: "copilot",
    sendMessage: vi.fn().mockResolvedValue({
      content: "LLM 보강 분석 결과",
      inputTokens: 50,
      outputTokens: 100,
    } satisfies ProviderChatOutput),
  };
}

function createMockResilience(): ProviderResilience {
  return {
    withProviderCall: vi.fn((_, fn) => fn()),
    withRetry: vi.fn((fn) => fn()),
    withCircuitBreaker: vi.fn((_, fn) => fn()),
    withFallback: vi.fn((primary) => primary()),
  } as unknown as ProviderResilience;
}

describe("CboAnalyzer", () => {
  // ─── analyzeContent (provider 없음) ───

  describe("analyzeContent — provider 없음", () => {
    it("규칙 기반 분석만 반환", async () => {
      const provider = createMockProvider();
      const secureStore = { get: vi.fn() };
      const analyzer = new CboAnalyzer([provider], secureStore as never);

      const result = await analyzer.analyzeContent("test.abap", "REPORT ZTEST.");

      expect(result.summary).toContain("규칙 기반");
      expect(result.skillUsed).toBe("cbo-impact-analysis");
      expect(provider.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ─── analyzeContent (LLM 보강) ───

  describe("analyzeContent — LLM 보강", () => {
    it("LLM 호출 성공 시 보강 결과 포함", async () => {
      const provider = createMockProvider();
      const secureStore = { get: vi.fn().mockResolvedValue({ accessToken: "token" }) };
      const analyzer = new CboAnalyzer([provider], secureStore as never);

      const result = await analyzer.analyzeContent("test.abap", "REPORT ZTEST.", "copilot", "gpt-4o");

      expect(result.summary).toContain("LLM 보강 분석");
      expect(provider.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("LLM 호출 실패 시 규칙 기반 결과 반환 (graceful)", async () => {
      const provider = createMockProvider();
      (provider.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API 오류"));
      const secureStore = { get: vi.fn().mockResolvedValue({ accessToken: "token" }) };
      const analyzer = new CboAnalyzer([provider], secureStore as never);

      const result = await analyzer.analyzeContent("test.abap", "SOURCE", "copilot", "gpt-4o");

      expect(result.summary).not.toContain("LLM");
      expect(result.summary).toContain("규칙 기반");
    });

    it("인증 없으면 규칙 기반 결과만 반환", async () => {
      const provider = createMockProvider();
      const secureStore = { get: vi.fn().mockResolvedValue(null) };
      const analyzer = new CboAnalyzer([provider], secureStore as never);

      const result = await analyzer.analyzeContent("test.abap", "SOURCE", "copilot", "gpt-4o");
      expect(provider.sendMessage).not.toHaveBeenCalled();
      expect(result.summary).toContain("규칙 기반");
    });
  });

  // ─── analyzeText / analyzeFile ───

  describe("analyzeText", () => {
    it("텍스트 입력 분석", async () => {
      const analyzer = new CboAnalyzer([createMockProvider()], { get: vi.fn() } as never);
      const result = await analyzer.analyzeText({ fileName: "t.abap", content: "DATA lv TYPE i." });
      expect(result.summary).toBeDefined();
    });
  });

  describe("analyzeFile", () => {
    it("파일 분석", async () => {
      const analyzer = new CboAnalyzer([createMockProvider()], { get: vi.fn() } as never);
      const result = await analyzer.analyzeFile({ filePath: "/tmp/test.abap" });
      expect(result.summary).toBeDefined();
    });
  });

  // ─── ProviderResilience 통합 ───

  describe("ProviderResilience 통합", () => {
    it("resilience 제공 시 withProviderCall로 래핑", async () => {
      const provider = createMockProvider();
      const secureStore = { get: vi.fn().mockResolvedValue({ accessToken: "token" }) };
      const resilience = createMockResilience();
      const analyzer = new CboAnalyzer([provider], secureStore as never, resilience);

      await analyzer.analyzeContent("test.abap", "SOURCE", "copilot", "gpt-4o");

      expect(resilience.withProviderCall).toHaveBeenCalledWith(
        "copilot",
        expect.any(Function),
      );
    });
  });
});
