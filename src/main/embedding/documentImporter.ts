import { readFile } from "node:fs/promises";
import { extname, basename } from "node:path";
import { logger } from "../logger.js";

export interface ParsedDocument {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

/**
 * 다양한 파일 형식을 텍스트로 파싱한다.
 * - PDF: pdf-parse
 * - Word (.docx): mammoth
 * - Excel (.xlsx): xlsx
 * - 텍스트: .txt, .md, .csv 등 직접 읽기
 */
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".docx", ".xlsx", ".xls",
  ".txt", ".md", ".csv", ".log", ".json", ".xml", ".yaml", ".yml",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export class DocumentImporter {
  async parseFile(filePath: string): Promise<ParsedDocument> {
    const ext = extname(filePath).toLowerCase();
    const title = basename(filePath);

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`지원하지 않는 파일 형식이에요: ${ext} (지원: ${[...ALLOWED_EXTENSIONS].join(", ")})`);
    }

    const buffer = await readFile(filePath);

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`파일 크기가 ${Math.round(buffer.length / 1024 / 1024)}MB예요. 최대 50MB까지 지원해요.`);
    }

    switch (ext) {
      case ".pdf":
        return this.parsePdf(buffer, title);
      case ".docx":
        return this.parseDocx(buffer, title);
      case ".xlsx":
      case ".xls":
        return this.parseXlsx(buffer, title);
      default:
        return this.parseText(buffer.toString("utf-8"), ext, title);
    }
  }

  async parsePdf(buffer: Buffer, title = "document.pdf"): Promise<ParsedDocument> {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      await parser.destroy();
      return {
        title,
        content: textResult.text,
        metadata: {
          format: "pdf",
          pages: String(infoResult.total),
        },
      };
    } catch (err) {
      logger.error({ err }, "PDF 파싱 실패");
      throw new Error(`PDF 파싱 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async parseDocx(buffer: Buffer, title = "document.docx"): Promise<ParsedDocument> {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return {
        title,
        content: result.value,
        metadata: { format: "docx" },
      };
    } catch (err) {
      logger.error({ err }, "Word 파싱 실패");
      throw new Error(`Word 파싱 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async parseXlsx(buffer: Buffer, title = "document.xlsx"): Promise<ParsedDocument> {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        sheets.push(`[시트: ${sheetName}]\n${csv}`);
      }

      return {
        title,
        content: sheets.join("\n\n"),
        metadata: {
          format: "xlsx",
          sheets: String(workbook.SheetNames.length),
        },
      };
    } catch (err) {
      logger.error({ err }, "Excel 파싱 실패");
      throw new Error(`Excel 파싱 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  parseText(content: string, ext: string, title = "document.txt"): ParsedDocument {
    return {
      title,
      content,
      metadata: { format: ext.replace(".", "") },
    };
  }
}
