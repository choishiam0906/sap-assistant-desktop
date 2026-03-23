// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { createCallbackServer, type CallbackServer } from "../callbackServer.js";

describe("createCallbackServer", () => {
  let server: CallbackServer | null = null;

  afterEach(() => {
    if (server) {
      // close() 시 발생하는 reject를 미리 소비해 unhandled rejection 방지
      server.promise.catch(() => {});
      server.close();
      server = null;
    }
  });

  it("사용 가능한 포트에 바인딩한다", async () => {
    server = await createCallbackServer();
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it("고정 포트를 지정하면 해당 포트에 바인딩한다", async () => {
    server = await createCallbackServer({ port: 6499 });
    expect(server.url).toBe("http://127.0.0.1:6499");
  });

  it("code와 state가 포함된 콜백을 수신한다", async () => {
    server = await createCallbackServer({ port: 6498 });

    // 콜백 요청 시뮬레이션
    const fetchPromise = fetch(
      `${server.url}/callback?code=test-code&state=test-state`,
    );

    const result = await server.promise;
    expect(result.code).toBe("test-code");
    expect(result.state).toBe("test-state");

    const response = await fetchPromise;
    expect(response.status).toBe(200);
  });

  it("커스텀 callbackPath를 사용한다", async () => {
    server = await createCallbackServer({
      port: 6497,
      callbackPath: "/auth/callback",
    });

    const fetchPromise = fetch(
      `${server.url}/auth/callback?code=abc&state=xyz`,
    );

    const result = await server.promise;
    expect(result.code).toBe("abc");
    expect(result.state).toBe("xyz");
    await fetchPromise;
  });

  it("잘못된 경로에 404를 반환한다", async () => {
    server = await createCallbackServer({ port: 6496 });

    const response = await fetch(`${server.url}/wrong-path`);
    expect(response.status).toBe(404);
  });

  it("error 파라미터가 있으면 reject한다", async () => {
    server = await createCallbackServer({ port: 6495 });

    void fetch(`${server.url}/callback?error=access_denied`);

    await expect(server.promise).rejects.toThrow("OAuth 에러: access_denied");
  });

  it("close()를 호출하면 취소된다", async () => {
    server = await createCallbackServer({ port: 6494 });

    server.close();

    await expect(server.promise).rejects.toThrow("OAuth 취소됨");
  });
});
