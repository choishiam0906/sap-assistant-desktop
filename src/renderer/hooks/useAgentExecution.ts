import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './queryKeys.js'
import { useChatStore } from '../stores/chatStore.js'

const api = window.assistantDesktop

/**
 * 대화형 에이전트 IPC 이벤트 4개를 구독하여 chatStore 상태를 갱신하는 훅.
 * ChatDetail에서 한 번만 호출한다.
 */
export function useAgentExecution() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubStepStarted = api.onAgentStepStarted((event) => {
      const state = useChatStore.getState()

      // 프로그레스 업데이트
      if (state.agentExecution && state.agentExecution.executionId === event.executionId) {
        useChatStore.setState({
          agentExecution: {
            ...state.agentExecution,
            currentStepIndex: event.stepIndex,
            currentStepLabel: event.stepLabel,
            totalSteps: event.totalSteps,
            status: 'running',
          },
        })
      }

      // 스트리밍 시작 준비
      useChatStore.setState({ isStreaming: true, streamingContent: '' })
    })

    const unsubStepCompleted = api.onAgentStepCompleted((event) => {
      // 스트리밍 리셋
      useChatStore.setState({ isStreaming: false, streamingContent: '' })

      // 세션 ID 설정 (동일 세션에 누적)
      const session = event.session as { id?: string } | null
      if (session?.id) {
        useChatStore.setState({ currentSessionId: session.id })
        // 메시지 목록 갱신
        void queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(session.id, 100) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
      }
    })

    const unsubDone = api.onAgentExecutionDone((event) => {
      const state = useChatStore.getState()
      if (state.agentExecution && state.agentExecution.executionId === event.executionId) {
        useChatStore.setState({
          agentExecution: {
            ...state.agentExecution,
            status: event.status === 'completed' ? 'completed' : 'failed',
            errorMessage: event.errorMessage,
          },
        })
      }

      // 스트리밍 정리
      useChatStore.setState({ isStreaming: false, streamingContent: '' })
    })

    const unsubError = api.onAgentExecutionError((data) => {
      const state = useChatStore.getState()
      if (state.agentExecution && state.agentExecution.executionId === data.executionId) {
        useChatStore.setState({
          agentExecution: {
            ...state.agentExecution,
            status: 'failed',
            errorMessage: data.error,
          },
          error: data.error,
          isStreaming: false,
          streamingContent: '',
        })
      }
    })

    return () => {
      unsubStepStarted()
      unsubStepCompleted()
      unsubDone()
      unsubError()
    }
  }, [queryClient])
}
