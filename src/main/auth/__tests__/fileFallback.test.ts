import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// electron app mock — userData 경로를 임시 디렉토리로 설정
const tempDir = mkdtempSync(join(tmpdir(), "secure-store-test-"));

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name === "userData") return tempDir;
      return tempDir;
    },
    getName: () => "sap-knowledge-hub-test",
  },
}));

import { fileFallback } from "../fileFallback.js";

describe("fileFallback (AES-256-GCM)", () => {
  afterEach(() => {
    // 테스트 간 저장소 파일 정리
    const storePath = join(tempDir, "secure-store.enc");
    if (existsSync(storePath)) {
      rmSync(storePath);
    }
  });

  it("존재하지 않는 키에 대해 null을 반환한다", () => {
    const result = fileFallback.get("nonexistent");
    expect(result).toBeNull();
  });

  it("set → get으로 값을 저장하고 조회한다", () => {
    fileFallback.set("test-key", '{"accessToken":"tok-123"}');

    const result = fileFallback.get("test-key");
    expect(result).toBe('{"accessToken":"tok-123"}');
  });

  it("여러 키를 독립적으로 관리한다", () => {
    fileFallback.set("key-a", "value-a");
    fileFallback.set("key-b", "value-b");

    expect(fileFallback.get("key-a")).toBe("value-a");
    expect(fileFallback.get("key-b")).toBe("value-b");
  });

  it("delete 후 null을 반환한다", () => {
    fileFallback.set("to-delete", "some-value");
    fileFallback.delete("to-delete");

    expect(fileFallback.get("to-delete")).toBeNull();
  });

  it("같은 키에 set을 다시 호출하면 덮어쓴다", () => {
    fileFallback.set("overwrite", "old");
    fileFallback.set("overwrite", "new");

    expect(fileFallback.get("overwrite")).toBe("new");
  });

  it("암호화된 파일이 실제로 생성된다", () => {
    fileFallback.set("persist-test", "data");

    const storePath = join(tempDir, "secure-store.enc");
    expect(existsSync(storePath)).toBe(true);
  });

  it("delete 후 다른 키는 영향받지 않는다", () => {
    fileFallback.set("keep", "kept-value");
    fileFallback.set("remove", "removed-value");
    fileFallback.delete("remove");

    expect(fileFallback.get("keep")).toBe("kept-value");
    expect(fileFallback.get("remove")).toBeNull();
  });
});
