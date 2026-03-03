import { contextBridge, ipcRenderer } from "electron";

import { OAuthCompleteInput, ProviderType, SendMessageInput } from "../main/contracts.js";

const desktopApi = {
  startOAuth(provider: ProviderType) {
    return ipcRenderer.invoke("auth:start", provider);
  },
  completeOAuth(input: OAuthCompleteInput) {
    return ipcRenderer.invoke("auth:complete", input);
  },
  getAuthStatus(provider: ProviderType) {
    return ipcRenderer.invoke("auth:status", provider);
  },
  logout(provider: ProviderType) {
    return ipcRenderer.invoke("auth:logout", provider);
  },
  sendMessage(input: SendMessageInput) {
    return ipcRenderer.invoke("chat:send", input);
  },
  listSessions(limit = 50) {
    return ipcRenderer.invoke("sessions:list", limit);
  },
  getSessionMessages(sessionId: string, limit = 100) {
    return ipcRenderer.invoke("sessions:messages", sessionId, limit);
  },
};

contextBridge.exposeInMainWorld("sapOpsDesktop", desktopApi);

export type DesktopApi = typeof desktopApi;
