import { ipcMain } from "electron";
import type {
  AuditSearchFilters,
  VaultClassification,
} from "../contracts.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerAuditHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.AUDIT_LIST, wrapHandler(IPC.AUDIT_LIST, async (_event, limit = 50) => {
    return ctx.auditRepo.list(limit);
  }));

  ipcMain.handle(IPC.AUDIT_SEARCH, wrapHandler(IPC.AUDIT_SEARCH, async (_event, filters: AuditSearchFilters) => {
    return ctx.auditRepo.search(filters);
  }));

  ipcMain.handle(IPC.VAULT_LIST, wrapHandler(IPC.VAULT_LIST, async (_event, limit = 50) => {
    return ctx.vaultRepo.list(limit);
  }));

  ipcMain.handle(
    IPC.VAULT_SEARCH_BY_CLASSIFICATION,
    wrapHandler(IPC.VAULT_SEARCH_BY_CLASSIFICATION,
      async (_event, classification: VaultClassification, query?: string, limit?: number) => {
        return ctx.vaultRepo.searchByClassification(classification, query, limit);
      },
    ),
  );
}
