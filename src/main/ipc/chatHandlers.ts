import { ipcMain } from "electron";
import type {
  DomainLabel,
  SendMessageInput,
  SessionFilter,
  TodoStateKind,
} from "../contracts.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerChatHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.CHAT_SEND, wrapHandler(IPC.CHAT_SEND, async (_event, input: SendMessageInput) => {
    return ctx.chatRuntime.sendMessage(input);
  }));

  ipcMain.handle(IPC.CHAT_STREAM, wrapHandler(IPC.CHAT_STREAM, async (_event, input: SendMessageInput) => {
    const win = ctx.getMainWindow();
    try {
      const result = await ctx.chatRuntime.sendMessageWithStream(input, (chunk) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.CHAT_STREAM_CHUNK, chunk);
        }
      });
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.CHAT_STREAM_DONE, {
          session: result.session,
          assistantMessage: result.assistantMessage,
          meta: result.meta,
        });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.CHAT_STREAM_ERROR, { error: message });
      }
      throw err;
    }
  }));

  ipcMain.handle(IPC.CHAT_SET_HISTORY_LIMIT, wrapHandler(IPC.CHAT_SET_HISTORY_LIMIT, (_event, limit: number) => {
    ctx.chatRuntime.chatHistoryLimit = limit;
  }));

  ipcMain.handle(IPC.CHAT_GET_HISTORY_LIMIT, wrapHandler(IPC.CHAT_GET_HISTORY_LIMIT, () => {
    return ctx.chatRuntime.chatHistoryLimit;
  }));

  ipcMain.handle(IPC.CHAT_STOP, wrapHandler(IPC.CHAT_STOP, async () => {
    const runtime = ctx.chatRuntime as unknown as Record<string, unknown>;
    if (typeof runtime["stopGeneration"] === "function") {
      (runtime["stopGeneration"] as () => void)();
    }
  }));

  ipcMain.handle(IPC.SESSIONS_LIST, wrapHandler(IPC.SESSIONS_LIST, async (_event, limit = 50) => {
    return ctx.chatRuntime.listSessions(limit);
  }));

  ipcMain.handle(IPC.SESSIONS_MESSAGES, wrapHandler(IPC.SESSIONS_MESSAGES,
    async (_event, sessionId: string, limit = 100) => {
      return ctx.chatRuntime.getMessages(sessionId, limit);
    }
  ));

  // ─── Cockpit IPC ───

  ipcMain.handle(IPC.SESSIONS_LIST_FILTERED, wrapHandler(IPC.SESSIONS_LIST_FILTERED,
    (_event, filter: SessionFilter, limit?: number) => ctx.sessionRepo.listFiltered(filter, limit)));

  ipcMain.handle(IPC.SESSIONS_UPDATE_TODO_STATE, wrapHandler(IPC.SESSIONS_UPDATE_TODO_STATE,
    (_event, sessionId: string, state: TodoStateKind) => ctx.sessionRepo.updateTodoState(sessionId, state)));

  ipcMain.handle(IPC.SESSIONS_TOGGLE_FLAG, wrapHandler(IPC.SESSIONS_TOGGLE_FLAG,
    (_event, sessionId: string) => ctx.sessionRepo.toggleFlag(sessionId)));

  ipcMain.handle(IPC.SESSIONS_TOGGLE_ARCHIVE, wrapHandler(IPC.SESSIONS_TOGGLE_ARCHIVE,
    (_event, sessionId: string) => ctx.sessionRepo.toggleArchive(sessionId)));

  ipcMain.handle(IPC.SESSIONS_ADD_LABEL, wrapHandler(IPC.SESSIONS_ADD_LABEL,
    (_event, sessionId: string, label: DomainLabel) => ctx.sessionRepo.addLabel(sessionId, label)));

  ipcMain.handle(IPC.SESSIONS_REMOVE_LABEL, wrapHandler(IPC.SESSIONS_REMOVE_LABEL,
    (_event, sessionId: string, label: DomainLabel) => ctx.sessionRepo.removeLabel(sessionId, label)));

  ipcMain.handle(IPC.SESSIONS_STATS, wrapHandler(IPC.SESSIONS_STATS, () =>
    ctx.sessionRepo.getStats()));
}
