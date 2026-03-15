import { ipcMain } from "electron";
import type { ProviderType, SetApiKeyInput } from "../contracts.js";
import type { IpcContext } from "./types.js";
import { IPC } from "./channels.js";

export function registerAuthHandlers(ctx: IpcContext): void {
  ipcMain.handle(IPC.AUTH_SET_API_KEY, async (_event, input: SetApiKeyInput) => {
    return ctx.oauthManager.setApiKey(input);
  });

  ipcMain.handle(IPC.AUTH_STATUS, async (_event, provider: ProviderType) => {
    return ctx.oauthManager.getStatus(provider);
  });

  ipcMain.handle(IPC.AUTH_LOGOUT, async (_event, provider: ProviderType) => {
    return ctx.oauthManager.logout(provider);
  });

  ipcMain.handle(IPC.AUTH_OAUTH_AVAILABILITY, async () => {
    return ctx.oauthManager.getOAuthAvailability();
  });

  ipcMain.handle(IPC.AUTH_INITIATE_OAUTH, async (_event, provider: ProviderType) => {
    return ctx.oauthManager.initiateOAuth(provider);
  });

  ipcMain.handle(IPC.AUTH_WAIT_OAUTH_CALLBACK, async (_event, provider: ProviderType) => {
    return ctx.oauthManager.waitForOAuthCallback(provider);
  });

  ipcMain.handle(IPC.AUTH_CANCEL_OAUTH, async (_event, provider: ProviderType) => {
    return ctx.oauthManager.cancelOAuth(provider);
  });

  ipcMain.handle(IPC.AUTH_SUBMIT_OAUTH_CODE, async (_event, provider: ProviderType, code: string) => {
    return ctx.oauthManager.submitOAuthCode(provider, code);
  });

  // GitHub Device Code (Copilot)
  ipcMain.handle(IPC.AUTH_INITIATE_DEVICE_CODE, async () => {
    return ctx.oauthManager.initiateDeviceCode();
  });

  ipcMain.handle(IPC.AUTH_POLL_DEVICE_CODE, async () => {
    return ctx.oauthManager.pollDeviceCode();
  });

  ipcMain.handle(IPC.AUTH_CANCEL_DEVICE_CODE, async () => {
    ctx.oauthManager.cancelDeviceCode();
  });
}
