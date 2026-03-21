import { ipcMain } from "electron";

import type {
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStepInput,
  ClosingStepUpdate,
  PlanStatus,
} from "../contracts.js";
import type { IpcContext } from "./types.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";
import { IPC } from "./channels.js";
import { wrapHandler } from "./helpers/wrapHandler.js";

export function registerClosingHandlers(ctx: IpcContext): void {
  // ─── Plan CRUD (순수 패스쓰루 — registerCrudHandlers 내부에서 wrapHandler 적용) ───
  registerCrudHandlers({
    [IPC.COCKPIT_PLANS_LIST]: (limit?: number) => ctx.closingPlanRepo.list(limit),
    [IPC.COCKPIT_PLANS_GET]: (planId: string) => ctx.closingPlanRepo.getById(planId),
    [IPC.COCKPIT_PLANS_CREATE]: (input: ClosingPlanInput) => ctx.closingPlanRepo.create(input),
    [IPC.COCKPIT_PLANS_UPDATE]: (payload: { planId: string; update: ClosingPlanUpdate }) =>
      ctx.closingPlanRepo.update(payload.planId, payload.update),
    [IPC.COCKPIT_PLANS_DELETE]: (planId: string) => ctx.closingPlanRepo.delete(planId),
    [IPC.COCKPIT_PLANS_LIST_OVERDUE]: () => ctx.closingPlanRepo.listOverdue(),
    [IPC.COCKPIT_PLANS_LIST_BY_STATUS]: (status: PlanStatus) => ctx.closingPlanRepo.listByStatus(status),
    [IPC.COCKPIT_STATS]: () => ctx.closingPlanRepo.getStats(),
    [IPC.COCKPIT_STEPS_LIST]: (planId: string) => ctx.closingStepRepo.listByPlan(planId),
    [IPC.COCKPIT_STEPS_REORDER]: (payload: { planId: string; stepIds: string[] }) =>
      ctx.closingStepRepo.reorder(payload.planId, payload.stepIds),
  });

  // ─── Step 사이드 이펙트 핸들러 (recalcProgress) ───
  ipcMain.handle(IPC.COCKPIT_STEPS_CREATE, wrapHandler(IPC.COCKPIT_STEPS_CREATE, (_e, input: ClosingStepInput) => {
    const step = ctx.closingStepRepo.create(input);
    ctx.closingPlanRepo.recalcProgress(input.planId);
    return step;
  }));

  ipcMain.handle(IPC.COCKPIT_STEPS_UPDATE, wrapHandler(IPC.COCKPIT_STEPS_UPDATE, (_e, payload: { stepId: string; update: ClosingStepUpdate }) => {
    const step = ctx.closingStepRepo.update(payload.stepId, payload.update);
    if (step) {
      ctx.closingPlanRepo.recalcProgress(step.planId);
    }
    return step;
  }));

  ipcMain.handle(IPC.COCKPIT_STEPS_DELETE, wrapHandler(IPC.COCKPIT_STEPS_DELETE, (_e, stepId: string) => {
    const { deleted, planId } = ctx.closingStepRepo.delete(stepId);
    if (deleted && planId) {
      ctx.closingPlanRepo.recalcProgress(planId);
    }
    return deleted;
  }));
}
