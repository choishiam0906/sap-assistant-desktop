export type EmailProviderType = "gmail" | "outlook";

export interface EmailMessage {
  providerMessageId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  labels: string[];
}

export interface EmailProvider {
  readonly type: EmailProviderType;
  sync(maxResults?: number): Promise<EmailMessage[]>;
  isConnected(): boolean;
}
