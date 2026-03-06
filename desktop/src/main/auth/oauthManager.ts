import {
  AuthStatus,
  ProviderAccount,
  ProviderType,
  SetApiKeyInput,
} from "../contracts.js";
import { ProviderAccountRepository } from "../storage/repositories.js";
import { SecureStore } from "./secureStore.js";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * API Key 기반 인증 관리자.
 * craft-agents-oss 스타일 — provider별 API Key를 keytar에 안전하게 저장한다.
 */
export class OAuthManager {
  constructor(
    private readonly secureStore: SecureStore,
    private readonly providerAccountRepo: ProviderAccountRepository
  ) {}

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

  async setApiKey(input: SetApiKeyInput): Promise<ProviderAccount> {
    const { provider, apiKey } = input;
    if (!apiKey.trim()) {
      return this.saveStatus({
        provider,
        status: "error",
        accountHint: null,
        updatedAt: nowIso(),
      });
    }
    await this.secureStore.set(provider, {
      accessToken: apiKey.trim(),
    });
    const hint =
      apiKey.length > 8
        ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
        : "****";
    return this.saveStatus({
      provider,
      status: "authenticated",
      accountHint: hint,
      updatedAt: nowIso(),
    });
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

  async getAccessToken(provider: ProviderType): Promise<string> {
    const status = await this.getStatus(provider);
    if (status.status !== "authenticated") {
      throw new Error(
        `${provider}가 인증되지 않았어요. 설정에서 API Key를 등록해주세요.`
      );
    }
    const record = await this.secureStore.get(provider);
    if (!record?.accessToken) {
      this.saveStatus({
        provider,
        status: "expired",
        accountHint: null,
        updatedAt: nowIso(),
      });
      throw new Error(`${provider} API Key가 없거나 만료되었어요.`);
    }
    return record.accessToken;
  }

  private saveStatus(account: ProviderAccount): ProviderAccount {
    return this.providerAccountRepo.upsert(account);
  }
}

export type { AuthStatus };
