import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ClosingPlan,
  ClosingPlanInput,
  ClosingPlanUpdate,
  ClosingStep,
  ClosingStepInput,
  ClosingStepUpdate,
  ClosingStats,
} from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.sapOpsDesktop

const CLOSING_STALE = 60_000
const CLOSING_GC = 10 * 60_000

// ─── Plan Queries ───

export function usePlans(limit?: number) {
  return useQuery<ClosingPlan[]>({
    queryKey: queryKeys.closing.plans(limit),
    queryFn: () => api.listPlans(limit),
    staleTime: CLOSING_STALE,
    gcTime: CLOSING_GC,
  })
}

export function usePlan(planId: string | null) {
  return useQuery<ClosingPlan | null>({
    queryKey: queryKeys.closing.plan(planId),
    queryFn: () => (planId ? api.getPlan(planId) : Promise.resolve(null)),
    enabled: !!planId,
    staleTime: CLOSING_STALE,
    gcTime: CLOSING_GC,
  })
}

// ─── Plan Mutations ───

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation<ClosingPlan, Error, ClosingPlanInput>({
    mutationFn: (input) => api.createPlan(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.closing.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.closing.stats() })
    },
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation<ClosingPlan | null, Error, { planId: string; update: ClosingPlanUpdate }>({
    mutationFn: ({ planId, update }) => api.updatePlan(planId, update),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.closing.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.closing.plan(planId) })
      qc.invalidateQueries({ queryKey: queryKeys.closing.stats() })
    },
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, string>({
    mutationFn: (planId) => api.deletePlan(planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.closing.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.closing.stats() })
    },
  })
}

// ─── Step Queries ───

export function useSteps(planId: string | null) {
  return useQuery<ClosingStep[]>({
    queryKey: queryKeys.closing.steps(planId),
    queryFn: () => (planId ? api.listSteps(planId) : Promise.resolve([])),
    enabled: !!planId,
    staleTime: CLOSING_STALE,
    gcTime: CLOSING_GC,
  })
}

// ─── Step Mutations ───

export function useCreateStep() {
  const qc = useQueryClient()
  return useMutation<ClosingStep, Error, ClosingStepInput>({
    mutationFn: (input) => api.createStep(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.closing.steps(input.planId) })
      qc.invalidateQueries({ queryKey: queryKeys.closing.plan(input.planId) })
      qc.invalidateQueries({ queryKey: queryKeys.closing.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.closing.stats() })
    },
  })
}

export function useUpdateStep() {
  const qc = useQueryClient()
  return useMutation<ClosingStep | null, Error, { stepId: string; update: ClosingStepUpdate }>({
    mutationFn: ({ stepId, update }) => api.updateStep(stepId, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['closing:steps'] })
      qc.invalidateQueries({ queryKey: ['closing:plans'] })
      qc.invalidateQueries({ queryKey: ['closing:plan'] })
      qc.invalidateQueries({ queryKey: queryKeys.closing.stats() })
    },
  })
}

export function useDeleteStep() {
  const qc = useQueryClient()
  return useMutation<boolean, Error, { stepId: string; planId: string }>({
    mutationFn: ({ stepId }) => api.deleteStep(stepId),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.closing.steps(planId) })
      qc.invalidateQueries({ queryKey: queryKeys.closing.plan(planId) })
      qc.invalidateQueries({ queryKey: queryKeys.closing.plans() })
      qc.invalidateQueries({ queryKey: queryKeys.closing.stats() })
    },
  })
}

export function useReorderSteps() {
  const qc = useQueryClient()
  return useMutation<void, Error, { planId: string; stepIds: string[] }>({
    mutationFn: ({ planId, stepIds }) => api.reorderSteps(planId, stepIds),
    onSuccess: (_data, { planId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.closing.steps(planId) })
    },
  })
}

// ─── Stats ───

export function useClosingStats() {
  return useQuery<ClosingStats>({
    queryKey: queryKeys.closing.stats(),
    queryFn: () => api.getClosingStats(),
    refetchInterval: 60_000,
    staleTime: CLOSING_STALE,
    gcTime: CLOSING_GC,
  })
}
