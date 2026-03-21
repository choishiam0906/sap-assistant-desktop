import { ipcMain } from "electron";

import type { IpcContext } from "./types.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerEmailHandlers(ctx: IpcContext): void {
  // ─── 순수 조회 핸들러 ───
  registerCrudHandlers({
    [IPC.EMAIL_LIST_INBOX]: (options?: { limit?: number; unprocessedOnly?: boolean }) =>
      ctx.emailManager.listInbox(options),
    [IPC.EMAIL_GET_DETAIL]: (emailId: string) =>
      ctx.emailManager.getDetail(emailId),
    [IPC.EMAIL_LIST_LINKED_PLANS]: (emailId: string) =>
      ctx.emailManager.listLinkedPlans(emailId),
  });

  // ─── 비동기 핸들러 (MCP 호출 포함) ───
  ipcMain.handle(
    IPC.EMAIL_SYNC_INBOX,
    wrapHandler(IPC.EMAIL_SYNC_INBOX, (_e, sourceId: string) =>
      ctx.emailManager.syncInbox(sourceId),
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
