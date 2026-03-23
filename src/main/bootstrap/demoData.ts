/**
 * P4: External Demo — 데모 시드 데이터
 *
 * 5개 SAP 운영 시나리오별 샘플 이메일 + 대응 Closing Plan/Steps + Email-Plan 링크
 * 첫 실행 시 email_inbox 테이블이 비어있으면 자동 삽입됨
 */

import { logger } from "../logger.js";
import type { Repositories } from "./createRepositories.js";

// ─── 헬퍼 ───

/** 오늘 기준 상대 날짜 (YYYY-MM-DD) */
function relativeDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** 오늘 기준 상대 ISO datetime */
function relativeIso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

// ─── 시나리오 정의 ───

interface DemoScenario {
  email: {
    sourceId: string;
    providerMessageId: string;
    fromEmail: string;
    fromName: string;
    subject: string;
    bodyText: string;
    receivedAtOffset: number; // 오늘 기준 상대일
    labels: string[];
    provider: string;
  };
  plan: {
    title: string;
    description: string;
    type: "custom" | "monthly";
    targetDateOffset: number;
  };
  steps: Array<{
    title: string;
    description?: string;
    assignee?: string;
    module?: string;
    deadlineOffset: number;
    completed?: boolean;
  }>;
  aiSummary: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  // ─── 1. ST22 ABAP 덤프 긴급 ───
  {
    email: {
      sourceId: "demo-gmail",
      providerMessageId: "demo-st22-dump-001",
      fromEmail: "park.basis@company.co.kr",
      fromName: "박준혁 (Basis)",
      subject: "[긴급] PRD ST22 덤프 반복 발생 — DBIF_RSQL_SQL_ERROR",
      bodyText: [
        "안녕하세요, SAP Basis팀 박준혁입니다.",
        "",
        "오늘 오전 9시부터 PRD 시스템에서 ST22 덤프가 반복 발생하고 있습니다.",
        "에러 유형: DBIF_RSQL_SQL_ERROR",
        "관련 프로그램: SAPLFKKC (FI-CA 모듈)",
        "",
        "SM21 시스템 로그 확인 결과, 동일 시간대에 DB 연결 타임아웃 로그가 다수 발견되었습니다.",
        "SM50에서 DIA 프로세스 3개가 'Waiting for DB' 상태로 행(hang) 중입니다.",
        "",
        "현재 DB02에서 확인한 테이블 DFKKKO의 인덱스 상태가 비정상적입니다.",
        "인덱스 재구성이 필요할 것으로 보입니다.",
        "",
        "조치 요청:",
        "1. ST22 덤프 분석 및 근본 원인 파악",
        "2. DB02 인덱스 상태 점검",
        "3. SM50 행 프로세스 조치",
        "",
        "긴급 대응 부탁드립니다.",
      ].join("\n"),
      receivedAtOffset: -1,
      labels: ["INBOX", "IMPORTANT"],
      provider: "demo",
    },
    plan: {
      title: "[메일] PRD ST22 덤프 대응 — 박준혁",
      description: "PRD DBIF_RSQL_SQL_ERROR 반복 덤프 원인 분석 및 DB 인덱스 점검",
      type: "custom",
      targetDateOffset: 1,
    },
    steps: [
      {
        title: "ST22 덤프 호출 스택 분석",
        description: "SAPLFKKC 프로그램의 DBIF_RSQL_SQL_ERROR 호출 스택을 분석하여 문제 SQL 식별",
        assignee: "박준혁",
        module: "BC",
        deadlineOffset: 0,
        completed: true,
      },
      {
        title: "DB02 인덱스 상태 점검",
        description: "DFKKKO 테이블 인덱스 fragmentation 확인 및 재구성",
        module: "BC",
        deadlineOffset: 0,
      },
      {
        title: "SM50 행 프로세스 조치",
        description: "DIA 프로세스 Waiting for DB 상태 해소 — 필요 시 프로세스 킬",
        assignee: "박준혁",
        module: "BC",
        deadlineOffset: 0,
      },
      {
        title: "현업 보고 및 사후 분석서 작성",
        description: "장애 원인, 조치 내역, 재발 방지 대책 문서화",
        module: "BC",
        deadlineOffset: 1,
      },
    ],
    aiSummary: "PRD ST22 ABAP 덤프(DBIF_RSQL_SQL_ERROR) 반복 발생. DB 인덱스 점검 및 프로세스 행 조치 필요.",
  },

