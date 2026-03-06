import { useQuery } from '@tanstack/react-query'
import type { VaultClassification, VaultEntry } from '../../main/contracts'

const api = window.sapOpsDesktop

export function useVaultEntries(limit = 50) {
  return useQuery<VaultEntry[]>({
    queryKey: ['vault', limit],
    queryFn: () => api.listVaultEntries(limit),
  })
}

export function useVaultByClassification(
  classification: VaultClassification,
  query?: string,
  limit = 50
) {
  return useQuery<VaultEntry[]>({
    queryKey: ['vault', classification, query, limit],
    queryFn: () => api.searchVaultByClassification(classification, query, limit),
  })
}
