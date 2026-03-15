import { useQuery } from '@tanstack/react-query'
import type { ChatSession } from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.sapOpsDesktop

export function useSessions(limit = 50) {
  return useQuery<ChatSession[]>({
    queryKey: queryKeys.sessions.list(limit),
    queryFn: async () => {
      const list = await api.listSessions(limit)
      return Array.isArray(list) ? list : []
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}
