import { ipcMain } from "electron";

import type {
  RoutineKnowledgeLinkInput,
  RoutineTemplateInput,
  RoutineTemplateUpdate,
  RoutineFrequency,
} from "../contracts.js";
import type { IpcContext } from "./types.js";
import { registerCrudHandlers } from "./helpers/registerCrudHandlers.js";
import { IPC } from "./channels.js";

export function registerRoutineHandlers(ctx: IpcContext): void {
  // ─── 순수 패스쓰루 ───
  registerCrudHandlers({
    [IPC.ROUTINE_TEMPLATES_LIST]: () => ctx.routineTemplateRepo.list(),
    [IPC.ROUTINE_TEMPLATES_LIST_BY_FREQUENCY]: (frequency: RoutineFrequency) =>
      ctx.routineTemplateRepo.listByFrequency(frequency, false),
    [IPC.ROUTINE_TEMPLATES_CREATE]: (input: RoutineTemplateInput) =>
      ctx.routineTemplateRepo.create(input),
    [IPC.ROUTINE_TEMPLATES_UPDATE]: (payload: { id: string; patch: RoutineTemplateUpdate }) =>
      ctx.routineTemplateRepo.update(payload.id, payload.patch),
    [IPC.ROUTINE_TEMPLATES_DELETE]: (id: string) => ctx.routineTemplateRepo.delete(id),
    [IPC.ROUTINE_TEMPLATES_TOGGLE]: (id: string) => ctx.routineTemplateRepo.toggle(id),
    [IPC.ROUTINE_KNOWLEDGE_LIST]: (templateId: string) =>
      ctx.routineKnowledgeLinkRepo.listByTemplateId(templateId),
    [IPC.ROUTINE_KNOWLEDGE_LINK]: (input: RoutineKnowledgeLinkInput) =>
      ctx.routineKnowledgeLinkRepo.upsert(input),
    [IPC.ROUTINE_KNOWLEDGE_UNLINK]: (id: string) => ctx.routineKnowledgeLinkRepo.delete(id),
    [IPC.ROUTINE_EXECUTE_NOW]: () => ctx.routineExecutor.executeDueRoutines(),
    [IPC.ROUTINE_EXECUTIONS_LIST]: (date?: string) => ctx.routineExecutionRepo.listByDate(date),
    [IPC.ROUTINE_EXECUTIONS_PLAN_IDS]: (date: string) => ctx.routineExecutionRepo.getPlanIdsByDate(date),
  });

  // ─── 커스텀 로직 (template + steps 결합) ───
  ipcMain.handle(IPC.ROUTINE_TEMPLATES_GET, (_e, id: string) => {
    const template = ctx.routineTemplateRepo.getById(id);
    if (!template) return null;
    const steps = ctx.routineTemplateRepo.getSteps(id);
    return { template, steps };
  });
}
