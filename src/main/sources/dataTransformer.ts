/**
 * Data Transformer — 다양한 데이터 포맷(JSON, CSV, XML)을 SourceDocument 호환 객체로 변환
 *
 * 용도: 외부 데이터 소스(REST API, 파일 공유)를 Knowledge Hub 인덱싱 형식으로 정규화
 */

// ── 타입 ──

export interface TransformedDocument {
  title: string;
  content: string;
  metadata: Record<string, string>;
}

// ── JSON 변환 ──

/**
 * JSON 데이터를 TransformedDocument 배열로 변환.
 * dataPath를 통해 중첩된 배열을 추출할 수 있음 (예: "results.items", "data[0].records")
 */
export function transformJson(data: unknown, dataPath?: string): TransformedDocument[] {
  const docs: TransformedDocument[] = [];

  // 경로 없음 — 최상단이 배열이어야 함
  if (!dataPath) {
    if (!Array.isArray(data)) {
      throw new Error("JSON 최상단이 배열이어야 해요. dataPath를 지정하거나 배열 형식으로 변환해주세요.");
    }
    return data.map((item) => documentFromJsonItem(item));
  }

  // 경로 지정 — 중첩된 배열 추출
  const extracted = extractByPath(data, dataPath);
  if (!Array.isArray(extracted)) {
    throw new Error(`dataPath "${dataPath}"에서 배열을 찾을 수 없어요.`);
  }

  return extracted.map((item) => documentFromJsonItem(item));
}

function documentFromJsonItem(item: unknown): TransformedDocument {
  if (typeof item === "object" && item !== null && !Array.isArray(item)) {
    const obj = item as Record<string, unknown>;
    const title = String(obj.title || obj.name || obj.id || "Untitled");
    const content =
      typeof obj.content === "string"
        ? obj.content
        : typeof obj.description === "string"
          ? obj.description
          : JSON.stringify(obj, null, 2);
    const metadata = objectToMetadata(obj);
    return { title, content, metadata };
  }

  // 원시값 — 문자열 변환
  const content = String(item);
  return {
    title: content.slice(0, 100),
    content,
    metadata: {},
  };
}

function extractByPath(data: unknown, path: string): unknown {
  const parts = path.split(/\.|\[|\]/).filter((p) => p && p !== "");
  let current = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

// ── CSV 변환 ──

/**
 * CSV 텍스트를 TransformedDocument 배열로 변환.
 * 간단한 파서 — 따옴표, 이스케이프 처리 최소화
 */
export function transformCsv(csvText: string): TransformedDocument[] {
  const lines = csvText.trim().split("\n");
  if (lines.length === 0) {
    return [];
  }

  // 헤더 파싱
  const header = parseCSVLine(lines[0]);
  const docs: TransformedDocument[] = [];

  // 행 파싱
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = values[j] ?? "";
    }

    const title = obj.title || obj.name || `Row ${i}`;
    const content = Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const metadata = obj;

    docs.push({ title, content, metadata });
  }

  return docs;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // 연속된 두 개 따옴표 → 이스케이프
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);

  return values.map((v) => v.trim());
}

// ── XML 변환 ──

/**
 * XML 텍스트를 TransformedDocument 배열로 변환.
 * 정규식 기반 — 복잡한 XML 파싱 라이브러리 미사용
 *
 * 예상 형식:
 * <items>
 *   <item>
 *     <title>...</title>
 *     <content>...</content>
 *   </item>
 * </items>
 */
export function transformXml(xmlText: string): TransformedDocument[] {
  const docs: TransformedDocument[] = [];

  // <item>...</item> 또는 <record>...</record> 등의 요소 추출
  const itemRegex = /<(item|record|document|entry)[\s>]([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[2];

    // 태그별 추출
    const title = extractXmlTag(itemContent, "title") || extractXmlTag(itemContent, "name") || "Untitled";
    const content = extractXmlTag(itemContent, "content") || extractXmlTag(itemContent, "description") || itemContent;

    // 모든 태그를 메타데이터로 수집
    const metadata: Record<string, string> = {};
    const tagRegex = /<([^>\s]+)>([^<]*)<\/\1>/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(itemContent)) !== null) {
      metadata[tagMatch[1]] = tagMatch[2];
    }

    docs.push({ title, content, metadata });
  }

  return docs;
}

function extractXmlTag(content: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
  const match = content.match(regex);
  return match ? match[1] : null;
}

// ── 유틸 ──

function objectToMetadata(obj: Record<string, unknown>): Record<string, string> {
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && typeof value !== "object") {
      metadata[key] = String(value);
    }
  }
  return metadata;
}
