import type { SecureStore } from "../../auth/secureStore.js";
import type { AppConfig } from "../../config.js";
import type {
  EmailProvider,
  EmailMessage,
  EmailProviderType,
} from "./emailProvider.js";
import { logger } from "../../logger.js";

interface GraphMessage {
  id: string;
  subject: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  body?: {
    content?: string;
    contentType?: string;
  };
  receivedDateTime?: string;
  categories?: string[];
}

interface GraphResponse {
  value?: GraphMessage[];
}

export class OutlookGraphProvider implements EmailProvider {
  readonly type: EmailProviderType = "outlook";

  constructor(
    private readonly secureStore: SecureStore,
    private readonly config: AppConfig,
  ) {}

  async sync(maxResults = 20): Promise<EmailMessage[]> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error("Outlook 인증 토큰이 없습니다. 설정에서 Microsoft 계정을 연결하세요.");
    }

    const url = `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc&$select=id,subject,from,body,receivedDateTime,categories`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      // 토큰 만료 — refresh 시도
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw new Error("Outlook 토큰 갱신 실패. 설정에서 다시 연결하세요.");
      }
      return this.sync(maxResults);
    }

    if (!response.ok) {
      throw new Error(`Graph API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GraphResponse;
    const messages = data.value ?? [];

    return messages.map((msg) => this.toEmailMessage(msg));
  }

  isConnected(): boolean {
    // 동기 호출이므로 캐시 기반 간이 체크
    // 실제 연결 여부는 sync() 호출 시 확인
    return this.config.oauthMicrosoftClientId !== "";
  }

  // ─── Private helpers ───

  private async getAccessToken(): Promise<string | null> {
    const record = await this.secureStore.get("microsoft");
    if (!record) return null;

    // 만료 체크
    if (record.expiresAt) {
      const expiresAt = new Date(record.expiresAt).getTime();
      if (Date.now() > expiresAt - 60_000) {
        // 1분 전 갱신
        const refreshed = await this.refreshAccessToken();
        return refreshed;
      }
    }

    return record.accessToken;
  }

  private async refreshAccessToken(): Promise<string | null> {
    const record = await this.secureStore.get("microsoft");
    if (!record?.refreshToken) return null;

    const clientId = this.config.oauthMicrosoftClientId;
    if (!clientId) return null;

    try {
      const response = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            grant_type: "refresh_token",
            refresh_token: record.refreshToken,
            scope: "openid profile email offline_access Mail.Read",
          }),
        },
      );

      if (!response.ok) {
        logger.warn("Outlook 토큰 갱신 실패");
        return null;
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      await this.secureStore.set("microsoft", {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? record.refreshToken,
        expiresAt,
      });

      return data.access_token;
    } catch (err) {
      logger.error({ err }, "Outlook 토큰 갱신 중 에러");
      return null;
    }
  }

  private toEmailMessage(msg: GraphMessage): EmailMessage {
    return {
      providerMessageId: msg.id,
      fromEmail: msg.from?.emailAddress?.address ?? "unknown@email.com",
      fromName: msg.from?.emailAddress?.name,
      subject: msg.subject ?? "(제목 없음)",
      bodyText: this.extractPlainText(msg.body?.content, msg.body?.contentType),
      receivedAt: msg.receivedDateTime ?? new Date().toISOString(),
      labels: msg.categories ?? [],
    };
  }

  private extractPlainText(
    content?: string,
    contentType?: string,
  ): string {
    if (!content) return "";
    if (contentType === "text") return content;
    // HTML → 간단 텍스트 추출
    return content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