  // ─── 2. 3월 월말 결산 요청 ───
  {
    email: {
      sourceId: "demo-gmail",
      providerMessageId: "demo-closing-march-001",
      fromEmail: "kim.fi@company.co.kr",
      fromName: "김서연 (FI)",
      subject: "3월 FI 결산 마감 일정 및 업무 분담",
      bodyText: [
        "안녕하세요, FI팀 김서연입니다.",
        "",
        "3월 결산 마감 일정을 아래와 같이 공유드립니다.",
        "",
        "■ 일정:",
        "- 3/28(금): FB01 미전기 전표 처리 완료",
        "- 3/29(토): FS10N 잔액 검증",
        "- 3/30(일): CO 원가센터 배부 (KS01 확인)",
        "- 3/31(월): 최종 마감 확정 및 보고",
        "",
        "■ 담당:",
        "- FI 전기: 이민수",
        "- CO 배부: 정하나",
        "- 잔액 검증: 김서연",
        "",
        "각 담당자는 마감일 준수 부탁드립니다.",
        "FB03에서 전표 상태를 확인하시고, 미결 건이 있으면 즉시 알려주세요.",
      ].join("\n"),
      receivedAtOffset: -2,
      labels: ["INBOX"],
      provider: "demo",
    },
    plan: {
      title: "[메일] 3월 FI 결산 마감 — 김서연",
      description: "FI/CO 3월 결산 마감 4건 처리 — 전기, 잔액 검증, 원가 배부, 최종 확정",
      type: "monthly",
      targetDateOffset: 7,
    },
    steps: [
      {
        title: "FB01 미전기 전표 처리",
        description: "3월 미전기 전표를 모두 전기 처리",
        assignee: "이민수",
        module: "FI",
        deadlineOffset: 4,
        completed: true,
      },
      {
        title: "FS10N 잔액 검증",
        description: "GL 잔액 대사 및 차이 분석",
        assignee: "김서연",
        module: "FI",
        deadlineOffset: 5,
      },
      {
        title: "CO 원가센터 배부 (KS01)",
        description: "원가센터별 배부 실행 및 결과 검증",
        assignee: "정하나",
        module: "CO",
        deadlineOffset: 6,
      },
      {
        title: "최종 마감 확정 및 보고",
        description: "마감 결과 최종 확인 후 경영진 보고",
        assignee: "김서연",
        module: "FI",
        deadlineOffset: 7,
      },
    ],
    aiSummary: "3월 FI/CO 결산 마감. FB01 전기, FS10N 잔액 검증, KS01 원가 배부, 최종 보고 4건.",
  },

  // ─── 3. Transport 배포 승인 요청 ───
  {
    email: {
      sourceId: "demo-gmail",
      providerMessageId: "demo-transport-001",
      fromEmail: "lee.dev@company.co.kr",
      fromName: "이지호 (ABAP)",
      subject: "Transport DEVK9A0123 → PRD 배포 승인 요청",
      bodyText: [
        "안녕하세요, ABAP팀 이지호입니다.",
        "",
        "아래 Transport의 PRD 배포 승인을 요청드립니다.",
        "",
        "■ Transport 정보:",
        "- TR#: DEVK9A0123",
        "- 변경 내용: ZFI_REPORT_001 프로그램 수정 (인터페이스 필드 추가)",
        "- 영향 범위: FI 모듈 — 재무 보고서 출력 로직",
        "",
        "■ 테스트 이력:",
        "- DEV 단위 테스트: 완료 (SE38 실행 정상)",
        "- QAS 통합 테스트: 완료 (SE80 코드 인스펙터 통과)",
        "",
        "■ STMS 경로: DEV → QAS → PRD",
        "- DEV→QAS import: 완료 (3/20)",
        "- QAS 테스트: 완료 (3/21)",
        "- PRD import: 승인 대기",
        "",
        "선행 Transport: 없음",
        "기타: 객체 잠금 충돌 없음 (SE09 확인)",
        "",
        "승인 부탁드립니다.",
      ].join("\n"),
      receivedAtOffset: -1,
      labels: ["INBOX"],
      provider: "demo",
    },
    plan: {
      title: "[메일] Transport DEVK9A0123 배포 — 이지호",
      description: "ZFI_REPORT_001 프로그램 수정 Transport PRD 배포 승인 및 컷오버",
      type: "custom",
      targetDateOffset: 2,
    },
    steps: [
      {
        title: "Transport 변경 객체 리뷰",
        description: "SE09에서 객체 목록 확인, 의존성 검증",
        assignee: "이지호",
        module: "BC",
        deadlineOffset: 0,
        completed: true,
      },
      {
        title: "STMS PRD import 승인",
        description: "STMS에서 Transport DEVK9A0123 PRD import 승인 처리",
        module: "BC",
        deadlineOffset: 1,
      },
      {
        title: "PRD import 후 검증",
        description: "SE38에서 ZFI_REPORT_001 실행하여 정상 동작 확인",
        assignee: "이지호",
        module: "FI",
        deadlineOffset: 2,
      },
    ],
    aiSummary: "Transport DEVK9A0123 PRD 배포 승인 요청. ZFI_REPORT_001 FI 보고서 수정. QAS 테스트 완료.",
  },

