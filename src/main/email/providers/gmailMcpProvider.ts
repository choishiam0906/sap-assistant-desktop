import type { McpConnector } from "../../sources/mcpConnector.js";
import type { EmailProvider, EmailMessage, EmailProviderType } from "./emailProvider.js";
import { logger } from "../../logger.js";

interface GmailMessageDetail {
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  labels: string[];
}

export class GmailMcpProvider implements EmailProvider {
  readonly type: EmailProviderType = "gmail";

  constructor(private readonly mcpConnector: McpConnector) {}

  async sync(maxResults = 20): Promise<EmailMessage[]> {
    const servers = this.mcpConnector.listConnectedServers();
    const gmailServer = servers.find((s) => s.toLowerCase().includes("gmail"));
    if (!gmailServer) {
      throw new Error("Gmail MCP 서버가 연결되어 있지 않습니다.");
    }

    const searchResult = await this.callMcpTool(gmailServer, "gmail_search_messages", {
      query: "is:inbox",
      maxResults,
    });

    const messages = this.parseGmailSearchResult(searchResult);
    const result: EmailMessage[] = [];

    for (const msg of messages) {
      try {
        const readResult = await this.callMcpTool(gmailServer, "gmail_read_message", {
          messageId: msg.id,
        });
        const detail = this.parseGmailReadResult(readResult);
        result.push({
          providerMessageId: msg.id,
          fromEmail: detail.fromEmail,
          fromName: detail.fromName,
          subject: detail.subject,
          bodyText: detail.bodyText,
          receivedAt: detail.receivedAt,
          labels: detail.labels,
        });
      } catch (err) {
        logger.warn({ messageId: msg.id, err }, "메일 상세 읽기 실패, 건너뜀");
      }
    }

    return result;
  }

  isConnected(): boolean {
    const servers = this.mcpConnector.listConnectedServers();
    return servers.some((s) => s.toLowerCase().includes("gmail"));
  }

  // ─── Private helpers ───

  private async callMcpTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const connections = (
      this.mcpConnector as unknown as {
        connections: Map<
          string,
          {
            client: {
              callTool: (params: {
                name: string;
                arguments: Record<string, unknown>;
              }) => Promise<unknown>;
            };
          }
        >;
      }
    ).connections;
    const connection = connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP 서버 '${serverName}'에 연결되어 있지 않습니다.`);
    }
    return connection.client.callTool({ name: toolName, arguments: args });
  }

  private parseGmailSearchResult(result: unknown): Array<{ id: string }> {
    const content = (result as { content?: Array<{ text?: string }> })?.content;
    if (!content?.[0]?.text) return [];
    try {
      const parsed = JSON.parse(content[0].text) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (m): m is { id: string } =>
              typeof m === "object" && m !== null && "id" in m,
          )
          .map((m) => ({ id: String(m.id) }));
      }
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "messages" in parsed
      ) {
        const msgs = (parsed as { messages: unknown[] }).messages;
        return (Array.isArray(msgs) ? msgs : [])
          .filter(
            (m): m is { id: string } =>
              typeof m === "object" && m !== null && "id" in m,
          )
          .map((m) => ({ id: String(m.id) }));
      }
    } catch {
      logger.warn("Gmail 검색 결과 파싱 실패");
    }
    return [];
  }

  private parseGmailReadResult(result: unknown): GmailMessageDetail {
    const content = (result as { content?: Array<{ text?: string }> })?.content;
    const text = content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return {
        fromEmail: String(
          parsed.from ?? parsed.fromEmail ?? "unknown@email.com",
        ),
        fromName: parsed.fromName ? String(parsed.fromName) : undefined,
        subject: String(parsed.subject ?? "(제목 없음)"),
        bodyText: String(
          parsed.body ?? parsed.bodyText ?? parsed.snippet ?? "",
        ),
        receivedAt: String(
          parsed.date ?? parsed.receivedAt ?? new Date().toISOString(),
        ),
        labels: Array.isArray(parsed.labels)
          ? parsed.labels.map(String)
          : [],
      };
    } catch {
      return {
        fromEmail: "unknown@email.com",
        subject: "(제목 없음)",
        bodyText: text,
        receivedAt: new Date().toISOString(),
        labels: [],
      };
    }
  }
}
