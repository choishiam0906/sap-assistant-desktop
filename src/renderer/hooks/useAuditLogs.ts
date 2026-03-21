import { useQuery } from '@tanstack/react-query'
import type { AuditLogEntry, AuditSearchFilters } from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.assistantDesktop

export function useAuditLogs(limit = 50) {
  return useQuery<AuditLogEntry[]>({
    queryKey: queryKeys.audit.logs(limit),
    queryFn: () => api.listAuditLogs(limit),
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  })
}

export function useAuditSearch(filters: AuditSearchFilters, enabled = true) {
  return useQuery<AuditLogEntry[]>({
    queryKey: queryKeys.audit.search(filters),
    queryFn: () => api.searchAuditLogs(filters),
    enabled,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
  })
}
