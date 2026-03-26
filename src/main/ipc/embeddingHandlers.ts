import { dialog, ipcMain } from "electron";

import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";

export function registerEmbeddingHandlers(ctx: IpcContext): void {
  // ─── 순수 조회 ───
  registerCrudHandlers({
    [IPC.EMBEDDING_STATUS]: () => ctx.chunkRepo.getStats(),
  });

  // ─── 소스 전체 임베딩 인덱싱 (비동기, 프로그레스) ───
  ipcMain.handle(
    IPC.EMBEDDING_INDEX_SOURCE,
    wrapHandler(IPC.EMBEDDING_INDEX_SOURCE, async (_e, sourceId: string) => {
      const win = ctx.getMainWindow();
      const summary = await ctx.embeddingPipeline.indexSource(
        sourceId,
        (indexed, total) => {
          win?.webContents.send(IPC.EMBEDDING_PROGRESS, { sourceId, indexed, total });
        },
      );
      return summary;
    }),
  );

  // ─── 문서 단건 임베딩 ───
  ipcMain.handle(
    IPC.EMBEDDING_INDEX_DOCUMENT,
    wrapHandler(IPC.EMBEDDING_INDEX_DOCUMENT, async (_e, documentId: string) => {
      return ctx.embeddingPipeline.indexDocument(documentId);
    }),
  );

  // ─── 파일 임포트 + 임베딩 ───
  ipcMain.handle(
    IPC.EMBEDDING_IMPORT_FILE,
    wrapHandler(IPC.EMBEDDING_IMPORT_FILE, async (_e, payload: { filePath: string; sourceId: string }) => {
      return ctx.embeddingPipeline.importAndIndex(payload.filePath, payload.sourceId);
    }),
  );

  // ─── 파일 선택 다이얼로그 + 임포트 ───
  ipcMain.handle(
    IPC.EMBEDDING_PICK_AND_IMPORT,
    wrapHandler(IPC.EMBEDDING_PICK_AND_IMPORT, async (_e, sourceId: string) => {
      const win = ctx.getMainWindow();
      if (!win) throw new Error("윈도우를 찾을 수 없어요");

      const result = await dialog.showOpenDialog(win, {
        title: "임베딩할 문서 선택",
        filters: [
          { name: "문서", extensions: ["pdf", "docx", "xlsx", "xls", "txt", "md", "csv"] },
          { name: "모든 파일", extensions: ["*"] },
        ],
        properties: ["openFile", "multiSelections"],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, summary: null };
      }

      let totalChunks = 0;
      let totalErrors = 0;
      for (const filePath of result.filePaths) {
        const summary = await ctx.embeddingPipeline.importAndIndex(filePath, sourceId);
        totalChunks += summary.chunkCount;
        totalErrors += summary.errorCount;
      }

      return {
        canceled: false,
        summary: {
          fileCount: result.filePaths.length,
          chunkCount: totalChunks,
          errorCount: totalErrors,
        },
      };
    }),
  );
}
