import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SendMessageInput, SendMessageOutput } from '../../main/contracts'
import { useWorkspaceStore } from '../stores/workspaceStore'

const api = window.sapOpsDesktop

export function useSendMessage() {
  const queryClient = useQueryClient()
  const securityMode = useWorkspaceStore((s) => s.securityMode)
  const domainPack = useWorkspaceStore((s) => s.domainPack)

  return useMutation<SendMessageOutput, Error, Omit<SendMessageInput, 'securityMode' | 'domainPack'>>({
    mutationFn: (input) => api.sendMessage({ ...input, securityMode, domainPack }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