  // ─── 4. SM50 프로세스 행(hang) ───
  {
    email: {
      sourceId: "demo-gmail",
      providerMessageId: "demo-sm50-hang-001",
      fromEmail: "choi.basis@company.co.kr",
      fromName: "최동우 (Basis)",
      subject: "[주의] PRD SM50 DIA 프로세스 포화 — 사용자 응답 지연",
      bodyText: [
        "안녕하세요, Basis팀 최동우입니다.",
        "",
        "현재 PRD 시스템에서 DIA 워크 프로세스 포화가 발생하고 있습니다.",
        "",
        "SM50 현황:",
        "- 총 DIA 프로세스: 20개",
        "- Running: 18개 (90% 점유)",
        "- Waiting (RFC): 5개",
        "- Waiting (Enqueue): 3개",
        "",
        "SM66에서 확인한 장시간 실행 프로세스:",
        "- 사용자 BATCH_USER / 프로그램 ZSAP_FI_BATCH_001 / 실행시간 45분",
        "- 사용자 ADMIN / 프로그램 SAPLSMTR_NAVIGATION / 실행시간 30분",
        "",
        "SM04에서 확인한 동시 접속: 158명 (평소 대비 +40%)",
        "AL08에서 확인한 전체 인스턴스 사용자: 312명",
        "",
        "BTC 프로세스는 정상 (8/10 사용 중, 여유 있음).",
        "SM21에서 'DIA shortage' 이벤트가 10분 간격으로 기록되고 있습니다.",
        "",
        "즉시 대응 요청드립니다.",
      ].join("\n"),
      receivedAtOffset: 0,
      labels: ["INBOX", "IMPORTANT"],
      provider: "demo",
    },
    plan: {
      title: "[메일] PRD DIA 프로세스 포화 대응 — 최동우",
      description: "PRD SM50 DIA 90% 점유 — 장시간 프로세스 조치 및 리소스 경합 분석",
      type: "custom",
      targetDateOffset: 1,
    },
    steps: [
      {
        title: "장시간 실행 프로세스 분석",
        description: "SM66에서 45분+ 실행 프로세스의 호출 스택 확인 — 킬 여부 판단",
        assignee: "최동우",
        module: "BC",
        deadlineOffset: 0,
      },
      {
        title: "Enqueue 락 확인 및 해소",
        description: "SM12에서 잠금 엔트리 확인 — 불필요한 잠금 해제",
        module: "BC",
        deadlineOffset: 0,
      },
      {
        title: "DIA 프로세스 추가 검토",
        description: "rdisp/wp_no_dia 파라미터 임시 조정 필요 여부 판단",
        assignee: "최동우",
        module: "BC",
        deadlineOffset: 1,
      },
      {
        title: "재발 방지 분석 보고",
        description: "동시 접속 급증 원인 분석 — 배치 스케줄 조정 또는 DIA 증설 권고",
        module: "BC",
        deadlineOffset: 1,
      },
    ],
    aiSummary: "PRD DIA 프로세스 90% 포화. 장시간 실행 프로세스 2건, RFC/Enqueue 대기 다수. 즉시 조치 필요.",
  },

