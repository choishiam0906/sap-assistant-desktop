import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  initiateDeviceCode,
  pollDeviceCode,
  cancelDeviceCode,
} from "../githubDeviceCode.js";
import type { AppConfig } from "../../config.js";

vi.mock("../../logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockConfig = {
  githubCopilotClientId: "test-client-id",
} as AppConfig;

describe("githubDeviceCode", () => {
  beforeEach(() => {
    cancelDeviceCode();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cancelDeviceCode();
    vi.useRealTimers();
  });

  describe("initiateDeviceCode", () => {
    it("GitHub에 device code를 요청하고 결과를 반환한다", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            device_code: "dc-123",
            user_code: "ABCD-1234",
            verification_uri: "https://github.com/login/device",
            expires_in: 900,
            interval: 5,
          }),
        }),
      );

      const result = await initiateDeviceCode(mockConfig);

      expect(result.userCode).toBe("ABCD-1234");
      expect(result.verificationUri).toBe(
        "https://github.com/login/device",
      );
      expect(result.expiresIn).toBe(900);
      expect(result.interval).toBe(5);
    });

    it("Client ID가 없으면 에러를 던진다", async () => {
      const noIdConfig = { githubCopilotClientId: "" } as AppConfig;

      await expect(initiateDeviceCode(noIdConfig)).rejects.toThrow(
        "Client ID가 설정되지 않았어요",
      );
    });

    it("GitHub API 에러 시 에러를 던진다", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 422,
          text: async () => "Validation failed",
        }),
      );

      await expect(initiateDeviceCode(mockConfig)).rejects.toThrow(
        "Device Code 요청 실패 (422)",
      );
    });
  });

  describe("pollDeviceCode", () => {
    it("pending이 없으면 에러를 던진다", async () => {
      await expect(pollDeviceCode()).rejects.toThrow(
        "진행 중인 Device Code 인증이 없어요",
      );
    });

    it("access_token을 받으면 반환한다", async () => {
      let callCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string) => {
          if (url.includes("device/code")) {
            return {
              ok: true,
              json: async () => ({
                device_code: "dc-123",
                user_code: "ABCD-1234",
                verification_uri: "https://github.com/login/device",
                expires_in: 900,
                interval: 5,
              }),
            };
          }
          callCount++;
          if (callCount === 1) {
            return {
              ok: true,
              json: async () => ({ error: "authorization_pending" }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              access_token: "gho_test_token",
              token_type: "bearer",
              scope: "read:user",
            }),
          };
        }),
      );

      await initiateDeviceCode(mockConfig);
      const promise = pollDeviceCode();

      // sleep(5000) 두 번 (pending 1회 + success 1회) → 타이머 충분히 진행
      await vi.advanceTimersByTimeAsync(15000);

      const token = await promise;
      expect(token).toBe("gho_test_token");
    });

    it("expired_token 에러를 처리한다", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string) => {
          if (url.includes("device/code")) {
            return {
              ok: true,
              json: async () => ({
                device_code: "dc-123",
                user_code: "ABCD-1234",
                verification_uri: "https://github.com/login/device",
                expires_in: 900,
                interval: 5,
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({ error: "expired_token" }),
          };
        }),
      );

      await initiateDeviceCode(mockConfig);
      const promise = pollDeviceCode();
      promise.catch(() => {}); // unhandled rejection 방지

      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow("만료되었어요");
    });

    it("access_denied 에러를 처리한다", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string) => {
          if (url.includes("device/code")) {
            return {
              ok: true,
              json: async () => ({
                device_code: "dc-123",
                user_code: "ABCD-1234",
                verification_uri: "https://github.com/login/device",
                expires_in: 900,
                interval: 5,
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({ error: "access_denied" }),
          };
        }),
      );

      await initiateDeviceCode(mockConfig);
      const promise = pollDeviceCode();
      promise.catch(() => {}); // unhandled rejection 방지

      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow("거부되었어요");
    });
  });

  describe("cancelDeviceCode", () => {
    it("pending이 없어도 에러 없이 동작한다", () => {
      expect(() => cancelDeviceCode()).not.toThrow();
    });
  });
});
