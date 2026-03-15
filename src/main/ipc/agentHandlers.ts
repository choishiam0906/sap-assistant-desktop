import { ipcMain, shell } from "electron";

import type { DomainPack } from "../contracts.js";
import type { AgentExecutionListOptions } from "../storage/repositories/agentExecutionRepository.js";
import { listAgentDefinitions, getAgentDefinition, listCustomAgentDefinitions } from "../agents/registry.js";
import { saveCustomAgent, deleteCustomAgent, getAgentFolderPath } from "../agents/agentLoaderService.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";

export function registerAgentHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.AGENTS_LIST, (_e, domainPack?: DomainPack) => {
    return listAgentDefinitions(domainPack);
  });

  ipcMain.handle(IPC.AGENTS_GET, (_e, id: string) => {
    return getAgentDefinition(id);
  });

  ipcMain.handle(IPC.AGENTS_EXECUTE, async (_e, agentId: string, domainPack: DomainPack) => {
    return ctx.agentExecutor.startExecution(agentId, domainPack);
  });

  ipcMain.handle(IPC.AGENTS_EXECUTION_STATUS, (_e, execId: string) => {
    return ctx.agentExecutor.getStatus(execId);
  });

  ipcMain.handle(IPC.AGENTS_EXECUTIONS_LIST, (_e, opts?: AgentExecutionListOptions) => {
    return ctx.agentExecutionRepo.list(opts);
  });

  ipcMain.handle(IPC.AGENTS_EXECUTION_CANCEL, async (_e, execId: string) => {
    return ctx.agentExecutor.cancelExecution(execId);
  });

  // ─── 커스텀 에이전트 CRUD ───

  ipcMain.handle(IPC.AGENTS_LIST_CUSTOM, () => {
    return listCustomAgentDefinitions();
  });

  ipcMain.handle(IPC.AGENTS_SAVE_CUSTOM, (_e, content: string, fileName: string) => {
    saveCustomAgent(content, fileName);
  });

  ipcMain.handle(IPC.AGENTS_DELETE_CUSTOM, (_e, fileName: string) => {
    deleteCustomAgent(fileName);
  });

  ipcMain.handle(IPC.AGENTS_OPEN_FOLDER, async () => {
    await shell.openPath(getAgentFolderPath());
  });
}
