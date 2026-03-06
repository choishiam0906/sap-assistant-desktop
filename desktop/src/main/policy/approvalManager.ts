import { randomUUID } from "node:crypto";

export interface ApprovalRequest {
  id: string;
  sessionId: string | null;
  summary: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export class ApprovalManager {
  private readonly pending = new Map<string, ApprovalRequest>();
  private readonly resolvers = new Map<
    string,
    { resolve: (approved: boolean) => void }
  >();

  requestApproval(sessionId: string | null, summary: string): Promise<boolean> {
    const request: ApprovalRequest = {
      id: randomUUID(),
      sessionId,
      summary,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    this.pending.set(request.id, request);

    return new Promise<boolean>((resolve) => {
      this.resolvers.set(request.id, { resolve });
    });
  }

  decide(requestId: string, approved: boolean): void {
    const request = this.pending.get(requestId);
    if (!request) return;

    request.status = approved ? "approved" : "rejected";
    this.pending.delete(requestId);

    const resolver = this.resolvers.get(requestId);
    if (resolver) {
      resolver.resolve(approved);
      this.resolvers.delete(requestId);
    }
  }

  listPending(): ApprovalRequest[] {
    return Array.from(this.pending.values());
  }
}
