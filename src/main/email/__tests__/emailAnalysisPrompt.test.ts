import { describe, it, expect } from "vitest";
import {
  extractSapMetadata,
  buildEmailAnalysisPrompt,
  parseEmailAnalysis,
} from "../emailAnalysisPrompt.js";

// ─── extractSapMetadata ───

describe("extractSapMetadata", () => {
  it("메일 본문에서 T-Code를 추출한다", () => {
    const meta = extractSapMetadata(
      "ST22 덤프 발생 건",
      "PRD 시스템에서 SM21 로그 확인 후 SM50 프로세스 상태를 점검하세요.",
    );
    expect(meta.tcodes).toContain("ST22");
    expect(meta.tcodes).toContain("SM21");
    expect(meta.tcodes).toContain("SM50");
  });

  it("알려지지 않은 T-Code는 필터링한다", () => {
    const meta = extractSapMetadata("", "ABCD 코드는 무시되어야 합니다. SM21은 포함.");
    expect(meta.tcodes).toEqual(["SM21"]);
  });

  it("SAP 에러 코드를 추출한다", () => {
    const meta = extractSapMetadata(
      "",
      "DBIF_RSQL_SQL_ERROR 에러가 발생했습니다. TSV_TNEW_PAGE_ALLOC_FAILED도 확인.",
    );
    expect(meta.errorCodes).toContain("DBIF_RSQL_SQL_ERROR");
    expect(meta.errorCodes).toContain("TSV_TNEW_PAGE_ALLOC_FAILED");
  });

  it("시스템 ID를 추출한다", () => {
    const meta = extractSapMetadata("PRD 장애", "QAS에서는 정상 동작합니다.");
    expect(meta.systemIds).toEqual(expect.arrayContaining(["PRD", "QAS"]));
  });

  it("SAP 모듈을 추출한다", () => {
    const meta = extractSapMetadata("FI 결산", "CO 원가센터와 MM 재고 검토 필요");
    expect(meta.modules).toEqual(expect.arrayContaining(["FI", "CO", "MM"]));
  });

  it("중복을 제거한다", () => {
    const meta = extractSapMetadata("SM21 SM21", "SM21 로그를 SM21에서 확인");
    expect(meta.tcodes).toEqual(["SM21"]);
  });

  it("SAP 관련 내용이 없으면 빈 배열을 반환한다", () => {
    const meta = extractSapMetadata("회의록", "내일 오후 3시 미팅입니다.");
    expect(meta.tcodes).toEqual([]);
    expect(meta.errorCodes).toEqual([]);
    expect(meta.systemIds).toEqual([]);
    expect(meta.modules).toEqual([]);
  });
});

// ─── buildEmailAnalysisPrompt ───

describe("buildEmailAnalysisPrompt", () => {
  it("SAP 전용 프롬프트를 생성한다", () => {
    const prompt = buildEmailAnalysisPrompt(
      "FI 결산 마감 요청",
      "3월 결산을 위해 FB01 전기 작업을 완료해주세요.",
      "박영수",
    );
    expect(prompt).toContain("SAP ERP 운영 메일 분석 전문가");
    expect(prompt).toContain("발신자: 박영수");
    expect(prompt).toContain("FI 결산 마감 요청");
  });

  it("T-Code가 감지되면 힌트 섹션을 포함한다", () => {
    const prompt = buildEmailAnalysisPrompt(
      "ST22 덤프 긴급",
      "PRD에서 ST22 덤프가 반복 발생 중입니다. SM21 로그도 확인 필요.",
    );
    expect(prompt).toContain("## SAP 사전 분석 힌트");
    expect(prompt).toContain("ST22");
    expect(prompt).toContain("SM21");
    expect(prompt).toContain("PRD");
  });

  it("SAP 메타데이터가 없으면 힌트 섹션을 생략한다", () => {
    const prompt = buildEmailAnalysisPrompt(
      "회의 일정 변경",
      "내일 회의가 오후 2시로 변경되었습니다.",
    );
    expect(prompt).not.toContain("## SAP 사전 분석 힌트");
  });

  it("에러 코드 힌트를 포함한다", () => {
    const prompt = buildEmailAnalysisPrompt(
      "ABAP 덤프",
      "DBIF_RSQL_SQL_ERROR가 발생하여 조사 중입니다.",
    );
    expect(prompt).toContain("DBIF_RSQL_SQL_ERROR");
    expect(prompt).toContain("감지된 에러 코드");
  });

  it("본문 8000자를 초과하면 잘라낸다", () => {
    const longBody = "A".repeat(10000);
    const prompt = buildEmailAnalysisPrompt("제목", longBody);
    expect(prompt.length).toBeLessThan(10000 + 500); // 프롬프트 헤더 + 8000자
  });

  it("발신자가 없으면 '알 수 없음'으로 표시한다", () => {
    const prompt = buildEmailAnalysisPrompt("제목", "본문");
    expect(prompt).toContain("발신자: 알 수 없음");
  });

  it("응답 형식에 sapModule, detectedTcodes, systemId를 포함한다", () => {
    const prompt = buildEmailAnalysisPrompt("제목", "본문");
    expect(prompt).toContain("sapModule");
    expect(prompt).toContain("detectedTcodes");
    expect(prompt).toContain("systemId");
  });
});

