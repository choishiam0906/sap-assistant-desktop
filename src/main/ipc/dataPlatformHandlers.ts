import { ipcMain } from "electron";

import type { DataPlatformConnectInput } from "../sources/dataPlatformProvider.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerDataPlatformHandlers(ctx: IpcContext): void {
  ipcMain.handle(
    IPC.DATA_PLATFORM_CONNECT,
    wrapHandler(IPC.DATA_PLATFORM_CONNECT, async (_event, input: DataPlatformConnectInput) => {
      return ctx.dataPlatformProvider.connectSource(input);
    }),
  );

  ipcMain.handle(
    IPC.DATA_PLATFORM_SYNC,
    wrapHandler(IPC.DATA_PLATFORM_SYNC, async (_event, sourceId: string) => {
      const summary = await ctx.dataPlatformProvider.syncSource(sourceId);
      return {
        source: ctx.configuredSourceRepo.getById(sourceId),
        summary,
      };
    }),
  );

  ipcMain.handle(
    IPC.DATA_PLATFORM_LIST,
    wrapHandler(IPC.DATA_PLATFORM_LIST, async () => {
      return ctx.configuredSourceRepo.list("data-platform");
    }),
  );

  ipcMain.handle(
    IPC.DATA_PLATFORM_TEST_CONNECTION,
    wrapHandler(IPC.DATA_PLATFORM_TEST_CONNECTION, async (_event, input: DataPlatformConnectInput) => {
      return ctx.dataPlatformProvider.testConnection(input);
    }),
  );
}