  // ─── 5. 성능 저하 보고 ───
  {
    email: {
      sourceId: "demo-gmail",
      providerMessageId: "demo-perf-slow-001",
      fromEmail: "jung.sd@company.co.kr",
      fromName: "정민서 (SD)",
      subject: "PRD VA01 수주 입력 응답 시간 급증 — 사용자 민원",
      bodyText: [
        "안녕하세요, SD팀 정민서입니다.",
        "",
        "오늘 오전부터 PRD에서 VA01 수주 입력 트랜잭션의 응답 시간이 급증하고 있습니다.",
        "기존 평균 2초 → 현재 15-20초까지 증가하여 사용자 민원이 접수되고 있습니다.",
        "",
        "ST03N에서 확인한 VA01 통계:",
        "- 평균 응답 시간: 18,500ms (전주 평균: 2,100ms)",
        "- DB 시간 비중: 82% (전주: 35%)",
        "- 호출 빈도: 시간당 1,200건",
        "",
        "ST05 SQL 트레이스를 잠시 걸어본 결과,",
        "VBAK 테이블에 대한 풀스캔 쿼리가 반복 실행되고 있었습니다.",
        "최근 커스텀 프로그램 배포 후 발생한 것으로 추정됩니다.",
        "",
        "조치 요청:",
        "1. ST05 SQL 트레이스 정밀 분석",
        "2. VBAK 관련 인덱스 확인 (SE11)",
        "3. 최근 Transport 배포 이력 조회 (STMS)",
        "",
        "사용자 영향이 크므로 빠른 대응 부탁드립니다.",
      ].join("\n"),
      receivedAtOffset: 0,
      labels: ["INBOX", "IMPORTANT"],
      provider: "demo",
    },
    plan: {
      title: "[메일] VA01 성능 저하 대응 — 정민서",
      description: "PRD VA01 응답 시간 급증(2초→18초) — DB 시간 82%로 SQL 튜닝 필요",
      type: "custom",
      targetDateOffset: 2,
    },
    steps: [
      {
        title: "ST05 SQL 트레이스 정밀 분석",
        description: "VA01 실행 중 SQL 트레이스 수집 — 문제 SQL 식별 및 실행 계획 분석",
        assignee: "박준혁",
        module: "BC",
        deadlineOffset: 0,
      },
      {
        title: "VBAK 인덱스 점검 및 튜닝",
        description: "SE11에서 VBAK 인덱스 현황 확인, 누락 인덱스 생성 또는 기존 인덱스 최적화",
        module: "BC",
        deadlineOffset: 1,
      },
      {
        title: "최근 Transport 배포 영향 분석",
        description: "STMS/SE09에서 VA01 관련 최근 Transport 배포 이력 확인 — 롤백 필요 여부 판단",
        assignee: "이지호",
        module: "SD",
        deadlineOffset: 1,
      },
      {
        title: "튜닝 적용 후 응답 시간 검증",
        description: "ST03N에서 VA01 응답 시간 추이 확인 — 정상 수준(2초) 복귀 여부",
        assignee: "정민서",
        module: "SD",
        deadlineOffset: 2,
      },
    ],
    aiSummary: "VA01 수주 입력 응답 18초(정상 2초). DB 시간 82%, VBAK 풀스캔 의심. SQL 튜닝 + Transport 롤백 검토.",
  },
];

// ─── 시딩 함수 ───

export function seedDemoData(repos: Repositories): void {
  // email_inbox가 비어있을 때만 시딩
  const existing = repos.emailInboxRepo.list({ limit: 1 });
  if (existing.length > 0) {
    logger.debug("데모 이메일이 이미 존재 — 시딩 건너뜀");
    return;
  }

  logger.info("데모 시드 데이터 삽입 시작 (5개 시나리오)");

  for (const scenario of DEMO_SCENARIOS) {
    // 1. 이메일 삽입
    const email = repos.emailInboxRepo.create({
      sourceId: scenario.email.sourceId,
      providerMessageId: scenario.email.providerMessageId,
      fromEmail: scenario.email.fromEmail,
      fromName: scenario.email.fromName,
      subject: scenario.email.subject,
      bodyText: scenario.email.bodyText,
      receivedAt: relativeIso(scenario.email.receivedAtOffset),
      labels: scenario.email.labels,
      provider: scenario.email.provider,
    });

    // 2. Closing Plan 삽입
    const plan = repos.closingPlanRepo.create({
      title: scenario.plan.title,
      description: scenario.plan.description,
      type: scenario.plan.type,
      targetDate: relativeDate(scenario.plan.targetDateOffset),
    });

    // 3. Steps 삽입
    for (const stepDef of scenario.steps) {
      const step = repos.closingStepRepo.create({
        planId: plan.id,
        title: stepDef.title,
        description: stepDef.description,
        assignee: stepDef.assignee,
        module: stepDef.module as import("../contracts.js").DomainLabel | undefined,
        deadline: relativeDate(stepDef.deadlineOffset),
      });

      // 일부 step을 completed로 마킹 (데모 진행도 시각화)
      if (stepDef.completed) {
        repos.closingStepRepo.update(step.id, { status: "completed" });
      }
    }

    // 4. 진행도 재계산
    repos.closingPlanRepo.recalcProgress(plan.id);

    // 5. 이메일-Plan 링크
    repos.emailTaskLinkRepo.create({
      emailId: email.id,
      planId: plan.id,
      aiSummary: scenario.aiSummary,
    });

    // 6. 이메일 처리 완료 마킹
    repos.emailInboxRepo.markProcessed(email.id);
  }

  logger.info("데모 시드 데이터 삽입 완료 — 이메일 5건, Plan 5건");
}
