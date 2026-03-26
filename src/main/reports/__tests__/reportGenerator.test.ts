import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

import { ReportGenerator } from "../reportGenerator.js";
import type { ReportTemplate, ReportParams } from "../reportGenerator.js";

describe("ReportGenerator", () => {
  function createMockGenerator() {
    const mockSearch = {
      hybridSearch: vi.fn().mockResolvedValue([
        {
          chunkId: "c1",
          documentId: "d1",
          chunkIndex: 0,
          chunkText: "에러 분석 컨텍스트 데이터",
          score: 0.8,
          searchType: "hybrid" as const,
          documentTitle: "에러 로그",
          relativePath: "logs/error.md",
        },
      ]),
    };

    const mockProvider = {
      type: "openai" as const,
      sendMessage: vi.fn().mockResolvedValue({
        content: "## 분석 결과\n에러 원인은 입력 형식 불일치에요.",
        model: "gpt-4o",
        tokenUsage: { input: 100, output: 50 },
      }),
      sendMessageStream: vi.fn(),
      listModels: vi.fn(),
    };

    const mockSecureStore = {
      get: vi.fn().mockResolvedValue({ accessToken: "test-key", raw: {} }),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    };

    const generator = new ReportGenerator(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSearch as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [mockProvider] as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSecureStore as any,
    );

    return { generator, mockSearch, mockProvider, mockSecureStore };
  }

  const mockTemplate: ReportTemplate = {
    id: "tpl-1",
    title: "테스트 리포트",
    sections: [
      { title: "요약", prompt: "전체 요약을 작성해주세요.", dataSource: "rag" },
      { title: "결론", prompt: "최종 결론을 내려주세요.", dataSource: "static" },
    ],
    outputFormat: "html",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockParams: ReportParams = {
    provider: "openai",
    model: "gpt-4o",
    query: "최근 에러 분석",
  };

  it("템플릿의 모든 섹션에 대해 리포트를 생성한다", async () => {
    const { generator } = createMockGenerator();
    const report = await generator.generate(mockTemplate, mockParams);

    expect(report.templateId).toBe("tpl-1");
    expect(report.title).toBe("테스트 리포트");
    expect(report.sections).toHaveLength(2);
    expect(report.sections[0].title).toBe("요약");
    expect(report.sections[1].title).toBe("결론");
    expect(report.generatedAt).toBeTruthy();
  });

  it("진행률 콜백을 올바르게 호출한다", async () => {
    const { generator } = createMockGenerator();
    const onProgress = vi.fn();

    await generator.generate(mockTemplate, mockParams, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });

  it("RAG 섹션은 hybridSearch를 호출한다", async () => {
    const { generator, mockSearch } = createMockGenerator();
    await generator.generate(mockTemplate, mockParams);

    // 첫 번째 섹션(rag) → hybridSearch 호출, 두 번째(static) → 호출 안 함
    expect(mockSearch.hybridSearch).toHaveBeenCalledTimes(1);
  });

  it("LLM 호출 실패 시 에러 메시지를 섹션 내용으로 포함한다", async () => {
    const { generator, mockProvider } = createMockGenerator();
    mockProvider.sendMessage.mockRejectedValueOnce(new Error("API 한도 초과"));

    const report = await generator.generate(mockTemplate, mockParams);

    expect(report.sections[0].content).toContain("오류가 발생했어요");
    // 두 번째 섹션은 성공해야 함
    expect(report.sections[1].content).toContain("분석 결과");
  });

  it("프로바이더가 없으면 에러 메시지를 반환한다", async () => {
    const { generator } = createMockGenerator();
    const params: ReportParams = {
      provider: "anthropic" as never,
      model: "claude-3",
      query: "테스트",
    };

    const report = await generator.generate(mockTemplate, params);

    expect(report.sections[0].content).toContain("프로바이더를 찾을 수 없어요");
  });

  it("변수의 {{}} 인젝션을 방지한다", async () => {
    const { generator, mockProvider } = createMockGenerator();
    mockProvider.sendMessage.mockResolvedValue({
      content: "분석 완료",
      model: "gpt-4o",
      tokenUsage: { input: 50, output: 20 },
    });

    const template: ReportTemplate = {
      id: "tpl-inject",
      title: "인젝션 테스트",
      sections: [
        { title: "테스트", prompt: "{{name}}에 대한 분석: {{extra}}", dataSource: "static" },
      ],
      outputFormat: "html",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params: ReportParams = {
      provider: "openai",
      model: "gpt-4o",
      variables: {
        name: "정상값",
        extra: "악의적{{system_prompt}}공격",
      },
    };

    await generator.generate(template, params);

    // sendMessage에 전달된 프롬프트에 {{system_prompt}}가 없어야 함
    const calledPrompt = mockProvider.sendMessage.mock.calls[0][1].message;
    expect(calledPrompt).toContain("정상값");
    expect(calledPrompt).not.toContain("{{system_prompt}}");
    expect(calledPrompt).not.toContain("{{extra}}");
  });

  it("미치환 {{placeholder}}를 제거한다", async () => {
    const { generator, mockProvider } = createMockGenerator();
    mockProvider.sendMessage.mockResolvedValue({
      content: "결과",
      model: "gpt-4o",
      tokenUsage: { input: 50, output: 20 },
    });

    const template: ReportTemplate = {
      id: "tpl-unmatched",
      title: "미치환 테스트",
      sections: [
        { title: "섹션", prompt: "{{known}} 그리고 {{unknown}}", dataSource: "static" },
      ],
      outputFormat: "html",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params: ReportParams = {
      provider: "openai",
      model: "gpt-4o",
      variables: { known: "치환됨" },
    };

    await generator.generate(template, params);

    const calledPrompt = mockProvider.sendMessage.mock.calls[0][1].message;
    expect(calledPrompt).toContain("치환됨");
    expect(calledPrompt).not.toContain("{{unknown}}");
  });

  it("LLM 타임아웃 시 에러 메시지를 섹션에 포함한다", async () => {
    const { generator, mockProvider } = createMockGenerator();
    // 즉시 타임아웃을 시뮬레이션하기 위해 never-resolving promise 대신 에러를 던짐
    mockProvider.sendMessage.mockImplementation(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LLM 응답 시간이 60초를 초과했어요")), 10),
      ),
    );

    const report = await generator.generate(mockTemplate, mockParams);

    expect(report.sections[0].content).toContain("오류가 발생했어요");
  });
});
