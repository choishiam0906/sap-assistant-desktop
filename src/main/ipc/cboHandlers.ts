import { dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import type {
  CboAnalyzeFileInput,
  CboAnalyzeFolderInput,
  CboAnalyzeFolderPickInput,
  CboAnalyzePickInput,
  CboAnalyzeTextInput,
  CboRunDiffInput,
  CboSyncKnowledgeInput,
} from "../contracts.js";
import { parseCboFile } from "../cbo/parser.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

let folderAbortController: AbortController | null = null;

export function registerCboHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.CBO_ANALYZE_TEXT, wrapHandler(IPC.CBO_ANALYZE_TEXT, async (_event, input: CboAnalyzeTextInput) => {
    return ctx.cboAnalyzer.analyzeText(input);
  }));

  ipcMain.handle(IPC.CBO_ANALYZE_FILE, wrapHandler(IPC.CBO_ANALYZE_FILE, async (_event, input: CboAnalyzeFileInput) => {
    return ctx.cboAnalyzer.analyzeFile(input);
  }));

  ipcMain.handle(IPC.CBO_ANALYZE_FOLDER, wrapHandler(IPC.CBO_ANALYZE_FOLDER, async (_event, input: CboAnalyzeFolderInput) => {
    folderAbortController = new AbortController();
    const mainWindow = ctx.getMainWindow();
    try {
      return await ctx.cboBatchRuntime.analyzeFolder(input, {
        signal: folderAbortController.signal,
        onProgress: (event) => mainWindow?.webContents.send(IPC.CBO_PROGRESS, event),
      });
    } finally {
      folderAbortController = null;
    }
  }));

  ipcMain.handle(IPC.CBO_CANCEL_FOLDER, wrapHandler(IPC.CBO_CANCEL_FOLDER, () => {
    folderAbortController?.abort();
    folderAbortController = null;
  }));

  ipcMain.handle(
    IPC.CBO_PICK_AND_ANALYZE_FILE,
    wrapHandler(IPC.CBO_PICK_AND_ANALYZE_FILE, async (_event, input: CboAnalyzePickInput = {}) => {
      const dialogOptions: OpenDialogOptions = {
        title: "CBO 소스 파일 선택",
        properties: ["openFile"],
        filters: [{ name: "Text/Markdown", extensions: ["txt", "md"] }],
      };
      const mainWindow = ctx.getMainWindow();
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          filePath: null,
          result: null,
        };
      }

      const filePath = selection.filePaths[0];
      const parsed = await parseCboFile(filePath);
      const result = await ctx.cboAnalyzer.analyzeContent(
        parsed.fileName,
        parsed.content,
        input.provider,
        input.model
      );

      return {
        canceled: false,
        filePath,
        result,
        sourceContent: parsed.content,
      };
    }),
  );

  ipcMain.handle(
    IPC.CBO_PICK_AND_ANALYZE_FOLDER,
    wrapHandler(IPC.CBO_PICK_AND_ANALYZE_FOLDER, async (_event, input: CboAnalyzeFolderPickInput = {}) => {
      const mainWindow = ctx.getMainWindow();
      const selection = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          })
        : await dialog.showOpenDialog({
            title: "CBO 소스 폴더 선택",
            properties: ["openDirectory"],
          });

      if (selection.canceled || selection.filePaths.length === 0) {
        return {
          canceled: true,
          rootPath: null,
          output: null,
        };
      }

      const rootPath = selection.filePaths[0];
      folderAbortController = new AbortController();
      let output: Awaited<ReturnType<typeof ctx.cboBatchRuntime.analyzeFolder>>;
      try {
        output = await ctx.cboBatchRuntime.analyzeFolder(
          {
            rootPath,
            recursive: input.recursive,
            provider: input.provider,
            model: input.model,
            skipUnchanged: input.skipUnchanged,
          },
          {
            signal: folderAbortController.signal,
            onProgress: (event) => mainWindow?.webContents.send(IPC.CBO_PROGRESS, event),
          }
        );
      } finally {
        folderAbortController = null;
      }

      return {
        canceled: false,
        rootPath,
        output,
      };
    }),
  );

  ipcMain.handle(IPC.CBO_RUNS_LIST, wrapHandler(IPC.CBO_RUNS_LIST, async (_event, limit = 20) => {
    return ctx.cboBatchRuntime.listRuns(limit);
  }));

  ipcMain.handle(
    IPC.CBO_RUNS_DETAIL,
    wrapHandler(IPC.CBO_RUNS_DETAIL, async (_event, runId: string, limitFiles = 500) => {
      return ctx.cboBatchRuntime.getRunDetail(runId, limitFiles);
    }),
  );

  ipcMain.handle(
    IPC.CBO_RUNS_SYNC_KNOWLEDGE,
    wrapHandler(IPC.CBO_RUNS_SYNC_KNOWLEDGE, async (_event, input: CboSyncKnowledgeInput) => {
      return ctx.cboBatchRuntime.syncRunToKnowledge(input);
    }),
  );

  ipcMain.handle(IPC.CBO_RUNS_DIFF, wrapHandler(IPC.CBO_RUNS_DIFF, async (_event, input: CboRunDiffInput) => {
    return ctx.cboBatchRuntime.diffRuns(input);
  }));
}
