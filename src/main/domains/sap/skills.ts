import type { SkillDefinition, SkillPackDefinition } from "../../types/source.js";

export const SAP_PRESET_SKILLS: SkillDefinition[] = [
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
  {
    id: "transport-risk-review",
    title: "Transport 리스크 리뷰",
    description:
      "Transport 추출물 기준으로 변경 범위와 배포 전 확인 포인트를 요약합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate:
      "SAP transport 검토자로서 변경 범위, 리스크, 승인 전 점검 항목을 운영 관점에서 정리하세요.",
    outputFormat: "structured-report",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "이 transport의 배포 리스크를 검토해줘",
      "승인 코멘트에 넣을 요약을 작성해줘",
      "컷오버 전에 꼭 확인할 항목을 알려줘",
    ],
    domainCodes: ["SE09", "SE10", "STMS"],
  },
  {
    id: "incident-triage",
    title: "운영 장애 트리아지",
    description:
      "dump, spool, log를 기준으로 원인 후보와 점검 순서를 정리합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate:
      "SAP 운영 장애 분석가로서 원인 후보, 확인 순서, 임시 우회책을 간결하게 제시하세요.",
    outputFormat: "checklist",
    requiredSources: ["vault-reference"],
    suggestedInputs: [
      "이 증상에서 먼저 볼 로그와 T-code를 알려줘",
      "현업 보고용 장애 요약을 작성해줘",
      "가장 가능성 높은 원인을 우선순위로 정리해줘",
    ],
    domainCodes: ["ST22", "SM21", "SM37", "SM50"],
  },
  {
    id: "ops-runbook-writer",
    title: "운영 Runbook 작성",
    description:
      "분석 결과를 운영 절차, 인수인계 메모, 변경 승인 코멘트로 변환합니다.",
    supportedDataTypes: ["chat"],
    defaultPromptTemplate:
      "SAP 운영 문서 작성자로서 보고서, runbook, handoff memo를 짧고 명확하게 작성하세요.",
    outputFormat: "structured-report",
    requiredSources: ["vault-confidential", "vault-reference"],
    suggestedInputs: [
      "운영자 인수인계 메모 형식으로 정리해줘",
      "현업 공유용 요약을 작성해줘",
      "배포 승인 코멘트 템플릿으로 바꿔줘",
    ],
    domainCodes: [],
  },
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
      "sap-explainer",
      "evidence-tagger",
    ],
  },
];
