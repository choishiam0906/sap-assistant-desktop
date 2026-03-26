import type { Report } from "./reportGenerator.js";
import { logger } from "../logger.js";

export interface ExportResult {
  buffer: Buffer;
  format: "pdf" | "excel" | "html" | "csv";
  warning?: string;
}

/**
 * Report → PDF / Excel / HTML 내보내기.
 * - PDF: pdfmake (동적 import)
 * - Excel: exceljs (동적 import)
 * - HTML: 자체 템플릿
 */
export class ExportService {
  async toPdf(report: Report): Promise<ExportResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMake: any = await import("pdfmake");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfFonts: any = await import("pdfmake/build/vfs_fonts.js");

      const printer = new pdfMake.default({
        Roboto: {
          normal: Buffer.from(pdfFonts.pdfMake.vfs["Roboto-Regular.ttf"], "base64"),
          bold: Buffer.from(pdfFonts.pdfMake.vfs["Roboto-Medium.ttf"], "base64"),
        },
      });

      const docDef = {
        content: [
          { text: report.title, style: "header" },
          { text: `생성일: ${new Date(report.generatedAt).toLocaleString("ko-KR")}`, style: "subheader" },
          ...report.sections.flatMap((section) => [
            { text: section.title, style: "sectionHeader" },
            { text: section.content, style: "body" },
            ...(section.sources?.length
              ? [{ text: `출처: ${section.sources.map((s) => s.title).join(", ")}`, style: "sources" }]
              : []),
            { text: "", margin: [0, 10, 0, 0] as [number, number, number, number] },
          ]),
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] as [number, number, number, number] },
          subheader: { fontSize: 10, color: "#666", margin: [0, 0, 0, 20] as [number, number, number, number] },
          sectionHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] as [number, number, number, number] },
          body: { fontSize: 11, lineHeight: 1.5 },
          sources: { fontSize: 9, color: "#888", italics: true, margin: [0, 5, 0, 0] as [number, number, number, number] },
        },
      };

      const pdfDoc = printer.createPdfKitDocument(docDef);
      const chunks: Buffer[] = [];
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", reject);
        pdfDoc.end();
      });
      return { buffer, format: "pdf" };
    } catch (err) {
      logger.warn({ err }, "pdfmake를 사용할 수 없어요 — HTML 폴백");
      return {
        buffer: Buffer.from(this.toHtml(report), "utf-8"),
        format: "html",
        warning: "PDF 생성에 실패하여 HTML로 대체했어요",
      };
    }
  }

  async toExcel(report: Report): Promise<ExportResult> {
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Enterprise Knowledge Hub";
      workbook.created = new Date(report.generatedAt);

      const sheet = workbook.addWorksheet("리포트");

      // 헤더
      sheet.addRow([report.title]).font = { size: 16, bold: true };
      sheet.addRow([`생성일: ${new Date(report.generatedAt).toLocaleString("ko-KR")}`]);
      sheet.addRow([]);

      // 섹션별 내용
      for (const section of report.sections) {
        const headerRow = sheet.addRow([section.title]);
        headerRow.font = { size: 13, bold: true };

        // 내용을 줄 단위로 분할
        const lines = section.content.split("\n");
        for (const line of lines) {
          sheet.addRow([line]);
        }

        if (section.sources?.length) {
          const sourceRow = sheet.addRow([`출처: ${section.sources.map((s) => s.title).join(", ")}`]);
          sourceRow.font = { size: 9, italic: true, color: { argb: "FF888888" } };
        }

        sheet.addRow([]);
      }

      // 컬럼 너비
      sheet.getColumn(1).width = 100;

      return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), format: "excel" };
    } catch (err) {
      logger.warn({ err }, "exceljs를 사용할 수 없어요 — CSV 폴백");
      return {
        buffer: Buffer.from(this.toCsv(report), "utf-8"),
        format: "csv",
        warning: "Excel 생성에 실패하여 CSV로 대체했어요",
      };
    }
  }

  toHtml(report: Report): string {
    const sections = report.sections
      .map((s) => {
        const sources = s.sources?.length
          ? `<p class="sources">출처: ${s.sources.map((src) => src.title).join(", ")}</p>`
          : "";
        return `
          <section>
            <h2>${escapeHtml(s.title)}</h2>
            <div class="content">${escapeHtml(s.content).replace(/\n/g, "<br>")}</div>
            ${sources}
          </section>`;
      })
      .join("\n");

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: "Pretendard", "Segoe UI", sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #006edc; padding-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; color: #006edc; margin-top: 1.5rem; }
    .meta { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
    .content { line-height: 1.6; white-space: pre-wrap; }
    .sources { font-size: 0.8rem; color: #888; font-style: italic; margin-top: 0.5rem; }
    section { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  <p class="meta">생성일: ${new Date(report.generatedAt).toLocaleString("ko-KR")}</p>
  ${sections}
</body>
</html>`;
  }

  private toCsv(report: Report): string {
    const rows: string[] = [report.title, `생성일: ${report.generatedAt}`, ""];
    for (const section of report.sections) {
      rows.push(`[${section.title}]`, section.content, "");
    }
    return rows.join("\n");
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
