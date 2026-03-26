import type { TemplateSectionDef } from "./reportGenerator.js";

interface PresetTemplate {
  id: string;
  title: string;
  description: string;
  sections: TemplateSectionDef[];
  outputFormat: "pdf" | "excel" | "html";
}

/** 내장 리포트 템플릿 6종 */
export const presetTemplates: PresetTemplate[] = [
  {
    id: "preset-error-analysis",
    title: "에러 분석 리포트",
    description: "코드/문서 기반으로 에러 원인을 분석하고 해결 방안을 제시해요",
    sections: [
      {
        title: "에러 현황 요약",
        prompt: "현재 보고된 에러와 이슈를 요약해주세요. 심각도별로 분류하고, 영향 범위를 설명해주세요.",
        dataSource: "rag",
      },
      {
        title: "근본 원인 분석",
        prompt: "에러의 근본 원인을 코드와 문서 분석을 통해 파악해주세요. 관련 코드 패턴과 설정 오류를 식별해주세요.",
        dataSource: "rag",
      },
      {
        title: "해결 방안",
        prompt: "에러를 해결하기 위한 단계별 조치 사항을 작성해주세요. 우선순위와 예상 소요 시간을 포함해주세요.",
        dataSource: "rag",
      },
    ],
    outputFormat: "pdf",
  },
  {
    id: "preset-weekly-ops",
    title: "주간 운영 요약",
    description: "이메일, 분석 결과, 코드 변경 사항을 종합하여 주간 운영 현황을 요약해요",
    sections: [
      {
        title: "주간 핵심 이슈",
        prompt: "이번 주에 발생한 핵심 이슈와 대응 내역을 요약해주세요.",
        dataSource: "rag",
      },
      {
        title: "시스템 변경 사항",
        prompt: "이번 주에 적용된 시스템 변경 사항, 코드 업데이트, 설정 변경을 정리해주세요.",
        dataSource: "rag",
      },
      {
        title: "다음 주 계획",
        prompt: "다음 주에 예정된 작업과 주의사항을 정리해주세요. 미완료 업무와 리스크 요소를 포함해주세요.",
        dataSource: "static",
      },
    ],
    outputFormat: "pdf",
  },
  {
    id: "preset-system-health",
    title: "시스템 상태 리포트",
    description: "코드 분석 결과와 리스크 요약을 바탕으로 시스템 건강 상태를 보고해요",
    sections: [
      {
        title: "시스템 건강 지표",
        prompt: "현재 시스템의 전반적인 건강 상태를 평가해주세요. 코드 품질, 보안 리스크, 성능 지표를 포함해주세요.",
        dataSource: "rag",
      },
      {
        title: "리스크 목록",
        prompt: "식별된 보안 리스크와 기술 부채를 심각도별로 정리해주세요. 각 리스크의 영향과 완화 방안을 설명해주세요.",
        dataSource: "rag",
      },
      {
        title: "개선 권고사항",
        prompt: "시스템 안정성과 보안을 강화하기 위한 권고사항을 우선순위별로 작성해주세요.",
        dataSource: "rag",
      },
    ],
    outputFormat: "pdf",
  },
  {
    id: "preset-operational-decision",
    title: "운영 의사결정 리포트",
    description: "현황 분석과 옵션 평가를 통해 의사결정을 지원해요",
    sections: [
      {
        title: "현황분석",
        prompt: "현재 시스템 상태, 성능 메트릭, 병목 지점을 분석해주세요. 주요 지표와 트렌드를 명확히 제시해주세요.",
        dataSource: "rag",
      },
      {
        title: "옵션평가",
        prompt: "도출된 개선 옵션들을 장단점과 함께 비교 평가해주세요. 각 옵션의 기술적 타당성과 실행 가능성을 검토해주세요.",
        dataSource: "rag",
      },
      {
        title: "비용/위험 분석",
        prompt: "각 옵션의 예상 비용, 구현 기간, 리스크를 정량화해주세요. 비용대비 효과를 분석해주세요.",
        dataSource: "rag",
      },
      {
        title: "권장사항",
        prompt: "분석 결과에 기반한 최적의 선택안과 이행 계획을 제시해주세요. 의사결정자가 참고할 수 있는 요약을 작성해주세요.",
        dataSource: "rag",
      },
    ],
    outputFormat: "pdf",
  },
  {
    id: "preset-incident-analysis",
    title: "장애 분석 리포트",
    description: "장애 발생부터 해결까지의 전체 과정을 분석해요",
    sections: [
      {
        title: "장애개요",
        prompt: "장애 발생 시간, 영향받은 시스템, 감지 방법, 초기 대응을 요약해주세요. 심각도와 영향 범위를 명시해주세요.",
        dataSource: "rag",
      },
      {
        title: "원인분석",
        prompt: "근본 원인을 파악하고 장애 발생 경로를 설명해주세요. 관련된 설정, 코드, 리소스 문제를 식별해주세요.",
        dataSource: "rag",
      },
      {
        title: "대응기록",
        prompt: "장애 발생부터 해결까지의 시간순 조치 사항을 기록해주세요. 각 조치의 효과와 추가 문제점을 정리해주세요.",
        dataSource: "rag",
      },
      {
        title: "개선안",
        prompt: "유사 장애 재발 방지를 위한 개선안을 제시해주세요. 단기 임시 조치와 장기 근본 해결책을 구분해주세요.",
        dataSource: "rag",
      },
    ],
    outputFormat: "pdf",
  },
  {
    id: "preset-cost-performance",
    title: "비용/성과 분석 리포트",
    description: "리소스 효율성과 비용 최적화 기회를 분석해요",
    sections: [
      {
        title: "성능메트릭 요약",
        prompt: "주요 성능 지표(처리량, 응답시간, 안정성 등)의 현재 상태를 요약해주세요. 목표치 대비 달성도를 분석해주세요.",
        dataSource: "rag",
      },
      {
        title: "리소스 사용량",
        prompt: "현재 시스템이 소비하는 리소스(CPU, 메모리, 스토리지, 네트워크)를 분석해주세요. 리소스 사용 패턴과 피크 시간을 파악해주세요.",
        dataSource: "rag",
      },
      {
        title: "비용분석",
        prompt: "현재 비용 구조와 성과 대비 비용 효율성을 분석해주세요. 비용 세부 항목별 분석과 추세를 제시해주세요.",
        dataSource: "rag",
      },
      {
        title: "최적화 기회",
        prompt: "성능을 유지하면서 비용을 절감할 수 있는 최적화 기회를 식별해주세요. 우선순위별로 개선안을 제시해주세요.",
        dataSource: "rag",
      },
    ],
    outputFormat: "pdf",
  },
];
