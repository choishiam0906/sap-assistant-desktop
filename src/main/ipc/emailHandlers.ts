import { ipcMain } from "electron";

import type { IpcContext } from "./types.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerEmailHandlers(ctx: IpcContext): void {
  // ─── 순수 조회 핸들러 ───
  registerCrudHandlers({
    [IPC.EMAIL_LIST_INBOX]: (options?: { limit?: number; unprocessedOnly?: boolean; provider?: string }) =>
      ctx.emailManager.listInbox(options),
    [IPC.EMAIL_GET_DETAIL]: (emailId: string) =>
      ctx.emailManager.getDetail(emailId),
    [IPC.EMAIL_LIST_LINKED_PLANS]: (emailId: string) =>
      ctx.emailManager.listLinkedPlans(emailId),
    [IPC.EMAIL_LIST_PROVIDERS]: () =>
      ctx.emailManager.listProviders(),
  });

  // ─── 비동기 핸들러 ───
  ipcMain.handle(
    IPC.EMAIL_SYNC_INBOX,
    wrapHandler(IPC.EMAIL_SYNC_INBOX, (_e, sourceId?: string) =>
      ctx.emailManager.syncInbox(sourceId),
    ),
  );

  ipcMain.handle(
    IPC.EMAIL_SYNC_PROVIDER,
    wrapHandler(IPC.EMAIL_SYNC_PROVIDER, (_e, providerType: string) =>
      ctx.emailManager.syncProvider(providerType),
    ),
  );

  ipcMain.handle(
    IPC.EMAIL_MANUAL_IMPORT,
    wrapHandler(IPC.EMAIL_MANUAL_IMPORT, (_e, input: { subject: string; bodyText: string; fromEmail?: string; fromName?: string }) =>
      ctx.emailManager.manualImport(input),
    ),
  );

  ipcMain.handle(
    IPC.EMAIL_ANALYZE_AND_CREATE_PLAN,
    wrapHandler(
      IPC.EMAIL_ANALYZE_AND_CREATE_PLAN,
      (_e, payload: { emailId: string; provider: string; model: string }) =>
        ctx.emailManager.analyzeAndCreatePlan(payload.emailId, payload.provider, payload.model),
    ),
  );
}
