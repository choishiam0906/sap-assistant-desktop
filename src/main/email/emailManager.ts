import type { McpConnector } from "../sources/mcpConnector.js";
import type { ChatRuntime } from "../chatRuntime.js";
import type { SecureStore } from "../auth/secureStore.js";
import type {
  EmailInboxRepository,
  EmailTaskLinkRepository,
} from "../storage/repositories/emailRepository.js";
import type { ClosingPlanRepository } from "../storage/repositories/closingPlanRepository.js";
import type { ClosingStepRepository } from "../storage/repositories/closingStepRepository.js";
import type { EmailInbox, EmailTaskLink } from "../storage/repositories/emailRepository.js";
import type { ClosingPlan, ClosingStep } from "../contracts.js";
import { buildEmailAnalysisPrompt, parseEmailAnalysis } from "./emailAnalysisPrompt.js";
import { logger } from "../logger.js";

export class EmailManager {
  constructor(
    private readonly mcpConnector: McpConnector,
    private readonly emailInboxRepo: EmailInboxRepository,
    private readonly emailTaskLinkRepo: EmailTaskLinkRepository,
    private readonly closingPlanRepo: ClosingPlanRepository,
    private readonly closingStepRepo: ClosingStepRepository,
    private readonly chatRuntime: ChatRuntime,
    private readonly secureStore: SecureStore,
  ) {}

  /**
   * Gmail MCP 서버의 gmail_search_messages → gmail_read_message 를 통해
   * 최신 메일을 가져와 email_inbox에 저장한다.
   */
  async syncInbox(sourceId: string): Promise<{ added: number; skipped: number }> {
    // Gmail MCP 서버에서 메일 검색 (callTool 사용)
    const servers = this.mcpConnector.listConnectedServers();
    const gmailServer = servers.find((s) => s.toLowerCase().includes("gmail"));
    if (!gmailServer) {
      throw new Error("Gmail MCP 서버가 연결되어 있지 않습니다. 먼저 Gmail MCP 서버를 연결하세요.");
    }

    let added = 0;
    let skipped = 0;

    try {
      // Gmail MCP의 gmail_search_messages 도구 호출
      const searchResult = await this.callMcpTool(gmailServer, "gmail_search_messages", {
        query: "is:inbox",
        maxResults: 20,
      });

      const messages = this.parseGmailSearchResult(searchResult);

      for (const msg of messages) {
        // 이미 동기화된 메일인지 확인
        const existing = this.emailInboxRepo.findByProviderMessageId(msg.id);
        if (existing) {
          skipped += 1;
          continue;
        }

        // 메일 상세 내용 읽기
        let detail: GmailMessageDetail;
        try {
          const readResult = await this.callMcpTool(gmailServer, "gmail_read_message", {
            messageId: msg.id,
          });
          detail = this.parseGmailReadResult(readResult);
        } catch (err) {
          logger.warn({ messageId: msg.id, err }, "메일 상세 읽기 실패, 건너뜀");
          skipped += 1;
          continue;
        }

        this.emailInboxRepo.create({
          sourceId,
          providerMessageId: msg.id,
          fromEmail: detail.fromEmail,
          fromName: detail.fromName,
          subject: detail.subject,
          bodyText: detail.bodyText,
          receivedAt: detail.receivedAt,
          labels: detail.labels,
        });
        added += 1;
      }
    } catch (err) {
      logger.error({ err }, "메일 동기화 실패");
      throw err;
    }

    return { added, skipped };
  }

