import { ipcMain } from "electron";

import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";
import type { SearchConfig } from "../search/searchConfig.js";

export function registerSearchConfigHandlers(ctx: IpcContext): void {
  registerCrudHandlers({
    [IPC.SEARCH_CONFIG_GET]: () => ctx.searchConfigRepo.get(),
    [IPC.SEARCH_ANALYTICS_LIST]: (limit?: number) =>
      ctx.searchConfigRepo.listAnalytics(limit),
  });

  ipcMain.handle(
    IPC.SEARCH_CONFIG_SET,
    wrapHandler(IPC.SEARCH_CONFIG_SET, (_e, config: Partial<SearchConfig>) => {
      ctx.searchConfigRepo.set(config);
      return ctx.searchConfigRepo.get();
    }),
  );
}
