import { ProviderType } from "../contracts.js";
import { SecureRecord } from "../auth/secureStore.js";

export interface ProviderChatInput {
  model: string;
  message: string;
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export interface ProviderChatOutput {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  readonly type: ProviderType;
  sendMessage(
    tokens: SecureRecord,
    input: ProviderChatInput
  ): Promise<ProviderChatOutput>;
}
