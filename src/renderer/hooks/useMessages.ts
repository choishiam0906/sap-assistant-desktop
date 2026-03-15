import { useQuery } from '@tanstack/react-query'
import type { ChatMessage } from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.sapOpsDesktop

export function useMessages(sessionId: string | null, limit = 100) {
  return useQuery<ChatMessage[]>({
    queryKey: queryKeys.messages.list(sessionId, limit),
    queryFn: async () => {
      if (!sessionId) return []
      const msgs = await api.getSessionMessages(sessionId, limit)
      return Array.isArray(msgs) ? msgs : []
    },
    enabled: !!sessionId,
    staleTime: 24 * 60 * 60_000,
    gcTime: 7 * 24 * 60 * 60_000,
  })
}
