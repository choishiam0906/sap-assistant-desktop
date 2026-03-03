import "dotenv/config";

import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { OAuthManager } from "./auth/oauthManager.js";
import { SecureStore } from "./auth/secureStore.js";
import { OAuthCompleteInput, ProviderType, SendMessageInput } from "./contracts.js";
import { CopilotProvider } from "./providers/copilotProvider.js";
import { CodexProvider } from "./providers/codexProvider.js";
import { ChatRuntime } from "./chatRuntime.js";
import {
  MessageRepository,
  ProviderAccountRepository,
  SessionRepository,
} from "./storage/repositories.js";
import { LocalDatabase } from "./storage/sqlite.js";

let mainWindow: BrowserWindow | null = null;
let chatRuntime: ChatRuntime;
let oauthManager: OAuthManager;
const mainDir = fileURLToPath(new URL(".", import.meta.url));

function initRuntime(): void {
  const dbPath = join(app.getPath("userData"), "sap-ops-bot.sqlite");
  const db = new LocalDatabase(dbPath);

  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const accountRepo = new ProviderAccountRepository(db);
  const secureStore = new SecureStore("sap-ops-bot-desktop");

  const codexProvider = new CodexProvider(
    process.env.CODEX_OAUTH_VERIFICATION_URL ?? "https://chat.openai.com/auth/device",
    process.env.CODEX_OAUTH_TOKEN_URL ?? "https://api.openai.com/oauth/token",
    process.env.CODEX_API_BASE_URL ?? "https://api.openai.com/v1"
  );
  const copilotProvider = new CopilotProvider(
    process.env.COPILOT_OAUTH_VERIFICATION_URL ?? "https://github.com/login/device",
    process.env.COPILOT_OAUTH_TOKEN_URL ?? "https://github.com/login/oauth/access_token",
    process.env.COPILOT_API_BASE_URL ?? "https://api.githubcopilot.com"
  );

  const providers = [codexProvider, copilotProvider];
  chatRuntime = new ChatRuntime(providers, secureStore, sessionRepo, messageRepo);
  oauthManager = new OAuthManager(providers, secureStore, accountRepo);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    webPreferences: {
      preload: join(mainDir, "../preload/index.js"),
    },
  });

  const splash = `
    <html>
      <head><title>SAP Ops Bot Desktop</title></head>
      <body style="font-family:sans-serif;padding:24px;">
        <h1>SAP Ops Bot Desktop Runtime</h1>
        <p>Renderer UI scaffold is intentionally minimal in this migration commit.</p>
        <p>Use IPC endpoints from preload to build session list/chat/settings views.</p>
      </body>
    </html>
  `;
  mainWindow.loadURL(`data:text/html,${encodeURIComponent(splash)}`);
}

function registerIpc(): void {
  ipcMain.handle("auth:start", async (_event, provider: ProviderType) => {
    return oauthManager.start(provider);
  });

  ipcMain.handle("auth:complete", async (_event, input: OAuthCompleteInput) => {
    return oauthManager.complete(input);
  });

  ipcMain.handle("auth:status", async (_event, provider: ProviderType) => {
    return oauthManager.getStatus(provider);
  });

  ipcMain.handle("auth:logout", async (_event, provider: ProviderType) => {
    return oauthManager.logout(provider);
  });

  ipcMain.handle("chat:send", async (_event, input: SendMessageInput) => {
    return chatRuntime.sendMessage(input);
  });

  ipcMain.handle("sessions:list", async (_event, limit = 50) => {
    return chatRuntime.listSessions(limit);
  });

  ipcMain.handle(
    "sessions:messages",
    async (_event, sessionId: string, limit = 100) => {
      return chatRuntime.getMessages(sessionId, limit);
    }
  );
}

app.whenReady().then(() => {
  initRuntime();
  registerIpc();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
