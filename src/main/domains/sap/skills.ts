import type { SkillDefinition, SkillPackDefinition } from "../../types/source.js";

export const SAP_PRESET_SKILLS: SkillDefinition[] = [
  // ─── CBO / 개발 영역 ───
  {
    id: "cbo-impact-analysis",
    title: "CBO 변경 영향 분석",
    description:
      "CBO 소스와 추출물을 읽고 영향 범위, 리스크, 검증 체크포인트를 정리합니다.",
    supportedDataTypes: ["chat", "cbo"],
    defaultPromptTemplate:
      "당신은 SAP 운영팀의 CBO 유지보수 리뷰어입니다. 변경 영향, 리스크, 점검 항목을 구조적으로 정리하세요.",
    outputFormat: "structured-report",
    requiredSources: ["current-cbo-run", "vault-confidential"],
    suggestedInputs: [
      "이 변경이 어떤 객체와 운영 시나리오에 영향을 주는지 정리해줘",
      "배포 전 점검 체크리스트를 만들어줘",
      "리스크를 우선순위별로 다시 설명해줘",
    ],
    domainCodes: ["SE80", "SE11", "SE38", "STMS"],
  },

  // ─── Transport 영역 (강화) ───
  {
    id: "transport-risk-review",
    title: "Transport 리스크 리뷰",
    description:
      "Transport 추출물 기준으로 변경 범위, 의존성, STMS 경로 리스크를 종합 검토합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate: [
      "SAP transport 검토자로서 다음 관점에서 리스크를 분석하세요:",
      "1. 객체 유형별 변경 범위 (프로그램, 테이블, 딕셔너리 등)",
      "2. Transport 간 의존성 — 선행 transport가 누락되면 import 실패 가능성",
      "3. STMS 경로 검증 — DEV→QAS→PRD 순서 준수 여부, 직접 PRD import 경고",
      "4. 객체 잠금 충돌 — 동일 객체를 수정 중인 다른 transport 존재 여부",
      "5. 컷오버 체크리스트 — import 순서, 후행 작업(활성화, 캐시 갱신 등)",
      "결과는 [리스크 등급: 상/중/하] 태그와 함께 구조화하세요.",
    ].join("\n"),
    outputFormat: "structured-report",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "이 transport의 배포 리스크를 검토해줘",
      "승인 코멘트에 넣을 요약을 작성해줘",
      "컷오버 전에 꼭 확인할 항목을 알려줘",
      "이 transport가 의존하는 선행 transport를 확인해줘",
    ],
    domainCodes: ["SE09", "SE10", "STMS", "SE01"],
  },

  // ─── 장애 트리아지 (강화) ───
  {
    id: "incident-triage",
    title: "운영 장애 트리아지",
    description:
      "ST22 덤프, SM21 시스템 로그, SM37 배치 로그를 분석하여 원인 후보와 점검 순서를 정리합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate: [
      "SAP Basis/운영 장애 분석가로서 다음 절차로 트리아지하세요:",
      "1. 증상 분류 — ABAP 덤프(ST22), 시스템 로그(SM21), 배치 실패(SM37), 프로세스 행(SM50) 중 해당 유형 식별",
      "2. ST22 덤프 분석 시: 에러 유형(DBIF_RSQL_SQL_ERROR, TSV_TNEW_PAGE_ALLOC_FAILED 등), 호출 스택, 관련 프로그램/트랜잭션 파악",
      "3. SM21 시스템 로그 분석 시: 이벤트 ID, 사용자, 시간대, 반복 패턴 확인",
      "4. 원인 후보를 가능성 순으로 나열하고, 각 후보마다 확인할 T-Code와 점검 절차 제시",
      "5. 즉시 적용 가능한 임시 우회책이 있으면 리스크와 함께 제시",
      "6. 현업 보고용 1-문단 요약 작성",
    ].join("\n"),
    outputFormat: "checklist",
    requiredSources: ["vault-reference"],
    suggestedInputs: [
      "이 ST22 덤프의 원인과 해결 방법을 분석해줘",
      "SM21 로그에서 반복되는 에러 패턴을 찾아줘",
      "이 증상에서 먼저 볼 로그와 T-Code를 알려줘",
      "현업 보고용 장애 요약을 작성해줘",
      "가장 가능성 높은 원인을 우선순위로 정리해줘",
    ],
    domainCodes: ["ST22", "SM21", "SM37", "SM50", "SM51", "SU53", "ST01"],
  },

  // ─── Runbook 작성 (강화) ───
  {
    id: "ops-runbook-writer",
    title: "운영 Runbook 작성",
    description:
      "분석 결과를 SAP T-Code 참조가 포함된 운영 절차서, 인수인계 메모, 변경 승인 코멘트로 변환합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate: [
      "SAP 운영 문서 작성자로서 다음 형식으로 문서를 작성하세요:",
      "1. 제목과 목적 (1줄)",
      "2. 전제 조건 — 필요 권한, 선행 작업, 관련 T-Code",
      "3. 절차 — 단계별 T-Code와 실행 경로, 입력 값, 예상 결과",
      "4. 검증 — 절차 완료 후 확인 방법 (T-Code, 예상 화면/값)",
      "5. 롤백 — 문제 발생 시 복구 절차",
      "6. 인수인계 노트 — 다음 담당자가 알아야 할 핵심 사항",
      "문서는 짧고 명확하게, SAP 운영자가 바로 따라할 수 있는 수준으로 작성하세요.",
    ].join("\n"),
    outputFormat: "structured-report",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "운영자 인수인계 메모 형식으로 정리해줘",
      "현업 공유용 요약을 작성해줘",
      "배포 승인 코멘트 템플릿으로 바꿔줘",
      "이 절차의 롤백 시나리오를 추가해줘",
    ],
    domainCodes: ["SM37", "SM36", "SCC1", "SPRO"],
  },

  // ─── 프로세스 모니터링 (신규) ───
  {
    id: "process-monitor",
    title: "프로세스 모니터링 분석",
    description:
      "SM50/SM66 프로세스 개요를 분석하여 행(hang) 프로세스, 장시간 실행, 리소스 경합을 진단합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate: [
      "SAP Basis 엔지니어로서 워크 프로세스 상태를 분석하세요:",
      "1. SM50/SM66 출력에서 프로세스 상태별 분류 — Running, Waiting, On Hold, Stopped",
      "2. 장시간 실행 프로세스 식별 — 실행 시간, 사용자, 프로그램, T-Code",
      "3. 행(Hang) 프로세스 진단 — RFC 대기, Enqueue 대기, DB 락 등 원인 파악",
      "4. 리소스 경합 분석 — DIA/BTC/UPD 프로세스 포화 여부, Extended Memory 사용량",
      "5. 권장 조치 — 프로세스 킬(SM50), 사용자 알림, 배치 리스케줄링, 시스템 파라미터 조정",
      "심각도를 [긴급/주의/정보] 태그로 구분하세요.",
    ].join("\n"),
    outputFormat: "checklist",
    requiredSources: ["vault-reference"],
    suggestedInputs: [
      "SM50에서 행(hang) 걸린 프로세스를 분석해줘",
      "현재 워크 프로세스 상태가 정상인지 판단해줘",
      "DIA 프로세스가 부족한 것 같은데 원인을 찾아줘",
      "장시간 실행 중인 배치를 정리해줘",
    ],
    domainCodes: ["SM50", "SM66", "SM04", "SM51", "AL08", "SM21"],
  },

  // ─── 성능 분석 (신규) ───
  {
    id: "perf-analysis",
    title: "성능 분석 및 병목 진단",
    description:
      "ST03N 워크로드 통계와 ST06 OS 모니터 데이터를 분석하여 성능 병목과 튜닝 포인트를 진단합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate: [
      "SAP 성능 분석가로서 워크로드와 시스템 리소스를 분석하세요:",
      "1. ST03N 워크로드 분석 — 응답 시간 분해(DB 시간, ABAP 시간, 네트워크 시간), 사용자별/T-Code별 Top-N",
      "2. 응답 시간 이상치 — 평균 대비 높은 응답 시간 트랜잭션 식별",
      "3. DB 시간 비중이 높으면: 인덱스 누락, 비효율 SQL, 테이블 버퍼링 미적용 가능성 제시",
      "4. ST06 OS 모니터 — CPU, 메모리, 디스크 I/O, 스왑 사용량 분석",
      "5. 종합 진단 — 병목 지점(DB, Application, OS), 영향 범위, 튜닝 권장 사항",
      "각 권장 사항에 관련 T-Code(ST05, SE30, ST04, DB02 등)를 포함하세요.",
    ].join("\n"),
    outputFormat: "structured-report",
    requiredSources: ["vault-reference"],
    suggestedInputs: [
      "ST03N 통계를 분석해서 느린 트랜잭션을 찾아줘",
      "응답 시간이 갑자기 늘어난 원인을 분석해줘",
      "DB 시간이 높은 원인과 해결 방법을 알려줘",
      "시스템 리소스 사용량이 정상 범위인지 판단해줘",
    ],
    domainCodes: ["ST03N", "ST06", "ST05", "SE30", "ST04", "DB02", "ST02", "SM04"],
  },

  // ─── 설명 / 유틸리티 영역 ───
  {
    id: "sap-explainer",
    title: "SAP 설명 보조",
    description:
      "기술 분석 결과를 운영자와 현업이 이해하기 쉬운 설명으로 바꿉니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate:
      "SAP 도메인 설명가로서 기술 결과를 운영자와 현업 모두 이해할 수 있게 재구성하세요.",
    outputFormat: "explanation",
    requiredSources: ["vault-reference"],
    suggestedInputs: [
      "이 결과를 현업 언어로 다시 설명해줘",
      "운영팀 관점에서 핵심만 요약해줘",
      "기술 배경을 모르는 사람도 이해하게 설명해줘",
    ],
    domainCodes: [],
  },
  {
    id: "evidence-tagger",
    title: "근거 태깅",
    description:
      "분석 결과를 Vault에 저장하기 전에 classification, source type, 태그 방향을 제안합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate:
      "지식 큐레이터로서 근거 문서를 어떤 분류와 제목으로 저장해야 하는지 제안하세요.",
    outputFormat: "checklist",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "이 결과를 Vault에 어떤 제목으로 저장하면 좋을까",
      "classification과 source type을 추천해줘",
      "재검색이 잘 되도록 키워드를 추천해줘",
    ],
    domainCodes: [],
  },
];

export const SAP_SKILL_PACKS: SkillPackDefinition[] = [
  {
    id: "cbo-ops-starter",
    title: "CBO + Ops Starter Pack",
    description:
      "CBO 유지보수, transport, incident, runbook 흐름을 데스크톱 앱에 맞게 묶은 기본 pack입니다.",
    audience: "mixed",
    skillIds: [
      "cbo-impact-analysis",
      "transport-risk-review",
      "incident-triage",
      "ops-runbook-writer",
      "process-monitor",
      "perf-analysis",
      "sap-explainer",
      "evidence-tagger",
    ],
  },
];
