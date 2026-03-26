vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

import { ChatRuntime } from "../chatRuntime.js";
import type { LlmProvider, ProviderChatOutput } from "../providers/base.js";
import type { ProviderResilience } from "../providers/providerResilience.js";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: () => "test-uuid" };
});

function createMockProvider(type = "copilot" as const): LlmProvider {
  return {
    type,
    sendMessage: vi.fn().mockResolvedValue({
      content: "response",
      inputTokens: 10,
      outputTokens: 20,
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

function createMockDeps() {
  const provider = createMockProvider();
  const secureStore = {
    get: vi.fn().mockResolvedValue({ accessToken: "token" }),
  };
  const sessionRepo = {
    create: vi.fn().mockReturnValue({
      id: "session-1",
      title: "Test",
      provider: "copilot",
      model: "gpt-4o",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getById: vi.fn().mockReturnValue(null),
    touch: vi.fn(),
    list: vi.fn().mockReturnValue([]),
  };
  const messageRepo = {
    append: vi.fn().mockImplementation((_sid, role, content) => ({
      id: `msg-${role}`,
      sessionId: "session-1",
      role,
      content,
      inputTokens: 0,
      outputTokens: 0,
      sourceReferences: [],
      createdAt: new Date().toISOString(),
    })),
    listBySession: vi.fn().mockReturnValue([]),
  };
  const auditRepo = { append: vi.fn() };
  const skillRegistry = {
    resolveSkillExecution: vi.fn().mockReturnValue({
      promptContext: [],
      meta: {
        skillUsed: "test-skill",
        skillTitle: "Test Skill",
        sources: [],
        sourceIds: [],
        sourceCount: 0,
        suggestedTcodes: [],
      },
    }),
  };

  return { provider, secureStore, sessionRepo, messageRepo, auditRepo, skillRegistry };
}

describe("ChatRuntime", () => {
  // ─── chatHistoryLimit ───

  describe("chatHistoryLimit", () => {
    it("기본값 10", () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );
      expect(runtime.chatHistoryLimit).toBe(10);
    });

    it("2~100 범위로 클램핑", () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );
      runtime.chatHistoryLimit = 1;
      expect(runtime.chatHistoryLimit).toBe(2);
      runtime.chatHistoryLimit = 200;
      expect(runtime.chatHistoryLimit).toBe(100);
    });
  });

  // ─── sendMessage ───

  describe("sendMessage", () => {
    it("메시지 전송 후 결과 반환", async () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );

      const result = await runtime.sendMessage({
        provider: "copilot",
        model: "gpt-4o",
        message: "hello",
      });

      expect(result.assistantMessage.content).toBe("response");
      expect(deps.provider.sendMessage).toHaveBeenCalledTimes(1);
      expect(deps.messageRepo.append).toHaveBeenCalledTimes(2); // user + assistant
      expect(deps.auditRepo.append).toHaveBeenCalledTimes(1);
    });

    it("인증되지 않은 provider는 에러", async () => {
      const deps = createMockDeps();
      deps.secureStore.get.mockResolvedValue(null);
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );

      await expect(
        runtime.sendMessage({ provider: "copilot", model: "gpt-4o", message: "test" }),
      ).rejects.toThrow("not authenticated");
    });

    it("지원하지 않는 provider는 에러", async () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );

      await expect(
        runtime.sendMessage({ provider: "openai", model: "gpt-4o", message: "test" }),
      ).rejects.toThrow("Unsupported provider");
    });

    it("기존 세션 재사용", async () => {
      const deps = createMockDeps();
      deps.sessionRepo.getById.mockReturnValue({
        id: "existing",
        provider: "copilot",
        model: "gpt-4o",
      });
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );

      await runtime.sendMessage({
        sessionId: "existing",
        provider: "copilot",
        model: "gpt-4o",
        message: "hello",
      });

      expect(deps.sessionRepo.create).not.toHaveBeenCalled();
    });
  });

  // ─── ProviderResilience 통합 ───

  describe("ProviderResilience 통합", () => {
    it("resilience 제공 시 withProviderCall로 래핑", async () => {
      const deps = createMockDeps();
      const resilience = createMockResilience();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
        resilience,
      );

      await runtime.sendMessage({
        provider: "copilot",
        model: "gpt-4o",
        message: "test",
      });

      expect(resilience.withProviderCall).toHaveBeenCalledWith(
        "copilot",
        expect.any(Function),
      );
    });

    it("resilience 미제공 시 직접 호출", async () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );

      await runtime.sendMessage({
        provider: "copilot",
        model: "gpt-4o",
        message: "test",
      });

      expect(deps.provider.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  // ─── sendMessageWithStream ───

  describe("sendMessageWithStream", () => {
    it("스트리밍 미지원 시 동기 호출 후 onChunk 콜백", async () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );
      const onChunk = vi.fn();

      await runtime.sendMessageWithStream(
        { provider: "copilot", model: "gpt-4o", message: "hello" },
        onChunk,
      );

      expect(onChunk).toHaveBeenCalledWith({ delta: "response" });
    });

    it("스트리밍 지원 시 sendMessageStream 호출", async () => {
      const deps = createMockDeps();
      deps.provider.sendMessageStream = vi.fn().mockResolvedValue({
        content: "streamed",
        inputTokens: 10,
        outputTokens: 20,
      });
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );
      const onChunk = vi.fn();

      await runtime.sendMessageWithStream(
        { provider: "copilot", model: "gpt-4o", message: "hello" },
        onChunk,
      );

      expect(deps.provider.sendMessageStream).toHaveBeenCalled();
    });
  });

  // ─── listSessions / getMessages ───

  describe("listSessions / getMessages", () => {
    it("세션 목록 조회", () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );
      runtime.listSessions(10);
      expect(deps.sessionRepo.list).toHaveBeenCalledWith(10);
    });

    it("메시지 조회", () => {
      const deps = createMockDeps();
      const runtime = new ChatRuntime(
        [deps.provider], deps.secureStore as never, deps.sessionRepo as never,
        deps.messageRepo as never, deps.auditRepo as never, deps.skillRegistry as never,
      );
      runtime.getMessages("sess-1", 50);
      expect(deps.messageRepo.listBySession).toHaveBeenCalledWith("sess-1", 50);
    });
  });
});
