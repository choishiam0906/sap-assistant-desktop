import { describe, it, expect, beforeEach, vi } from "vitest";
import { OAuthManager } from "../oauthManager.js";
import type { SecureStore } from "../secureStore.js";
import type { ProviderAccountRepository } from "../../storage/repositories/index.js";
import type { AppConfig } from "../../config.js";
import type { ProviderAccount } from "../../contracts.js";

vi.mock("electron", () => ({
  shell: { openExternal: vi.fn() },
}));

vi.mock("../../logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createMockSecureStore(): SecureStore {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  } as unknown as SecureStore;
}

function createMockProviderAccountRepo(): ProviderAccountRepository {
  const accounts = new Map<string, ProviderAccount>();
  return {
    get: vi.fn((provider: string) => accounts.get(provider) ?? null),
    upsert: vi.fn((account: ProviderAccount) => {
      accounts.set(account.provider, account);
      return account;
    }),
  } as unknown as ProviderAccountRepository;
}

const mockConfig = {
  oauthOpenaiClientId: "",
  oauthAnthropicClientId: "",
  oauthGoogleClientId: "",
  githubCopilotClientId: "",
} as AppConfig;

describe("OAuthManager", () => {
  let manager: OAuthManager;
  let secureStore: SecureStore;
  let accountRepo: ProviderAccountRepository;

  beforeEach(() => {
    secureStore = createMockSecureStore();
    accountRepo = createMockProviderAccountRepo();
    manager = new OAuthManager(secureStore, accountRepo, mockConfig);
  });

  // ── getStatus ──

  describe("getStatus", () => {
    it("저장된 계정이 없으면 unauthenticated를 반환한다", async () => {
      const status = await manager.getStatus("openai");
      expect(status.provider).toBe("openai");
      expect(status.status).toBe("unauthenticated");
    });

    it("저장된 계정이 있으면 그대로 반환한다", async () => {
      const saved: ProviderAccount = {
        provider: "openai",
        status: "authenticated",
        accountHint: "sk-...1234",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      vi.mocked(accountRepo.get).mockReturnValue(saved);

      const status = await manager.getStatus("openai");
      expect(status).toEqual(saved);
    });
  });

  // ── setApiKey ──

  describe("setApiKey", () => {
    it("유효한 API Key를 저장하고 authenticated를 반환한다", async () => {
      const result = await manager.setApiKey({
        provider: "openai",
        apiKey: "sk-1234567890abcdef",
      });

      expect(result.status).toBe("authenticated");
      expect(result.accountHint).toBe("sk-1...cdef");
      expect(secureStore.set).toHaveBeenCalledWith("openai", {
        accessToken: "sk-1234567890abcdef",
      });
    });

    it("빈 API Key는 error 상태를 반환한다", async () => {
      const result = await manager.setApiKey({
        provider: "openai",
        apiKey: "   ",
      });

      expect(result.status).toBe("error");
      expect(secureStore.set).not.toHaveBeenCalled();
    });

    it("짧은 API Key는 ****로 마스킹한다", async () => {
      const result = await manager.setApiKey({
        provider: "openai",
        apiKey: "short",
      });

      expect(result.accountHint).toBe("****");
    });
  });

  // ── logout ──

  describe("logout", () => {
    it("secureStore에서 삭제하고 unauthenticated를 반환한다", async () => {
      const result = await manager.logout("openai");

      expect(result.status).toBe("unauthenticated");
      expect(result.accountHint).toBeNull();
      expect(secureStore.delete).toHaveBeenCalledWith("openai");
    });
  });

  // ── getAccessToken ──

  describe("getAccessToken", () => {
    it("인증되지 않은 provider는 에러를 던진다", async () => {
      await expect(manager.getAccessToken("openai")).rejects.toThrow(
        "인증되지 않았어요",
      );
    });

    it("인증된 provider의 토큰을 반환한다", async () => {
      // 상태: authenticated
      vi.mocked(accountRepo.get).mockReturnValue({
        provider: "openai",
        status: "authenticated",
        accountHint: "sk-...1234",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      vi.mocked(secureStore.get).mockResolvedValue({
        accessToken: "sk-live-token",
      });

      const token = await manager.getAccessToken("openai");
      expect(token).toBe("sk-live-token");
    });

    it("토큰이 없으면 expired 상태로 전환하고 에러를 던진다", async () => {
      vi.mocked(accountRepo.get).mockReturnValue({
        provider: "openai",
        status: "authenticated",
        accountHint: "sk-...1234",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      vi.mocked(secureStore.get).mockResolvedValue(null);

      await expect(manager.getAccessToken("openai")).rejects.toThrow(
        "인증 정보가 없거나 만료",
      );
      expect(accountRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "expired" }),
      );
    });

    it("만료된 토큰이고 refreshToken이 없으면 에러를 던진다", async () => {
      vi.mocked(accountRepo.get).mockReturnValue({
        provider: "openai",
        status: "authenticated",
        accountHint: "hint",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      vi.mocked(secureStore.get).mockResolvedValue({
        accessToken: "expired-token",
        expiresAt: "2020-01-01T00:00:00.000Z", // 과거
      });

      await expect(manager.getAccessToken("openai")).rejects.toThrow(
        "토큰이 만료되었어요",
      );
    });
  });

  // ── getOAuthAvailability ──

  describe("getOAuthAvailability", () => {
    it("OAuth 미설정 시 모두 unavailable을 반환한다", async () => {
      const result = await manager.getOAuthAvailability();

      expect(result).toHaveLength(3);
      expect(result.every((r) => !r.available)).toBe(true);
    });
  });
});
