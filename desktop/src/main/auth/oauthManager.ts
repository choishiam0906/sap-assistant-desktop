import {
  AuthStatus,
  OAuthCompleteInput,
  OAuthStartResult,
  ProviderAccount,
  ProviderType,
} from "../contracts.js";
import { ProviderAccountRepository } from "../storage/repositories.js";
import { LlmProvider } from "../providers/base.js";
import { SecureStore } from "./secureStore.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class OAuthManager {
  private readonly providers: Map<ProviderType, LlmProvider>;

  constructor(
    providers: LlmProvider[],
    private readonly secureStore: SecureStore,
    private readonly providerAccountRepo: ProviderAccountRepository
  ) {
    this.providers = new Map(
      providers.map((provider) => [provider.type, provider])
    );
  }

  async getStatus(provider: ProviderType): Promise<ProviderAccount> {
    const saved = this.providerAccountRepo.get(provider);
    if (saved) {
      return saved;
    }
    return {
      provider,
      status: "unauthenticated",
      accountHint: null,
      updatedAt: nowIso(),
    };
  }

  async start(provider: ProviderType): Promise<OAuthStartResult> {
    const adapter = this.getProvider(provider);
    const current = await this.getStatus(provider);
    this.saveStatus({
      ...current,
      status: "pending",
      updatedAt: nowIso(),
    });
    return adapter.startOAuth();
  }

  async complete(input: OAuthCompleteInput): Promise<ProviderAccount> {
    const adapter = this.getProvider(input.provider);
    try {
      const tokenResult = await adapter.completeOAuth(input);
      await this.secureStore.set(input.provider, {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresAt,
      });
      return this.saveStatus({
        provider: input.provider,
        status: "authenticated",
        accountHint: tokenResult.accountHint,
        updatedAt: nowIso(),
      });
    } catch {
      return this.saveStatus({
        provider: input.provider,
        status: "error",
        accountHint: null,
        updatedAt: nowIso(),
      });
    }
  }

  async logout(provider: ProviderType): Promise<ProviderAccount> {
    await this.secureStore.delete(provider);
    return this.saveStatus({
      provider,
      status: "unauthenticated",
      accountHint: null,
      updatedAt: nowIso(),
    });
  }

  async assertAuthenticated(provider: ProviderType): Promise<void> {
    const status = await this.getStatus(provider);
    if (status.status !== "authenticated") {
      throw new Error(
        `${provider} is not authenticated. Run OAuth login in settings first.`
      );
    }
  }

  async getAccessToken(provider: ProviderType): Promise<string> {
    await this.assertAuthenticated(provider);
    const record = await this.secureStore.get(provider);
    if (!record?.accessToken) {
      this.saveStatus({
        provider,
        status: "expired",
        accountHint: null,
        updatedAt: nowIso(),
      });
      throw new Error(`${provider} access token is missing or expired.`);
    }
    return record.accessToken;
  }

  private getProvider(provider: ProviderType): LlmProvider {
    const adapter = this.providers.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    return adapter;
  }

  private saveStatus(account: ProviderAccount): ProviderAccount {
    return this.providerAccountRepo.upsert(account);
  }
}

export type { AuthStatus };
