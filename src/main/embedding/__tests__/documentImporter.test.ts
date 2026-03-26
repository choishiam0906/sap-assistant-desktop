import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

// vi.hoisted로 호이스팅된 vi.mock 내부에서 참조 가능하게 선언
const { mockedReadFile } = vi.hoisted(() => ({
  mockedReadFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => {
  return {
    default: { readFile: mockedReadFile },
    readFile: mockedReadFile,
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
  };
});

import { DocumentImporter } from "../documentImporter.js";

describe("DocumentImporter", () => {
  const importer = new DocumentImporter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("파일 확장자 검증", () => {
    it("허용되지 않는 확장자를 거부한다", async () => {
      await expect(importer.parseFile("/tmp/test.exe")).rejects.toThrow(
        "지원하지 않는 파일 형식이에요",
      );
      // readFile이 호출되지 않아야 함 (확장자 검증이 먼저)
      expect(mockedReadFile).not.toHaveBeenCalled();
    });

    it(".py 확장자를 거부한다", async () => {
      await expect(importer.parseFile("/tmp/script.py")).rejects.toThrow(
        "지원하지 않는 파일 형식이에요",
      );
    });

    it(".zip 확장자를 거부한다", async () => {
      await expect(importer.parseFile("/tmp/archive.zip")).rejects.toThrow(
        "지원하지 않는 파일 형식이에요",
      );
    });

    it("허용된 확장자를 처리한다 (.txt)", async () => {
      mockedReadFile.mockResolvedValue(Buffer.from("테스트 내용"));

      const result = await importer.parseFile("/tmp/test.txt");
      expect(result.title).toBe("test.txt");
      expect(result.content).toBe("테스트 내용");
      expect(result.metadata.format).toBe("txt");
    });

    it("허용된 확장자를 처리한다 (.md)", async () => {
      mockedReadFile.mockResolvedValue(Buffer.from("# 제목\n본문"));

      const result = await importer.parseFile("/tmp/readme.md");
      expect(result.title).toBe("readme.md");
      expect(result.content).toContain("# 제목");
      expect(result.metadata.format).toBe("md");
    });

    it("허용된 확장자를 처리한다 (.csv)", async () => {
      mockedReadFile.mockResolvedValue(Buffer.from("a,b,c\n1,2,3"));

      const result = await importer.parseFile("/tmp/data.csv");
      expect(result.metadata.format).toBe("csv");
    });

    it("대소문자를 구분하지 않는다", async () => {
      mockedReadFile.mockResolvedValue(Buffer.from("test"));

      const result = await importer.parseFile("/tmp/TEST.TXT");
      expect(result.content).toBe("test");
    });
  });

  describe("파일 크기 제한", () => {
    it("50MB 초과 파일을 거부한다", async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      mockedReadFile.mockResolvedValue(largeBuffer);

      await expect(importer.parseFile("/tmp/huge.txt")).rejects.toThrow(
        "최대 50MB까지 지원해요",
      );
    });

    it("50MB 이하 파일은 정상 처리한다", async () => {
      const okBuffer = Buffer.from("정상 크기 파일");
      mockedReadFile.mockResolvedValue(okBuffer);

      const result = await importer.parseFile("/tmp/small.txt");
      expect(result.content).toBe("정상 크기 파일");
    });
  });

  describe("parseText", () => {
    it("텍스트 파일의 메타데이터를 올바르게 설정한다", () => {
      const result = importer.parseText("내용", ".json", "config.json");
      expect(result.title).toBe("config.json");
      expect(result.metadata.format).toBe("json");
    });

    it("기본 제목을 사용한다", () => {
      const result = importer.parseText("내용", ".txt");
      expect(result.title).toBe("document.txt");
    });
  });
});
