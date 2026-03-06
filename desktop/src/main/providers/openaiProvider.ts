import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
} from "./base.js";

export class OpenAiProvider implements LlmProvider {
  readonly type = "openai" as const;

  constructor(private readonly apiBaseUrl: string) {}

  async sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput> {
    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      content: payload.choices?.[0]?.message?.content ?? "",
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
    };
  }
}
