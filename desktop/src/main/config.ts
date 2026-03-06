/**
 * 앱 설정 — 환경 변수 + 기본값
 * .env 파일로 오버라이드 가능 (dotenv/config 으로 로드)
 */

interface AppConfig {
  // 윈도우
  windowWidth: number;
  windowHeight: number;

  // Provider API Base URLs
  openaiApiBaseUrl: string;
  anthropicApiBaseUrl: string;
  googleApiBaseUrl: string;

  // Backend
  backendApiBaseUrl: string;

  // CBO
  cboMaxFileSizeBytes: number;
  cboSupportedExtensions: string[];
}

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function loadConfig(): AppConfig {
  return {
    windowWidth: parseIntSafe(process.env.WINDOW_WIDTH, 1320),
    windowHeight: parseIntSafe(process.env.WINDOW_HEIGHT, 860),

    openaiApiBaseUrl:
      process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
    anthropicApiBaseUrl:
      process.env.ANTHROPIC_API_BASE_URL ?? "https://api.anthropic.com",
    googleApiBaseUrl:
      process.env.GOOGLE_API_BASE_URL ?? "https://generativelanguage.googleapis.com",

    backendApiBaseUrl:
      process.env.SAP_OPS_BACKEND_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1",

    cboMaxFileSizeBytes: parseIntSafe(process.env.CBO_MAX_FILE_SIZE_BYTES, 500_000),
    cboSupportedExtensions: parseList(
      process.env.CBO_SUPPORTED_EXTENSIONS,
      [".txt", ".md", ".abap", ".cbo"]
    ),
  };
}

export type { AppConfig };
