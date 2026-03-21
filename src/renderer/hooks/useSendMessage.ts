import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SendMessageInput, SendMessageOutput } from '../../main/contracts'
import { queryKeys } from './queryKeys.js'

const api = window.assistantDesktop

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation<SendMessageOutput, Error, SendMessageInput>({
    mutationFn: (input) => api.sendMessage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
    },
  })
}
