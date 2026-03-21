/**
 * 메일 분석 LLM 프롬프트 템플릿
 * 메일 본문에서 액션 아이템(업무, 마감일)을 추출한다.
 */
export function buildEmailAnalysisPrompt(subject: string, body: string, fromName?: string): string {
  return [
    "당신은 업무 메일 분석 전문가입니다.",
    "아래 메일을 읽고, 수행해야 할 업무(ActionItem)를 추출하세요.",
    "",
    "## 응답 형식 (JSON)",
    "```json",
    "{",
    '  "planTitle": "메일 기반 Closing Plan 제목",',
    '  "planDescription": "전체 요약 (1~2문장)",',
    '  "targetDate": "YYYY-MM-DD (가장 늦은 마감일)",',
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
    "- 반드시 JSON만 응답 (마크다운 코드블록 포함 가능)",
    "",
    "## 메일 정보",
    `- 발신자: ${fromName ?? "알 수 없음"}`,
    `- 제목: ${subject}`,
    "",
    "## 메일 본문",
    body.slice(0, 8000),
  ].join("\n");
}

export interface EmailAnalysisResult {
  planTitle: string;
  planDescription: string;
  targetDate: string;
  actionItems: Array<{
    title: string;
    deadline: string;
    assignee?: string | null;
  }>;
}

/** LLM 응답 문자열에서 JSON을 파싱한다. */
export function parseEmailAnalysis(raw: string): EmailAnalysisResult {
  // 마크다운 코드블록 제거
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned) as EmailAnalysisResult;

  if (!parsed.planTitle || !parsed.targetDate || !Array.isArray(parsed.actionItems)) {
    throw new Error("메일 분석 결과 형식이 올바르지 않습니다.");
  }

  return parsed;
}
