import { ipcMain } from "electron";

import type { ProviderType } from "../contracts.js";
import type { IpcContext } from "./types.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerCodeAnalysisHandlers(ctx: IpcContext): void {
  // ─── 순수 조회 핸들러 ───
  registerCrudHandlers({
    [IPC.CODE_ANALYSIS_RUNS_LIST]: (sourceId?: string, limit?: number) =>
      ctx.codeAnalysisRepo.listRuns(sourceId, limit),
    [IPC.CODE_ANALYSIS_RUN_DETAIL]: (runId: string) => ({
      run: ctx.codeAnalysisRepo.getRun(runId),
      results: ctx.codeAnalysisRepo.listResultsByRun(runId),
    }),
  });

  // ─── Source 전체 분석 (비동기, 프로그레스 이벤트) ───
  ipcMain.handle(
    IPC.CODE_ANALYSIS_RUN,
    wrapHandler(IPC.CODE_ANALYSIS_RUN, async (_e, payload: { sourceId: string; provider: ProviderType; model: string }) => {
      const win = ctx.getMainWindow();
      const run = await ctx.codeAnalyzer.analyzeSource(
        payload.sourceId,
        payload.provider,
        payload.model,
        (analyzed, total) => {
          win?.webContents.send(IPC.CODE_ANALYSIS_PROGRESS, {
            runId: "current",
            analyzedFiles: analyzed,
            totalFiles: total,
          });
        },
      );
      return run;
    }),
  );

  // ─── 단일 파일 분석 ───
  ipcMain.handle(
    IPC.CODE_ANALYSIS_RUN_FILE,
    wrapHandler(IPC.CODE_ANALYSIS_RUN_FILE, (_e, payload: { documentId: string; provider: ProviderType; model: string }) =>
      ctx.codeAnalyzer.analyzeFile(payload.documentId, payload.provider, payload.model),
    ),
  );
}
