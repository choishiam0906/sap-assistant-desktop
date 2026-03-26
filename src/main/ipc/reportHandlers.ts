import { ipcMain } from "electron";
import { writeFile } from "node:fs/promises";

import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";
import type { ProviderType } from "../contracts.js";
import type { ReportTemplateInput } from "../reports/reportRepository.js";
import type { ReportScheduleInput } from "../reports/reportScheduler.js";

export function registerReportHandlers(ctx: IpcContext): void {
  // ─── 템플릿 CRUD ───
  registerCrudHandlers({
    [IPC.REPORTS_TEMPLATES_LIST]: () => ctx.reportRepo.listTemplates(),
    [IPC.REPORTS_TEMPLATES_DELETE]: (id: string) => ctx.reportRepo.deleteTemplate(id),
    [IPC.REPORTS_RUNS_LIST]: (templateId?: string, limit?: number) =>
      ctx.reportRepo.listRuns(templateId, limit),
  });

  ipcMain.handle(
    IPC.REPORTS_TEMPLATES_CREATE,
    wrapHandler(IPC.REPORTS_TEMPLATES_CREATE, (_e, input: ReportTemplateInput) =>
      ctx.reportRepo.createTemplate(input),
    ),
  );

  ipcMain.handle(
    IPC.REPORTS_TEMPLATES_UPDATE,
    wrapHandler(IPC.REPORTS_TEMPLATES_UPDATE, (_e, payload: { id: string; input: Partial<ReportTemplateInput> }) =>
      ctx.reportRepo.updateTemplate(payload.id, payload.input),
    ),
  );

  // ─── 리포트 생성 (비동기, 프로그레스) ───
  ipcMain.handle(
    IPC.REPORTS_GENERATE,
    wrapHandler(IPC.REPORTS_GENERATE, async (
      _e,
      payload: { templateId: string; provider: ProviderType; model: string; query?: string },
    ) => {
      const template = ctx.reportRepo.getTemplate(payload.templateId);
      if (!template) throw new Error("템플릿을 찾을 수 없어요");

      const run = ctx.reportRepo.createRun(template.id);
      const win = ctx.getMainWindow();

      try {
        const report = await ctx.reportGenerator.generate(
          template,
          { provider: payload.provider, model: payload.model, query: payload.query },
          (completed, total) => {
            win?.webContents.send(IPC.REPORTS_PROGRESS, { runId: run.id, completed, total });
          },
        );

        ctx.reportRepo.completeRun(run.id, JSON.stringify(report));
        return { run: { ...run, status: "completed" }, report };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.reportRepo.failRun(run.id, msg);
        throw err;
      }
    }),
  );

  // ─── 파일 내보내기 ───
  ipcMain.handle(
    IPC.REPORTS_EXPORT,
    wrapHandler(IPC.REPORTS_EXPORT, async (
      _e,
      payload: { report: unknown; format: "pdf" | "excel" | "html"; outputPath: string },
    ) => {
      const report = payload.report as import("../reports/reportGenerator.js").Report;

      let result: import("../reports/exportService.js").ExportResult;
      switch (payload.format) {
        case "pdf":
          result = await ctx.exportService.toPdf(report);
          break;
        case "excel":
          result = await ctx.exportService.toExcel(report);
          break;
        case "html":
          result = { buffer: Buffer.from(ctx.exportService.toHtml(report), "utf-8"), format: "html" };
          break;
      }

      await writeFile(payload.outputPath, result.buffer);
      return { success: true, path: payload.outputPath, format: result.format, warning: result.warning };
    }),
  );

  // ─── 스케줄 CRUD ───
  registerCrudHandlers({
    [IPC.REPORTS_SCHEDULE_LIST]: () => ctx.reportScheduler.listSchedules(),
    [IPC.REPORTS_SCHEDULE_DELETE]: (id: string) => ctx.reportScheduler.deleteSchedule(id),
  });

  ipcMain.handle(
    IPC.REPORTS_SCHEDULE_CREATE,
    wrapHandler(IPC.REPORTS_SCHEDULE_CREATE, (_e, input: ReportScheduleInput) =>
      ctx.reportScheduler.createSchedule(input),
    ),
  );

  ipcMain.handle(
    IPC.REPORTS_SCHEDULE_UPDATE,
    wrapHandler(IPC.REPORTS_SCHEDULE_UPDATE, (
      _e,
      payload: { id: string; input: Partial<ReportScheduleInput> },
    ) => ctx.reportScheduler.updateSchedule(payload.id, payload.input)),
  );

  ipcMain.handle(
    IPC.REPORTS_SCHEDULE_TOGGLE,
    wrapHandler(IPC.REPORTS_SCHEDULE_TOGGLE, (_e, payload: { id: string; isActive: boolean }) =>
      ctx.reportScheduler.toggleSchedule(payload.id, payload.isActive),
    ),
  );
}