  /**
   * 메일 내용을 LLM으로 분석하여 Closing Plan + Steps를 자동 생성한다.
   */
  async analyzeAndCreatePlan(emailId: string, provider: string, model: string): Promise<{
    plan: ClosingPlan;
    steps: ClosingStep[];
    link: EmailTaskLink;
  }> {
    const email = this.emailInboxRepo.getById(emailId);
    if (!email) {
      throw new Error("메일을 찾을 수 없습니다.");
    }

    // LLM 분석 프롬프트 생성
    const prompt = buildEmailAnalysisPrompt(email.subject, email.bodyText, email.fromName);

    // ChatRuntime을 통해 LLM 호출
    const result = await this.chatRuntime.sendMessage({
      provider: provider as "openai" | "anthropic" | "google" | "copilot",
      model,
      message: prompt,
    });

    // LLM 응답 파싱
    const analysis = parseEmailAnalysis(result.assistantMessage.content);

    // Closing Plan 생성
    const plan = this.closingPlanRepo.create({
      title: analysis.planTitle,
      description: analysis.planDescription,
      type: "custom",
      targetDate: analysis.targetDate,
    });

    // Steps 생성
    const steps: ClosingStep[] = [];
    for (const item of analysis.actionItems) {
      const step = this.closingStepRepo.create({
        planId: plan.id,
        title: item.title,
        deadline: item.deadline,
        assignee: item.assignee ?? undefined,
      });
      steps.push(step);
    }

    // 진행률 재계산
    this.closingPlanRepo.recalcProgress(plan.id);

    // 메일 ↔ Plan 연결
    const link = this.emailTaskLinkRepo.create({
      emailId: email.id,
      planId: plan.id,
      aiSummary: analysis.planDescription,
    });

    // 메일을 처리 완료로 마킹
    this.emailInboxRepo.markProcessed(emailId);

    return { plan, steps, link };
  }

  /** 인박스 목록 조회 */
  listInbox(options?: { limit?: number; unprocessedOnly?: boolean }): EmailInbox[] {
    return this.emailInboxRepo.list(options);
  }

  /** 메일 상세 조회 */
  getDetail(emailId: string): EmailInbox | null {
    return this.emailInboxRepo.getById(emailId);
  }

  /** 메일에 연결된 Plan 목록 */
  listLinkedPlans(emailId: string): EmailTaskLink[] {
    return this.emailTaskLinkRepo.listByEmail(emailId);
  }

  // ─── Private helpers ───

  private async callMcpTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    // McpConnector 내부의 connection에서 client.callTool 사용
    // McpConnector가 직접 callTool을 노출하지 않으므로 내부 접근
    const connections = (this.mcpConnector as unknown as { connections: Map<string, { client: { callTool: (params: { name: string; arguments: Record<string, unknown> }) => Promise<unknown> } }> }).connections;
    const connection = connections.get(serverName);
    if (!connection) {
      throw new Error(`MCP 서버 '${serverName}'에 연결되어 있지 않습니다.`);
    }
    return connection.client.callTool({ name: toolName, arguments: args });
  }

  private parseGmailSearchResult(result: unknown): Array<{ id: string }> {
    // MCP callTool 응답은 { content: [{ type: "text", text: "..." }] } 형태
    const content = (result as { content?: Array<{ text?: string }> })?.content;
    if (!content?.[0]?.text) return [];
    try {
      const parsed = JSON.parse(content[0].text) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((m): m is { id: string } => typeof m === "object" && m !== null && "id" in m)
          .map((m) => ({ id: String(m.id) }));
      }
      // 단일 결과 구조일 수도 있음
      if (typeof parsed === "object" && parsed !== null && "messages" in parsed) {
        const msgs = (parsed as { messages: unknown[] }).messages;
        return (Array.isArray(msgs) ? msgs : [])
          .filter((m): m is { id: string } => typeof m === "object" && m !== null && "id" in m)
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
        fromEmail: String(parsed.from ?? parsed.fromEmail ?? "unknown@email.com"),
        fromName: parsed.fromName ? String(parsed.fromName) : undefined,
        subject: String(parsed.subject ?? "(제목 없음)"),
        bodyText: String(parsed.body ?? parsed.bodyText ?? parsed.snippet ?? ""),
        receivedAt: String(parsed.date ?? parsed.receivedAt ?? new Date().toISOString()),
        labels: Array.isArray(parsed.labels) ? parsed.labels.map(String) : [],
      };
    } catch {
      // 텍스트 형태 응답인 경우 그대로 사용
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

interface GmailMessageDetail {
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  labels: string[];
}
