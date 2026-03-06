import { SecureRecord } from "../auth/secureStore.js";
import {
  LlmProvider,
  ProviderChatInput,
  ProviderChatOutput,
} from "./base.js";

export class AnthropicProvider implements LlmProvider {
  readonly type = "anthropic" as const;

  constructor(private readonly apiBaseUrl: string) {}

  async sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput> {
    const messages = [
      ...input.history,
      { role: "user", content: input.message },
    ];

    const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": tokens.accessToken,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    return {
      content: payload.content?.[0]?.text ?? "",
      inputTokens: payload.usage?.input_tokens ?? 0,
      outputTokens: payload.usage?.output_tokens ?? 0,
    };
  }
}
