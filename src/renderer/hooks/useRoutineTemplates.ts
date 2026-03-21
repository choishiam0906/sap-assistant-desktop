import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  RoutineTemplate,
  RoutineTemplateInput,
  RoutineKnowledgeLink,
  RoutineKnowledgeLinkInput,
  RoutineTemplateStep,
  RoutineTemplateUpdate,
  RoutineExecution,
  RoutineFrequency,
} from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.assistantDesktop

const ROUTINE_STALE = 60_000
const ROUTINE_GC = 10 * 60_000

// ─── Template Queries ───

export function useRoutineTemplates() {
  return useQuery<RoutineTemplate[]>({
    queryKey: queryKeys.routines.templates(),
    queryFn: () => api.listRoutineTemplates(),
    staleTime: ROUTINE_STALE,
    gcTime: ROUTINE_GC,
  })
}

export function useRoutineTemplatesByFrequency(frequency: RoutineFrequency) {
  return useQuery<RoutineTemplate[]>({
    queryKey: queryKeys.routines.templatesByFrequency(frequency),
    queryFn: () => api.listRoutineTemplatesByFrequency(frequency),
    staleTime: ROUTINE_STALE,
    gcTime: ROUTINE_GC,
  })
}

export function useRoutineTemplate(id: string | null) {
  return useQuery<{ template: RoutineTemplate; steps: RoutineTemplateStep[] } | null>({
    queryKey: queryKeys.routines.template(id),
    queryFn: () => (id ? api.getRoutineTemplate(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: ROUTINE_STALE,
    gcTime: ROUTINE_GC,
  })
}

// ─── Template Mutations ───

export function useCreateRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<RoutineTemplate, Error, RoutineTemplateInput>({
    mutationFn: (input) => api.createRoutineTemplate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.templates() })
    },
  })
}

export function useUpdateRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<RoutineTemplate | null, Error, { id: string; patch: RoutineTemplateUpdate }>({
    mutationFn: ({ id, patch }) => api.updateRoutineTemplate(id, patch),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.templates() })
      qc.invalidateQueries({ queryKey: queryKeys.routines.template(id) })
    },
  })
}

export function useDeleteRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, string>({
    mutationFn: (id) => api.deleteRoutineTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.templates() })
    },
  })
}

export function useToggleRoutineTemplate() {
  const qc = useQueryClient()
  return useMutation<RoutineTemplate | null, Error, string>({
    mutationFn: (id) => api.toggleRoutineTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.templates() })
    },
  })
}

export function useRoutineKnowledgeLinks(templateId: string | null) {
  return useQuery<RoutineKnowledgeLink[]>({
    queryKey: queryKeys.routines.knowledge(templateId),
    queryFn: () => (templateId ? api.listRoutineKnowledgeLinks(templateId) : Promise.resolve([])),
    enabled: !!templateId,
    staleTime: ROUTINE_STALE,
    gcTime: ROUTINE_GC,
  })
}

export function usePinRoutineKnowledgeLink() {
  const qc = useQueryClient()
  return useMutation<RoutineKnowledgeLink, Error, RoutineKnowledgeLinkInput>({
    mutationFn: (input) => api.linkRoutineKnowledge(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.knowledge(input.templateId) })
    },
  })
}

export function useUnpinRoutineKnowledgeLink() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, { linkId: string; templateId: string }>({
    mutationFn: ({ linkId }) => api.unlinkRoutineKnowledge(linkId),
    onSuccess: (_data, { templateId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.knowledge(templateId) })
    },
  })
}

// ─── Execution ───

export function useExecuteRoutinesNow() {
  const qc = useQueryClient()
  return useMutation<{ created: number; skipped: number }, Error, void>({
    mutationFn: () => api.executeRoutinesNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.executions() })
      qc.invalidateQueries({ queryKey: queryKeys.closing.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.closing.stats() })
    },
  })
}

export function useRoutineExecutions(date?: string) {
  return useQuery<RoutineExecution[]>({
    queryKey: queryKeys.routines.executions(date),
    queryFn: () => api.listRoutineExecutions(date),
    staleTime: ROUTINE_STALE,
    gcTime: ROUTINE_GC,
  })
}

export function useRoutinePlanIds(date: string) {
  return useQuery<string[]>({
    queryKey: queryKeys.routines.planIds(date),
    queryFn: () => api.getRoutineExecutionPlanIds(date),
    enabled: !!date,
    staleTime: ROUTINE_STALE,
    gcTime: ROUTINE_GC,
  })
}
