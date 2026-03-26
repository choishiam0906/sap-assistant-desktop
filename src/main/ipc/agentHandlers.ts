import { ipcMain, shell } from "electron";

import type { AgentExecutionListOptions } from "../storage/repositories/agentExecutionRepository.js";
import type { InteractiveAgentInput, ReActExecutionInput } from "../types/agent.js";
import { listAgentDefinitions, getAgentDefinition, listCustomAgentDefinitions } from "../agents/registry.js";
import { saveCustomAgent, deleteCustomAgent, getAgentFolderPath } from "../agents/agentLoaderService.js";
import { ReActExecutor } from "../agents/reactExecutor.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerAgentHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.AGENTS_LIST, wrapHandler(IPC.AGENTS_LIST, () => {
    return listAgentDefinitions();
  }));

  ipcMain.handle(IPC.AGENTS_GET, wrapHandler(IPC.AGENTS_GET, (_e, id: string) => {
    return getAgentDefinition(id);
  }));

  ipcMain.handle(IPC.AGENTS_EXECUTE, wrapHandler(IPC.AGENTS_EXECUTE, async (_e, agentId: string) => {
    return ctx.agentExecutor.startExecution(agentId);
  }));

  ipcMain.handle(IPC.AGENTS_EXECUTION_STATUS, wrapHandler(IPC.AGENTS_EXECUTION_STATUS, (_e, execId: string) => {
    return ctx.agentExecutor.getStatus(execId);
  }));

  ipcMain.handle(IPC.AGENTS_EXECUTIONS_LIST, wrapHandler(IPC.AGENTS_EXECUTIONS_LIST, (_e, opts?: AgentExecutionListOptions) => {
    return ctx.agentExecutionRepo.list(opts);
  }));

  ipcMain.handle(IPC.AGENTS_EXECUTION_CANCEL, wrapHandler(IPC.AGENTS_EXECUTION_CANCEL, async (_e, execId: string) => {
    return ctx.agentExecutor.cancelExecution(execId);
  }));

  // ─── 대화형 에이전트 실행 ───

  ipcMain.handle(IPC.AGENTS_EXECUTE_INTERACTIVE, wrapHandler(IPC.AGENTS_EXECUTE_INTERACTIVE, async (_e, input: InteractiveAgentInput) => {
    return ctx.agentExecutor.startInteractiveExecution(input);
  }));

  // ─── 커스텀 에이전트 CRUD ───

  ipcMain.handle(IPC.AGENTS_LIST_CUSTOM, wrapHandler(IPC.AGENTS_LIST_CUSTOM, () => {
    return listCustomAgentDefinitions();
  }));

  ipcMain.handle(IPC.AGENTS_SAVE_CUSTOM, wrapHandler(IPC.AGENTS_SAVE_CUSTOM, (_e, content: string, fileName: string) => {
    saveCustomAgent(content, fileName);
  }));

  ipcMain.handle(IPC.AGENTS_DELETE_CUSTOM, wrapHandler(IPC.AGENTS_DELETE_CUSTOM, (_e, fileName: string) => {
    deleteCustomAgent(fileName);
  }));

  ipcMain.handle(IPC.AGENTS_OPEN_FOLDER, wrapHandler(IPC.AGENTS_OPEN_FOLDER, async () => {
    await shell.openPath(getAgentFolderPath());
  }));

  // ─── ReAct 도구 기반 에이전트 ───

  ipcMain.handle(
    IPC.AGENTS_TOOLS_LIST,
    wrapHandler(IPC.AGENTS_TOOLS_LIST, () => {
      const tools = ctx.agentToolkit.listTools();
      return tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));
    }),
  );

  ipcMain.handle(
    IPC.AGENTS_REACT_EXECUTE,
    wrapHandler(IPC.AGENTS_REACT_EXECUTE, async (_e, input: ReActExecutionInput) => {
      const executor = new ReActExecutor(ctx.chatRuntime, {
        maxIterations: input.maxIterations || 5,
        toolkit: ctx.agentToolkit,
        provider: input.provider,
        model: input.model,
      });

      const mainWindow = ctx.getMainWindow?.();

      const result = await executor.execute(input.query, input.sessionId, (step) => {
        // 각 스텝을 Renderer에 전송
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC.AGENTS_REACT_STEP, step);
        }
      });

      return result;
    }),
  );
}
