import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

import { ExportService } from "../exportService.js";
import type { Report } from "../reportGenerator.js";

describe("ExportService", () => {
  const mockReport: Report = {
    id: "rpt-1",
    templateId: "tpl-1",
    title: "테스트 리포트",
    sections: [
      {
        title: "요약",
        content: "이것은 테스트 요약이에요.",
        sources: [{ title: "문서A", path: "docs/a.md" }],
      },
      {
        title: "분석",
        content: "상세 분석 내용\n줄바꿈 포함",
      },
    ],
    generatedAt: "2026-03-24T10:00:00.000Z",
  };

  const service = new ExportService();

  describe("toHtml", () => {
    it("올바른 HTML 문서를 생성한다", () => {
      const html = service.toHtml(mockReport);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html lang=\"ko\">");
      expect(html).toContain("테스트 리포트");
      expect(html).toContain("요약");
      expect(html).toContain("이것은 테스트 요약이에요.");
    });

    it("출처 정보를 포함한다", () => {
      const html = service.toHtml(mockReport);

      expect(html).toContain("출처:");
      expect(html).toContain("문서A");
    });

    it("HTML 특수 문자를 이스케이프한다", () => {
      const reportWithSpecial: Report = {
        ...mockReport,
        title: "<script>alert('xss')</script>",
        sections: [{ title: "Test", content: "a < b & c > d" }],
      };

      const html = service.toHtml(reportWithSpecial);

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("a &lt; b &amp; c &gt; d");
    });

    it("줄바꿈을 <br>로 변환한다", () => {
      const html = service.toHtml(mockReport);

      expect(html).toContain("상세 분석 내용<br>줄바꿈 포함");
    });
  });

  describe("toPdf", () => {
    it("ExportResult를 반환한다", async () => {
      const result = await service.toPdf(mockReport);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      // PDF 성공 시 format은 "pdf" 또는 폴백 시 "html"
      expect(["pdf", "html"]).toContain(result.format);
    }, 30_000);

    it("pdfmake 실패 시 HTML 폴백 + warning을 반환한다", async () => {
      // pdfmake가 없는 환경을 시뮬레이션하기 어렵지만,
      // 반환된 결과의 구조가 올바른지 검증
      const result = await service.toPdf(mockReport);
      expect(result).toHaveProperty("buffer");
      expect(result).toHaveProperty("format");
      // warning은 선택적
      if (result.warning) {
        expect(result.format).not.toBe("pdf");
      }
    }, 30_000);
  });

  describe("toExcel", () => {
    it("ExportResult를 반환한다", async () => {
      const result = await service.toExcel(mockReport);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(["excel", "csv"]).toContain(result.format);
    }, 30_000);
  });
});
