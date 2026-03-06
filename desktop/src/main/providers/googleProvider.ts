import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
} from "./base.js";

export class GoogleProvider implements LlmProvider {
  readonly type = "google" as const;

  constructor(private readonly apiBaseUrl: string) {}

  async sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput> {
    const contents = [
      ...input.history,
      { role: "user" as const, content: input.message },
    ].map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `${this.apiBaseUrl}/v1beta/models/${input.model}:generateContent?key=${tokens.accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      throw new Error(`Google Gemini request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    return {
      content: payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
