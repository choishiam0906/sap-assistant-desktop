import type { EmailProvider } from "./providers/emailProvider.js";
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
    private readonly providers: EmailProvider[],
    private readonly emailInboxRepo: EmailInboxRepository,
    private readonly emailTaskLinkRepo: EmailTaskLinkRepository,
    private readonly closingPlanRepo: ClosingPlanRepository,
    private readonly closingStepRepo: ClosingStepRepository,
    private readonly chatRuntime: ChatRuntime,
    private readonly secureStore: SecureStore,
  ) {}

  /**
   * 연결된 모든 provider에서 최신 메일을 동기화한다.
   */
  async syncInbox(sourceId?: string): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;

    const activeProviders = this.providers.filter((p) => p.isConnected());
    if (activeProviders.length === 0) {
      throw new Error(
        "연결된 이메일 provider가 없습니다. Gmail MCP 또는 Outlook을 연결하세요.",
      );
    }

    for (const provider of activeProviders) {
      try {
        const messages = await provider.sync(20);

        for (const msg of messages) {
          const existing = this.emailInboxRepo.findByProviderMessageId(
            msg.providerMessageId,
          );
          if (existing) {
            skipped += 1;
            continue;
          }

          this.emailInboxRepo.create({
            sourceId: sourceId ?? provider.type,
            providerMessageId: msg.providerMessageId,
            fromEmail: msg.fromEmail,
            fromName: msg.fromName,
            subject: msg.subject,
            bodyText: msg.bodyText,
            receivedAt: msg.receivedAt,
            labels: msg.labels,
            provider: provider.type,
          });
          added += 1;
        }
      } catch (err) {
        logger.error({ err, provider: provider.type }, "메일 동기화 실패");
      }
    }

    return { added, skipped };
  }

  /**
   * 특정 provider에서만 동기화
   */
  async syncProvider(
    providerType: string,
  ): Promise<{ added: number; skipped: number }> {
    const provider = this.providers.find((p) => p.type === providerType);
    if (!provider) {
      throw new Error(`지원하지 않는 이메일 provider: ${providerType}`);
    }
    if (!provider.isConnected()) {
      throw new Error(`${providerType} provider가 연결되어 있지 않습니다.`);
    }

    let added = 0;
    let skipped = 0;

    const messages = await provider.sync(20);
    for (const msg of messages) {
      const existing = this.emailInboxRepo.findByProviderMessageId(
        msg.providerMessageId,
      );
      if (existing) {
        skipped += 1;
        continue;
      }

      this.emailInboxRepo.create({
        sourceId: providerType,
        providerMessageId: msg.providerMessageId,
        fromEmail: msg.fromEmail,
        fromName: msg.fromName,
        subject: msg.subject,
        bodyText: msg.bodyText,
        receivedAt: msg.receivedAt,
        labels: msg.labels,
        provider: providerType,
      });
      added += 1;
    }

    return { added, skipped };
  }

  /**
   * 연결된 provider 목록 + 상태 반환
   */
  listProviders(): Array<{ type: string; connected: boolean }> {
    return this.providers.map((p) => ({
      type: p.type,
      connected: p.isConnected(),
    }));
  }

  /**
   * 메일 내용을 LLM으로 분석하여 Closing Plan + Steps를 자동 생성한다.
   */
  async analyzeAndCreatePlan(
    emailId: string,
    provider: string,
    model: string,
  ): Promise<{
    plan: ClosingPlan;
    steps: ClosingStep[];
    link: EmailTaskLink;
  }> {
    const email = this.emailInboxRepo.getById(emailId);
    if (!email) {
      throw new Error("메일을 찾을 수 없습니다.");
    }

    const prompt = buildEmailAnalysisPrompt(
      email.subject,
      email.bodyText,
      email.fromName,
    );

    const result = await this.chatRuntime.sendMessage({
      provider: provider as "openai" | "anthropic" | "google" | "copilot",
      model,
      message: prompt,
    });

    const analysis = parseEmailAnalysis(result.assistantMessage.content);

    const plan = this.closingPlanRepo.create({
      title: analysis.planTitle,
      description: analysis.planDescription,
      type: "custom",
      targetDate: analysis.targetDate,
    });

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

    this.closingPlanRepo.recalcProgress(plan.id);

    const link = this.emailTaskLinkRepo.create({
      emailId: email.id,
      planId: plan.id,
      aiSummary: analysis.planDescription,
    });

    this.emailInboxRepo.markProcessed(emailId);

    return { plan, steps, link };
  }

  /** 인박스 목록 조회 */
  listInbox(options?: {
    limit?: number;
    unprocessedOnly?: boolean;
    provider?: string;
  }): EmailInbox[] {
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
}
