import { useQuery } from '@tanstack/react-query'
import type { AuditLogEntry, AuditSearchFilters } from '../../main/contracts'

const api = window.sapOpsDesktop

export function useAuditLogs(limit = 50) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ['auditLogs', limit],
    queryFn: () => api.listAuditLogs(limit),
  })
}

export function useAuditSearch(filters: AuditSearchFilters, enabled = true) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ['auditLogs', 'search', filters],
    queryFn: () => api.searchAuditLogs(filters),
    enabled,
  })
}
