import { dialog, ipcMain, shell } from "electron";
import type {
  PickAndAddLocalFolderSourceInput,
  SkillExecutionContext,
  SourceDocumentSearchInput,
  VaultClassification,
} from "../contracts.js";
import type { McpServerConfig } from "../sources/mcpConnector.js";
import { listCustomSkillDefinitions } from "../skills/registry.js";
import { saveCustomSkill, deleteCustomSkill, getSkillFolderPath } from "../skills/skillLoaderService.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerSourceHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.SKILLS_LIST, wrapHandler(IPC.SKILLS_LIST, async () => {
    return ctx.skillRegistry.listSkills();
  }));

  ipcMain.handle(IPC.SKILLS_LIST_PACKS, wrapHandler(IPC.SKILLS_LIST_PACKS, async () => {
    return ctx.skillRegistry.listPacks();
  }));

  ipcMain.handle(IPC.SKILLS_RECOMMEND, wrapHandler(IPC.SKILLS_RECOMMEND, async (_event, context: SkillExecutionContext) => {
    return ctx.skillRegistry.recommendSkills(context);
  }));

  ipcMain.handle(IPC.SOURCES_LIST, wrapHandler(IPC.SOURCES_LIST, async (_event, context: SkillExecutionContext) => {
    return ctx.skillRegistry.listSources(context);
  }));

  ipcMain.handle(IPC.SOURCES_SEARCH, wrapHandler(IPC.SOURCES_SEARCH, async (_event, query: string, context: SkillExecutionContext) => {
    return ctx.skillRegistry.searchSources(query, context);
  }));

  ipcMain.handle(IPC.SOURCES_LIST_CONFIGURED, wrapHandler(IPC.SOURCES_LIST_CONFIGURED, async () => {
    return ctx.configuredSourceRepo.list();
  }));

  ipcMain.handle(
    IPC.SOURCES_PICK_AND_ADD_LOCAL_FOLDER,
    wrapHandler(IPC.SOURCES_PICK_AND_ADD_LOCAL_FOLDER, async (_event, input: PickAndAddLocalFolderSourceInput) => {
      const mainWindow = ctx.getMainWindow();
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "Local Folder Source 선택",
            properties: ["openDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "Local Folder Source 선택",
            properties: ["openDirectory"],
          });

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          source: null,
          summary: null,
        };
      }

      const output = await ctx.localFolderLibrary.addLocalFolder(selection.filePaths[0], input);
      return {
        canceled: false,
        source: output.source,
        summary: output.summary,
      };
    }),
  );

  ipcMain.handle(IPC.SOURCES_REINDEX, wrapHandler(IPC.SOURCES_REINDEX, async (_event, sourceId: string) => {
    const summary = await ctx.localFolderLibrary.reindexSource(sourceId);
    return {
      source: ctx.configuredSourceRepo.getById(sourceId),
      summary,
    };
  }));

  ipcMain.handle(IPC.SOURCES_SEARCH_DOCUMENTS, wrapHandler(IPC.SOURCES_SEARCH_DOCUMENTS, async (_event, input: SourceDocumentSearchInput) => {
    return ctx.localFolderLibrary.searchDocuments(input);
  }));

  ipcMain.handle(IPC.SOURCES_GET_DOCUMENT, wrapHandler(IPC.SOURCES_GET_DOCUMENT, async (_event, documentId: string) => {
    return ctx.sourceDocumentRepo.getById(documentId);
  }));

  // ─── MCP IPC ───

  ipcMain.handle(IPC.MCP_CONNECT, wrapHandler(IPC.MCP_CONNECT, async (_event, config: McpServerConfig) => {
    await ctx.mcpConnector.connect(config);
    return { connected: true, name: config.name };
  }));

  ipcMain.handle(IPC.MCP_DISCONNECT, wrapHandler(IPC.MCP_DISCONNECT, async (_event, serverName: string) => {
    await ctx.mcpConnector.disconnect(serverName);
    return { disconnected: true };
  }));

  ipcMain.handle(IPC.MCP_LIST_SERVERS, wrapHandler(IPC.MCP_LIST_SERVERS, async () => {
    return ctx.mcpConnector.listConnectedServers();
  }));

  ipcMain.handle(IPC.MCP_LIST_RESOURCES, wrapHandler(IPC.MCP_LIST_RESOURCES, async (_event, serverName: string) => {
    return ctx.mcpConnector.listResources(serverName);
  }));

  ipcMain.handle(
    IPC.MCP_ADD_SOURCE,
    wrapHandler(IPC.MCP_ADD_SOURCE, async (_event, serverName: string, input: { title?: string; classificationDefault: VaultClassification }) => {
      return ctx.mcpConnector.addSource(serverName, input);
    }),
  );

  ipcMain.handle(IPC.MCP_SYNC_SOURCE, wrapHandler(IPC.MCP_SYNC_SOURCE, async (_event, sourceId: string) => {
    const summary = await ctx.mcpConnector.syncSource(sourceId);
    return {
      source: ctx.configuredSourceRepo.getById(sourceId),
      summary,
    };
  }));

  // ─── 커스텀 스킬 CRUD ───

  ipcMain.handle(IPC.SKILLS_LIST_CUSTOM, wrapHandler(IPC.SKILLS_LIST_CUSTOM, () => {
    return listCustomSkillDefinitions();
  }));

  ipcMain.handle(IPC.SKILLS_SAVE_CUSTOM, wrapHandler(IPC.SKILLS_SAVE_CUSTOM, (_event, content: string, fileName: string) => {
    saveCustomSkill(content, fileName);
  }));

  ipcMain.handle(IPC.SKILLS_DELETE_CUSTOM, wrapHandler(IPC.SKILLS_DELETE_CUSTOM, (_event, fileName: string) => {
    deleteCustomSkill(fileName);
  }));

  ipcMain.handle(IPC.SKILLS_OPEN_FOLDER, wrapHandler(IPC.SKILLS_OPEN_FOLDER, async () => {
    await shell.openPath(getSkillFolderPath());
  }));
}
