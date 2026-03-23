/**
 * SAP 운영 메일 분석 LLM 프롬프트 + 파서
 *
 * 파이프라인:
 *   메일 본문 → extractSapMetadata() → buildEmailAnalysisPrompt() → LLM → parseEmailAnalysis()
 */

// ─── SAP 메타데이터 사전 추출 ───

/** SAP T-Code 패턴 (2~6자 영문 + 선택적 숫자) */
const TCODE_REGEX = /\b(S[A-Z]\d{2}|[A-Z]{2,4}\d{1,3}[A-Z]?)\b/g;

/** 알려진 T-Code 집합 — false positive 필터링용 */
const KNOWN_TCODES = new Set([
  "ST22", "SM21", "SM37", "SM50", "SM51", "SM66", "SM04",
  "ST03N", "ST06", "ST05", "ST04", "ST02", "ST01",
  "SE80", "SE38", "SE11", "SE09", "SE10", "SE01", "SE16",
  "STMS", "SCC1", "SPRO", "SU53", "SU01",
  "AL08", "AL11",
  "DB02", "DB13",
  "SM36", "SM35", "SM12", "SM13",
  "PFCG", "SUIM",
  "LSMW", "SHDB",
  "ME21N", "ME22N", "ME23N",
  "VA01", "VA02", "VA03",
  "FB01", "FB03", "FS10N",
  "MM60", "MB51", "MB52",
  "XK01", "XK02", "XD01", "XD02",
  "MIGO", "MIRO",
  "VL01N", "VL02N",
  "CO01", "CO02", "KS01",
]);

/** SAP ABAP 에러 코드 패턴 */
const SAP_ERROR_REGEX = /\b(DBIF_RSQL_[A-Z_]+|TSV_[A-Z_]+|RAISE_EXCEPTION|MESSAGE_TYPE_[A-Z]|SAPSQL_[A-Z_]+|ABAP_[A-Z_]+|CX_[A-Z_]+|CONVT_[A-Z_]+|COMPUTE_[A-Z_]+)\b/g;

/** SAP 시스템 ID 패턴 (DEV, QAS, PRD 등) */
const SYSTEM_ID_REGEX = /\b(PRD|QAS|DEV|TST|SBX|PRE)\b/gi;

/** SAP 모듈 코드 */
const SAP_MODULES = ["FI", "CO", "MM", "SD", "PP", "BC", "PI", "BTP", "HR", "PM", "QM", "WM", "PS"] as const;
const MODULE_REGEX = new RegExp(`\\b(${SAP_MODULES.join("|")})\\b`, "g");

export interface SapEmailMetadata {
  tcodes: string[];
  errorCodes: string[];
  systemIds: string[];
  modules: string[];
}

/** 메일 본문과 제목에서 SAP 관련 메타데이터를 추출한다. */
export function extractSapMetadata(subject: string, body: string): SapEmailMetadata {
  const text = `${subject}\n${body}`;

  const rawTcodes = text.match(TCODE_REGEX) ?? [];
  const tcodes = [...new Set(rawTcodes.map((t) => t.toUpperCase()).filter((t) => KNOWN_TCODES.has(t)))];

  const rawErrors = text.match(SAP_ERROR_REGEX) ?? [];
  const errorCodes = [...new Set(rawErrors)];

  const rawSystems = text.match(SYSTEM_ID_REGEX) ?? [];
  const systemIds = [...new Set(rawSystems.map((s) => s.toUpperCase()))];

  const rawModules = text.match(MODULE_REGEX) ?? [];
  const modules = [...new Set(rawModules)];

  return { tcodes, errorCodes, systemIds, modules };
}

// ─── 프롬프트 빌드 ───

/**
 * SAP 운영 메일 분석 프롬프트를 생성한다.
 * extractSapMetadata()로 사전 추출한 힌트를 프롬프트에 포함하여 LLM 분석 정확도를 높인다.
 */
