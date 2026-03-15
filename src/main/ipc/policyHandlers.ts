import { ipcMain } from "electron";
import type { PolicyEngine } from "../policy/policyEngine.js";
import type { PolicyRuleInput, PolicyEvaluationContext } from "../policy/policyRules.js";
import type { ApprovalManager } from "../policy/approvalManager.js";
import { IPC } from "./channels.js";

export interface PolicyIpcContext {
  policyEngine: PolicyEngine;
  approvalManager: ApprovalManager;
}

export function registerPolicyHandlers(ctx: PolicyIpcContext): void {
  ipcMain.handle(IPC.POLICY_RULES_LIST, () => {
    return ctx.policyEngine.listRules();
  });

  ipcMain.handle(IPC.POLICY_RULES_CREATE, (_event, input: PolicyRuleInput) => {
    return ctx.policyEngine.createRule(input);
  });

  ipcMain.handle(IPC.POLICY_RULES_UPDATE, (_event, id: string, patch: Partial<PolicyRuleInput> & { enabled?: boolean }) => {
    return ctx.policyEngine.updateRule(id, patch);
  });

  ipcMain.handle(IPC.POLICY_RULES_DELETE, (_event, id: string) => {
    return ctx.policyEngine.deleteRule(id);
  });

  ipcMain.handle(IPC.POLICY_EVALUATE, (_event, context: PolicyEvaluationContext) => {
    return ctx.policyEngine.evaluate(context);
  });

  ipcMain.handle(IPC.POLICY_APPROVALS_LIST, () => {
    return ctx.approvalManager.listPending();
  });

  ipcMain.handle(IPC.POLICY_APPROVALS_DECIDE, (_event, requestId: string, approved: boolean) => {
    ctx.approvalManager.decide(requestId, approved);
  });
}
