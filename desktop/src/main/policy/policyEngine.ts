import type { PolicyContext, PolicyDecision } from "../contracts.js";

export class PolicyEngine {
  evaluate(context: PolicyContext): PolicyDecision {
    if (context.securityMode === "secure-local") {
      return {
        allowed: false,
        reason: "원문 외부 전송 차단",
        requiresApproval: false,
      };
    }

    if (context.securityMode === "hybrid-approved") {
      return {
        allowed: false,
        reason: "승인 필요",
        requiresApproval: true,
      };
    }

    // reference 모드 → 허용
    return {
      allowed: true,
      reason: "공개 지식 모드",
      requiresApproval: false,
    };
  }
}
