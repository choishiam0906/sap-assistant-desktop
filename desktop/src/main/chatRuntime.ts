import {
  SendMessageInput,
  SendMessageOutput,
  ProviderType,
  ChatMessage,
} from "./contracts.js";
import { SecureStore } from "./auth/secureStore.js";
import { LlmProvider } from "./providers/base.js";
import { MessageRepository, SessionRepository } from "./storage/repositories.js";

export class ChatRuntime {
  private readonly providers: Map<ProviderType, LlmProvider>;

  constructor(
    providers: LlmProvider[],
    private readonly secureStore: SecureStore,
    private readonly sessionRepo: SessionRepository,
    private readonly messageRepo: MessageRepository
  ) {
    this.providers = new Map(
      providers.map((provider) => [provider.type, provider])
    );
  }

  listSessions(limit = 50) {
    return this.sessionRepo.list(limit);
  }

  getMessages(sessionId: string, limit = 100) {
    return this.messageRepo.listBySession(sessionId, limit);
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageOutput> {
    const provider = this.providers.get(input.provider);
    if (!provider) {
      throw new Error(`Unsupported provider: ${input.provider}`);
    }

    const session =
      (input.sessionId && this.sessionRepo.getById(input.sessionId)) ||
      this.sessionRepo.create(input.provider, input.model, this.makeTitle(input.message));

    if (session.provider !== input.provider) {
      throw new Error(
        "Provider cannot be changed inside an existing session. Create a new session."
      );
    }

    const userMessage = this.messageRepo.append(
      session.id,
      "user",
      input.message
    );
    const historyMessages = this.messageRepo
      .listBySession(session.id, 100)
      .slice(0, -1);

    const history = this.toProviderHistory(historyMessages);
    const tokenRecord = await this.secureStore.get(input.provider);
    if (!tokenRecord?.accessToken) {
      throw new Error(
        `${input.provider} is not authenticated. Complete OAuth first.`
      );
    }

    const llmResult = await provider.sendMessage(tokenRecord, {
      model: input.model,
      message: input.message,
      history,
    });

    const assistantMessage = this.messageRepo.append(
      session.id,
      "assistant",
      llmResult.content,
      llmResult.inputTokens,
      llmResult.outputTokens
    );

    this.sessionRepo.touch(session.id);
    return {
      session: this.sessionRepo.getById(session.id) ?? session,
      userMessage,
      assistantMessage,
    };
  }

  private toProviderHistory(
    messages: ChatMessage[]
  ): Array<{ role: "user" | "assistant" | "system"; content: string }> {
    return messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  }

  private makeTitle(message: string): string {
    const normalized = message.trim();
    if (!normalized) {
      return "새 대화";
    }
    return normalized.length > 30
      ? `${normalized.slice(0, 30)}...`
      : normalized;
  }
}
