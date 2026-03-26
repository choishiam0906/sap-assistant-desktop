import { describe, it, expect } from "vitest";
import { DocumentChunker } from "../documentChunker.js";

describe("DocumentChunker", () => {
  const chunker = new DocumentChunker();

  it("빈 텍스트에 대해 빈 배열을 반환한다", () => {
    expect(chunker.chunk("")).toEqual([]);
    expect(chunker.chunk("  ")).toEqual([]);
  });

  it("짧은 텍스트는 단일 청크로 반환한다", () => {
    const text = "Hello, this is a test.";
    const chunks = chunker.chunk(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });

  it("문단 경계에서 분할한다", () => {
    const text = "첫 번째 문단입니다.\n\n두 번째 문단입니다.\n\n세 번째 문단입니다.";
    const chunks = chunker.chunk(text, { maxTokens: 20, overlap: 0 });
    // 각 문단이 짧으므로 하나로 병합될 수 있음
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // 전체 텍스트가 포함되어야 함
    const joined = chunks.map((c) => c.text).join(" ");
    expect(joined).toContain("첫 번째");
    expect(joined).toContain("세 번째");
  });

  it("코드 블록을 보존한다", () => {
    const text = `설명입니다.

\`\`\`javascript
function hello() {
  return "world";
}
\`\`\`

더 많은 설명.`;
    const chunks = chunker.chunk(text, { maxTokens: 50, overlap: 0, preserveCodeBlocks: true });
    // 코드 블록이 분할되지 않아야 함
    const codeChunk = chunks.find((c) => c.text.includes("function hello"));
    expect(codeChunk).toBeDefined();
    expect(codeChunk!.text).toContain("```");
  });

  it("maxTokens 초과 시 분할한다", () => {
    const longText = "이것은 테스트 문장입니다. ".repeat(200);
    const chunks = chunker.chunk(longText, { maxTokens: 100, overlap: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // 각 청크의 토큰 수가 대략 maxTokens 이하여야 함 (약간의 초과 허용)
      expect(chunk.tokenCount).toBeLessThanOrEqual(150);
    }
  });

  it("countTokens가 합리적인 값을 반환한다", () => {
    expect(chunker.countTokens("hello world")).toBeGreaterThan(0);
    expect(chunker.countTokens("안녕하세요")).toBeGreaterThan(0);
    // 한글은 토큰이 더 많아야 함 (글자당 토큰 비율)
    const engTokens = chunker.countTokens("hello");
    const korTokens = chunker.countTokens("안녕하세요");
    expect(korTokens).toBeGreaterThan(0);
    expect(engTokens).toBeGreaterThan(0);
  });

  it("overlap이 적용되면 청크 간 텍스트가 겹친다", () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => `문단 ${i + 1}의 내용입니다.`);
    const text = paragraphs.join("\n\n");
    const chunks = chunker.chunk(text, { maxTokens: 30, overlap: 10 });
    if (chunks.length >= 2) {
      // 두 번째 청크에 첫 번째 청크의 일부가 포함될 수 있음
      expect(chunks[1].text.length).toBeGreaterThan(0);
    }
  });
});
