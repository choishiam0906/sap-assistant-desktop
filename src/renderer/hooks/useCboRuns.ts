import { useQuery } from '@tanstack/react-query'
import type { CboAnalysisRunSummary } from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.assistantDesktop

export function useCboRuns(limit = 20, enabled = false) {
  return useQuery<CboAnalysisRunSummary[]>({
    queryKey: queryKeys.cbo.runs(limit),
    queryFn: async () => {
      const list = await api.listCboRuns(limit)
      return Array.isArray(list) ? list : []
    },
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  })
}