// ─── parseEmailAnalysis ───

describe("parseEmailAnalysis", () => {
  const validJson = JSON.stringify({
    planTitle: "[메일] FI 결산 — 박영수",
    planDescription: "3월 FI 결산 관련 2건 처리",
    targetDate: "2026-03-31",
    sapModule: "FI",
    detectedTcodes: ["FB01", "FS10N"],
    systemId: "PRD",
    actionItems: [
      { title: "GL 전기", deadline: "2026-03-28", assignee: "이민수" },
      { title: "잔액 검증", deadline: "2026-03-30", assignee: null },
    ],
  });

  it("정상 JSON을 파싱한다", () => {
    const result = parseEmailAnalysis(validJson);
    expect(result.planTitle).toBe("[메일] FI 결산 — 박영수");
    expect(result.actionItems).toHaveLength(2);
    expect(result.sapModule).toBe("FI");
    expect(result.detectedTcodes).toEqual(["FB01", "FS10N"]);
    expect(result.systemId).toBe("PRD");
  });

  it("마크다운 코드블록으로 감싸진 JSON을 파싱한다", () => {
    const wrapped = "```json\n" + validJson + "\n```";
    const result = parseEmailAnalysis(wrapped);
    expect(result.planTitle).toBe("[메일] FI 결산 — 박영수");
  });

  it("JSON 앞뒤에 텍스트가 있어도 파싱한다", () => {
    const messy = "분석 결과입니다:\n" + validJson + "\n이상입니다.";
    const result = parseEmailAnalysis(messy);
    expect(result.planTitle).toBe("[메일] FI 결산 — 박영수");
  });

  it("detectedTcodes가 없으면 빈 배열로 정규화한다", () => {
    const noTcodes = JSON.stringify({
      planTitle: "[메일] 회의 — 김철수",
      planDescription: "회의 안건",
      targetDate: "2026-04-01",
      actionItems: [],
    });
    const result = parseEmailAnalysis(noTcodes);
    expect(result.detectedTcodes).toEqual([]);
  });

  it("planTitle이 없으면 에러를 던진다", () => {
    const invalid = JSON.stringify({
      planDescription: "설명",
      targetDate: "2026-04-01",
      actionItems: [],
    });
    expect(() => parseEmailAnalysis(invalid)).toThrow("형식이 올바르지 않습니다");
  });

  it("targetDate가 없으면 에러를 던진다", () => {
    const invalid = JSON.stringify({
      planTitle: "제목",
      planDescription: "설명",
      actionItems: [],
    });
    expect(() => parseEmailAnalysis(invalid)).toThrow("형식이 올바르지 않습니다");
  });

  it("actionItems가 배열이 아니면 에러를 던진다", () => {
    const invalid = JSON.stringify({
      planTitle: "제목",
      planDescription: "설명",
      targetDate: "2026-04-01",
      actionItems: "not array",
    });
    expect(() => parseEmailAnalysis(invalid)).toThrow("형식이 올바르지 않습니다");
  });

  it("완전히 유효하지 않은 문자열이면 에러를 던진다", () => {
    expect(() => parseEmailAnalysis("이것은 JSON이 아닙니다")).toThrow();
  });
});
