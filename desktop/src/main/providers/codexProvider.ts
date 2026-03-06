import { randomUUID } from "node:crypto";

import { OAuthCompleteInput, OAuthStartResult } from "../contracts.js";
import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
  ProviderOAuthResult,
  RefreshTokenResult,
} from "./base.js";

export class CodexProvider implements LlmProvider {
  readonly type = "codex" as const;

  constructor(
    private readonly oauthVerificationUrl: string,
    private readonly oauthTokenExchangeUrl: string,
    private readonly apiBaseUrl: string
  ) {}

  async startOAuth(): Promise<OAuthStartResult> {
    return {
      provider: this.type,
      verificationUri: this.oauthVerificationUrl,
      userCode: randomUUID().slice(0, 8).toUpperCase(),
      state: randomUUID(),
    };
  }

  async completeOAuth(input: OAuthCompleteInput): Promise<ProviderOAuthResult> {
    const response = await fetch(this.oauthTokenExchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: input.code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Codex OAuth failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      account_hint?: string;
    };

    const expiresAt = payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : undefined;

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt,
      accountHint: payload.account_hint ?? null,
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    const response = await fetch(this.oauthTokenExchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Codex token refresh failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt = payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : undefined;

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? refreshToken,
      expiresAt,
    };
  }

  async sendMessage(tokens: SecureRecord, input: ProviderChatInput): Promise<ProviderChatOutput> {
    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(`${this.apiBaseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        input: messages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Codex request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      output_text?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      content: payload.output_text ?? "",
      inputTokens: payload.usage?.input_tokens ?? 0,
      outputTokens: payload.usage?.output_tokens ?? 0,
    };
  }
}