export function buildEmailAnalysisPrompt(subject: string, body: string, fromName?: string): string {
  const meta = extractSapMetadata(subject, body);

  const hints: string[] = [];
  if (meta.tcodes.length > 0) hints.push(`- 감지된 T-Code: ${meta.tcodes.join(", ")}`);
  if (meta.errorCodes.length > 0) hints.push(`- 감지된 에러 코드: ${meta.errorCodes.join(", ")}`);
  if (meta.systemIds.length > 0) hints.push(`- 감지된 시스템: ${meta.systemIds.join(", ")}`);
  if (meta.modules.length > 0) hints.push(`- 감지된 SAP 모듈: ${meta.modules.join(", ")}`);

  return [
    "당신은 SAP ERP 운영 메일 분석 전문가입니다.",
    "아래 메일을 읽고, SAP 운영 관점에서 수행해야 할 업무(ActionItem)를 추출하세요.",
    "",
    "## 응답 형식 (JSON)",
    "```json",
    "{",
    '  "planTitle": "메일 기반 Closing Plan 제목",',
    '  "planDescription": "전체 요약 (1~2문장)",',
    '  "targetDate": "YYYY-MM-DD (가장 늦은 마감일)",',
    '  "sapModule": "주요 SAP 모듈 (FI/CO/MM/SD/BC 등, 해당 없으면 null)",',
    '  "detectedTcodes": ["관련 T-Code 목록"],',
    '  "systemId": "대상 시스템 (PRD/QAS/DEV, 알 수 없으면 null)",',
    '  "actionItems": [',
    "    {",
    '      "title": "업무 제목",',
    '      "deadline": "YYYY-MM-DD",',
    '      "assignee": "담당자 (알 수 없으면 null)"',
    "    }",
    "  ]",
    "}",
    "```",
    "",
    "## 규칙",
    "- 마감일이 명시되지 않으면 메일 수신일 + 7일을 기본으로 설정",
    "- actionItems가 없으면 빈 배열 반환",
    "- planTitle은 `[메일] {핵심 주제} — {발신자}` 형태",
    "- SAP T-Code가 언급되면 detectedTcodes에 포함",
    "- 장애/에러 메일이면 actionItem에 원인 분석과 확인 절차를 포함",
    "- 반드시 JSON만 응답 (마크다운 코드블록 포함 가능)",
    "",
    ...(hints.length > 0
      ? ["## SAP 사전 분석 힌트", ...hints, ""]
      : []),
    "## 메일 정보",
    `- 발신자: ${fromName ?? "알 수 없음"}`,
    `- 제목: ${subject}`,
    "",
    "## 메일 본문",
    body.slice(0, 8000),
  ].join("\n");
}

// ─── 분석 결과 타입 ───

export interface EmailAnalysisResult {
  planTitle: string;
  planDescription: string;
  targetDate: string;
  sapModule?: string | null;
  detectedTcodes?: string[];
  systemId?: string | null;
  actionItems: Array<{
    title: string;
    deadline: string;
    assignee?: string | null;
  }>;
}

// ─── 파서 ───

/** LLM 응답 문자열에서 JSON을 파싱한다. 다양한 응답 형식에 대응한다. */
export function parseEmailAnalysis(raw: string): EmailAnalysisResult {
  // 1단계: 마크다운 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
  let cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();

  // 2단계: JSON 객체 경계 추출 — LLM이 JSON 앞뒤에 텍스트를 추가한 경우
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  const parsed = JSON.parse(cleaned) as EmailAnalysisResult;

  if (!parsed.planTitle || !parsed.targetDate || !Array.isArray(parsed.actionItems)) {
    throw new Error("메일 분석 결과 형식이 올바르지 않습니다.");
  }

  // detectedTcodes가 없으면 빈 배열로 정규화
  if (!Array.isArray(parsed.detectedTcodes)) {
    parsed.detectedTcodes = [];
  }

  return parsed;
}
