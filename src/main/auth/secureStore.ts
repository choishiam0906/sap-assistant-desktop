type SecureRecord = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
};

type KeytarModule = {
  getPassword: (service: string, account: string) => Promise<string | null>;
  setPassword: (service: string, account: string, password: string) => Promise<void>;
  deletePassword: (service: string, account: string) => Promise<boolean>;
};

const fallback = new Map<string, string>();

async function loadKeytar(): Promise<KeytarModule | null> {
  try {
    const module = (await import("keytar")) as { default?: KeytarModule } & KeytarModule;
    return module.default ?? module;
  } catch {
    return null;
  }
}

export class SecureStore {
  constructor(private readonly serviceName: string) {}

  private key(provider: string): string {
    return `${this.serviceName}:${provider}`;
  }

  async get(provider: string): Promise<SecureRecord | null> {
    const keytar = await loadKeytar();
    const account = this.key(provider);
    const raw = keytar
      ? await keytar.getPassword(this.serviceName, account)
      : fallback.get(account) ?? null;
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SecureRecord;
  }

  async set(provider: string, value: SecureRecord): Promise<void> {
    const keytar = await loadKeytar();
    const account = this.key(provider);
    const raw = JSON.stringify(value);
    if (keytar) {
      await keytar.setPassword(this.serviceName, account, raw);
      return;
    }
    fallback.set(account, raw);
  }

  async delete(provider: string): Promise<void> {
    const keytar = await loadKeytar();
    const account = this.key(provider);
    if (keytar) {
      await keytar.deletePassword(this.serviceName, account);
      return;
    }
    fallback.delete(account);
  }
}

export type { SecureRecord };
