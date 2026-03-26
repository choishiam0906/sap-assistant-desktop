import { ipcMain } from "electron";

import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerSearchHandlers(ctx: IpcContext): void {
  ipcMain.handle(
    IPC.SEARCH_HYBRID,
    wrapHandler(IPC.SEARCH_HYBRID, async (_e, payload: { query: string; topK?: number; minScore?: number }) => {
      return ctx.hybridSearch.hybridSearch(payload.query, {
        topK: payload.topK,
        minScore: payload.minScore,
      });
    }),
  );

  ipcMain.handle(
    IPC.SEARCH_SEMANTIC,
    wrapHandler(IPC.SEARCH_SEMANTIC, async (_e, payload: { query: string; k?: number }) => {
      return ctx.hybridSearch.vectorSearch(payload.query, payload.k);
    }),
  );

  ipcMain.handle(
    IPC.SEARCH_KEYWORD,
    wrapHandler(IPC.SEARCH_KEYWORD, (_e, payload: { query: string; k?: number }) => {
      return ctx.hybridSearch.keywordSearch(payload.query, payload.k);
    }),
  );
}
