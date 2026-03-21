/**
 * 언어별 코드 분석 프롬프트 템플릿
 */

const LANGUAGE_HINTS: Record<string, string> = {
  typescript: "TypeScript/JavaScript 모범 사례를 기준으로 분석",
  javascript: "JavaScript 모범 사례를 기준으로 분석",
  python: "PEP 8 및 Python 모범 사례를 기준으로 분석",
  java: "Java 코딩 컨벤션 및 Spring 패턴을 기준으로 분석",
  abap: "SAP ABAP Clean Code 가이드라인을 기준으로 분석",
  go: "Go 공식 스타일 가이드를 기준으로 분석",
  rust: "Rust 관용 패턴 및 안전성을 기준으로 분석",
};

export function buildCodeAnalysisPrompt(filePath: string, content: string, language?: string): string {
  const langHint = language ? (LANGUAGE_HINTS[language.toLowerCase()] ?? `${language} 모범 사례를 기준으로 분석`) : "일반적인 코딩 모범 사례를 기준으로 분석";

  return [
    "당신은 시니어 코드 리뷰어입니다.",
    `${langHint}하세요.`,
    "",
    "## 응답 형식 (JSON)",
    "```json",
    "{",
    '  "risks": [',
    '    { "severity": "high|medium|low", "title": "리스크 제목", "detail": "상세 설명", "line": null }',
    "  ],",
    '  "recommendations": [',
    '    { "title": "권장사항 제목", "detail": "상세 설명", "priority": "high|medium|low" }',
    "  ],",
    '  "complexityScore": 0.0',
    "}",
    "```",
    "",
    "## 규칙",
    "- complexityScore: 0.0(단순) ~ 1.0(매우 복잡), 소수점 1자리",
    "- risks가 없으면 빈 배열",
    "- 보안 취약점(SQL Injection, XSS 등)은 severity: high",
    "- 성능 문제는 severity: medium",
    "- 코딩 스타일/가독성은 severity: low",
    "- 반드시 JSON만 응답 (마크다운 코드블록 포함 가능)",
    "",
    `## 파일: ${filePath}`,
    "",
    content.slice(0, 12000),
  ].join("\n");
}

/** 파일 확장자로 언어 감지 */
export function detectLanguage(filePath: string): string | undefined {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    java: "java",
    kt: "kotlin",
    go: "go",
    rs: "rust",
    abap: "abap",
    rb: "ruby",
    php: "php",
    cs: "csharp",
    cpp: "cpp",
    c: "c",
    swift: "swift",
    sql: "sql",
    sh: "shell",
    yaml: "yaml",
    yml: "yaml",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
  };
  return ext ? map[ext] : undefined;
}
