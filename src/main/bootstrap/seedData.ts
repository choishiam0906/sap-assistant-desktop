import { logger } from "../logger.js";
import { loadConfig } from "../config.js";
import { seedRoutineTemplates } from "../services/routineSeedData.js";
import { presetTemplates } from "../reports/presetTemplates.js";
import type { Repositories } from "./createRepositories.js";
import type { Services } from "./createServices.js";
import { seedDemoData } from "./demoData.js";

export function seedData(repos: Repositories, services: Services): void {
  // 루틴 템플릿 시드 — 실패해도 앱 계속 실행
  try {
    seedRoutineTemplates(repos.routineTemplateRepo);
  } catch (err) {
    logger.error({ err }, "루틴 시드 데이터 삽입 실패");
  }

  // 프리셋 리포트 템플릿 시드 — 타이틀 기준 중복 방지
  try {
    const existing = repos.reportRepo.listTemplates();
    const existingTitles = new Set(existing.map((t) => t.title));
    for (const preset of presetTemplates) {
      if (!existingTitles.has(preset.title)) {
        repos.reportRepo.createTemplate({
          title: preset.title,
          description: preset.description,
          sections: preset.sections,
          outputFormat: preset.outputFormat,
        });
        logger.info({ title: preset.title }, "프리셋 리포트 템플릿 시딩");
      }
    }
  } catch (err) {
    logger.error({ err }, "프리셋 리포트 템플릿 시딩 실패");
  }

  // 데모 이메일 + Plan 시드 — demoMode 활성 시에만 실행
  const config = loadConfig();
  if (config.demoMode) {
    try {
      seedDemoData(repos);
    } catch (err) {
      logger.error({ err }, "데모 시드 데이터 삽입 실패");
    }
  }

  // 앱 시작 시 루틴 자동 실행
  try {
    services.routineExecutor.executeDueRoutines();
  } catch (err) {
    logger.error({ err }, "루틴 자동 실행 실패");
  }

  // 스케줄 자동 시작
  try {
    services.routineScheduler.startAll();
  } catch (err) {
    logger.error({ err }, "스케줄 자동 시작 실패");
  }

}
