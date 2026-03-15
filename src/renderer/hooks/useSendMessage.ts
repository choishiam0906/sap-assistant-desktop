import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SendMessageInput, SendMessageOutput } from '../../main/contracts'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { queryKeys } from './queryKeys.js'

const api = window.sapOpsDesktop

export function useSendMessage() {
  const queryClient = useQueryClient()
  const domainPack = useWorkspaceStore((s) => s.domainPack)

  return useMutation<SendMessageOutput, Error, Omit<SendMessageInput, 'domainPack'>>({
    mutationFn: (input) => api.sendMessage({ ...input, domainPack }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
    },
  })
}
