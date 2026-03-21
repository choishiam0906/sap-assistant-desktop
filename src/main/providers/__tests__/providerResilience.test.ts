import { ProviderResilience } from "../providerResilience.js";

vi.mock("../../logger.js", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

describe("ProviderResilience", () => {
  let resilience: ProviderResilience;

  beforeEach(() => {
    resilience = new ProviderResilience();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── withRetry ───

  describe("withRetry", () => {
    it("첫 시도에 성공하면 즉시 반환", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await resilience.withRetry(fn);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("실패 후 재시도하여 성공", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue("ok");

      const promise = resilience.withRetry(fn, 2);
      await vi.advanceTimersByTimeAsync(1000); // 첫 번째 백오프
      const result = await promise;

      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("최대 재시도 후 에러 throw", async () => {
      vi.useRealTimers();
      // maxRetries=0으로 즉시 실패 (지연 없음)
      const fn = vi.fn().mockRejectedValue(new Error("persistent"));

      await expect(resilience.withRetry(fn, 0)).rejects.toThrow("persistent");
      expect(fn).toHaveBeenCalledTimes(1);

      // fake timers 복원 (afterEach 호환)
      vi.useFakeTimers();
    });
  });

  // ─── withCircuitBreaker ───

  describe("withCircuitBreaker", () => {
    it("정상 호출 통과", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await resilience.withCircuitBreaker("openai", fn);
      expect(result).toBe("ok");
    });

    it("5회 연속 실패 후 서킷 오픈", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      for (let i = 0; i < 5; i++) {
        await expect(resilience.withCircuitBreaker("openai", fn)).rejects.toThrow("fail");
      }

      // 6번째 호출은 서킷 오픈으로 즉시 거부
      await expect(resilience.withCircuitBreaker("openai", fn)).rejects.toThrow("서킷 브레이커 오픈");
    });

    it("서킷 리셋 후 half-open 허용", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));

      for (let i = 0; i < 5; i++) {
        await expect(resilience.withCircuitBreaker("openai", fn)).rejects.toThrow();
      }

      // 30초 경과 → half-open
      vi.advanceTimersByTime(31_000);
      fn.mockResolvedValue("recovered");

      const result = await resilience.withCircuitBreaker("openai", fn);
      expect(result).toBe("recovered");
    });

    it("성공 시 실패 카운터 리셋", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce("ok")
        .mockRejectedValueOnce(new Error("fail"))
        .mockRejectedValueOnce(new Error("fail"));

      await expect(resilience.withCircuitBreaker("openai", fn)).rejects.toThrow();
      await expect(resilience.withCircuitBreaker("openai", fn)).rejects.toThrow();
      await resilience.withCircuitBreaker("openai", fn); // 성공 → 리셋
      await expect(resilience.withCircuitBreaker("openai", fn)).rejects.toThrow();
      await expect(resilience.withCircuitBreaker("openai", fn)).rejects.toThrow();

      // 총 4회 실패이지만 중간 성공으로 리셋되어 서킷은 닫힌 상태
      fn.mockResolvedValue("still-ok");
      const result = await resilience.withCircuitBreaker("openai", fn);
      expect(result).toBe("still-ok");
    });
  });

  // ─── withFallback ───

  describe("withFallback", () => {
    it("Primary 성공 시 그 결과 반환", async () => {
      const result = await resilience.withFallback(
        () => Promise.resolve("primary"),
        () => Promise.resolve("fallback"),
      );
      expect(result).toBe("primary");
    });

    it("Primary 실패 시 Fallback 실행", async () => {
      const result = await resilience.withFallback(
        () => Promise.reject(new Error("fail")),
        () => Promise.resolve("fallback"),
      );
      expect(result).toBe("fallback");
    });

    it("둘 다 실패 시 Fallback 에러 throw", async () => {
      await expect(
        resilience.withFallback(
          () => Promise.reject(new Error("primary-fail")),
          () => Promise.reject(new Error("fallback-fail")),
        ),
      ).rejects.toThrow("fallback-fail");
    });
  });

  // ─── withProviderCall (통합) ───

  describe("withProviderCall", () => {
    it("retry + circuit breaker 통합 동작", async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount <= 1) throw new Error("transient");
        return "ok";
      });

      const promise = resilience.withProviderCall("openai", fn);
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBe("ok");
    });
  });
});
