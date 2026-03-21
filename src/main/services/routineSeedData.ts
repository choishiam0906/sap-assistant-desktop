import type { RoutineTemplateRepository } from "../storage/repositories/routineTemplateRepository.js";
import { domainPackRegistry } from "../domains/index.js";
import { logger } from "../logger.js";

/**
 * routine_templates 테이블이 비어있으면 활성 도메인 팩의 루틴 템플릿을 자동 삽입한다.
 */
export function seedRoutineTemplates(repo: RoutineTemplateRepository): number {
  if (repo.count() > 0) {
    return 0;
  }

  const templates = domainPackRegistry.getActive().routineTemplates;
  let inserted = 0;
  for (const template of templates) {
    repo.create(template);
    inserted++;
  }

  logger.info({ inserted }, "기본 루틴 템플릿 시드 데이터 삽입 완료");
  return inserted;
}
