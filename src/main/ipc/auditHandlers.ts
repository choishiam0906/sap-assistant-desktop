import { ipcMain } from "electron";
import type {
  AuditSearchFilters,
  DomainPack,
  VaultClassification,
} from "../contracts.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";

export function registerAuditHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.AUDIT_LIST, async (_event, limit = 50) => {
    return ctx.auditRepo.list(limit);
  });

  ipcMain.handle(IPC.AUDIT_SEARCH, async (_event, filters: AuditSearchFilters) => {
    return ctx.auditRepo.search(filters);
  });

  ipcMain.handle(IPC.VAULT_LIST, async (_event, limit = 50) => {
    return ctx.vaultRepo.list(limit);
  });

  ipcMain.handle(
    IPC.VAULT_SEARCH_BY_CLASSIFICATION,
    async (_event, classification: VaultClassification, query?: string, limit?: number) => {
      return ctx.vaultRepo.searchByClassification(classification, query, limit);
    }
  );

  ipcMain.handle(IPC.VAULT_LIST_BY_DOMAIN_PACK, async (_event, pack: DomainPack, limit?: number) => {
    return ctx.vaultRepo.listByDomainPack(pack, limit);
  });
}
