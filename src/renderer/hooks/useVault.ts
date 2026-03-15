import { useQuery } from '@tanstack/react-query'
import type { VaultClassification, VaultEntry } from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.sapOpsDesktop

export function useVaultEntries(limit = 50) {
  return useQuery<VaultEntry[]>({
    queryKey: queryKeys.vault.list(limit),
    queryFn: () => api.listVaultEntries(limit),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })
}

export function useVaultByClassification(
  classification: VaultClassification,
  query?: string,
  limit = 50
) {
  return useQuery<VaultEntry[]>({
    queryKey: queryKeys.vault.byClassification(classification, query, limit),
    queryFn: () => api.searchVaultByClassification(classification, query, limit),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })
}
