import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen } from 'lucide-react'
import { queryKeys } from '../../hooks/queryKeys.js'
import type {
  AgentDefinition,
  AgentExecution,
} from '../../../main/contracts.js'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'
import { AgentExecutionModal } from './AgentExecutionModal.js'
import { AgentEditor } from '../../components/knowledge/AgentEditor.js'
import { AgentListSection } from './agents/AgentListSection.js'
import { AgentDetailPanel } from './agents/AgentDetailPanel.js'
import { useChatStore } from '../../stores/chatStore.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import '../../components/knowledge/AgentEditor.css'
import './AgentsCatalog.css'

const api = window.assistantDesktop

export function AgentsCatalog() {
  const queryClient = useQueryClient()

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null)
  const [modalExecution, setModalExecution] = useState<AgentExecution | null>(null)
  const [editorMode, setEditorMode] = useState<'hidden' | 'new' | 'edit'>('hidden')
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | null>(null)

  // ─── 에이전트 목록 조회 ───
  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.list(),
    queryFn: () => api.listAgents(),
    staleTime: 60_000,
  })

  // ─── 스킬 목록 (에디터용) ───
  const { data: skills = [] } = useQuery({
    queryKey: queryKeys.skills.list(),
    queryFn: () => api.listSkills(),
    staleTime: 60_000,
  })

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null

  // ─── 실행 이력 조회 ───
  const { data: executions = [] } = useQuery({
    queryKey: queryKeys.agents.executions(selectedAgentId ?? undefined),
    queryFn: () => api.listAgentExecutions({ agentId: selectedAgentId ?? undefined, limit: 10 }),
    enabled: !!selectedAgentId,
    staleTime: 5_000,
  })

  // ─── 실행 중 상태 폴링 ───
  const { data: activeExecution } = useQuery({
    queryKey: queryKeys.agents.execution(activeExecutionId!),
    queryFn: () => api.getAgentExecution(activeExecutionId!),
    enabled: !!activeExecutionId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && data.status !== 'running') return false
      return 2000
    },
  })

  // 실행 완료 시 이력 갱신 & 폴링 중단
  if (activeExecution && activeExecution.status !== 'running') {
    if (activeExecutionId) {
      setActiveExecutionId(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.executions() })
    }
  }

  // ─── 실행 mutation ───
  const executeMutation = useMutation({
    mutationFn: (agentId: string) => api.executeAgent(agentId),
    onSuccess: (executionId) => {
      setActiveExecutionId(executionId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.executions() })
    },
  })

  // ─── 취소 mutation ───
  const cancelMutation = useMutation({
    mutationFn: (execId: string) => api.cancelAgentExecution(execId),
    onSuccess: () => {
      setActiveExecutionId(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.agents.executions() })
    },
  })

  // ─── 대화형 실행 → Chat 페이지로 이동 ───
  function handleExecuteInteractive() {
    if (!selectedAgent) return
    // chatStore에 에이전트 실행 상태 설정
    useChatStore.setState({
      agentExecution: {
        executionId: '', // startInteractiveExecution 호출 후 업데이트됨
        agentId: selectedAgent.id,
        agentTitle: selectedAgent.title,
        currentStepIndex: 0,
        totalSteps: selectedAgent.steps.length,
        currentStepLabel: '시작 대기 중...',
        status: 'running',
      },
      currentSessionId: null,
    })
    // Chat 페이지로 이동
    useAppShellStore.getState().setSection('assistant', 'chat')
  }

  // ─── 이력 클릭 → 상세 모달 ───
  async function handleViewExecution(execId: string) {
    const exec = await api.getAgentExecution(execId)
    if (exec) setModalExecution(exec)
  }

  // ─── 커스텀 에이전트 삭제 핸들러 ───
  async function handleDeleteAgent(agentId: string) {
    await api.deleteCustomAgent(`${agentId}.agent.md`)
    void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list() })
  }

  return (
    <div className="agents-page">
      <div className="agents-action-bar">
        <div className="agents-badges">
          <Badge variant="success">엔터프라이즈 보호</Badge>
        </div>
        <div className="agents-actions">
          <Button variant="ghost" size="sm" onClick={() => api.openAgentFolder()}>
            <FolderOpen size={14} aria-hidden="true" />
            폴더
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditorMode('new')
              setEditingAgent(null)
            }}
          >
            <Plus size={14} aria-hidden="true" />
            새 에이전트
          </Button>
        </div>
      </div>

      {/* ─── 에디터 모드 ─── */}
      {editorMode !== 'hidden' && (
        <AgentEditor
          agent={editingAgent ?? undefined}
          availableSkillIds={skills.map((s) => s.id)}
          onSave={() => {
            setEditorMode('hidden')
            setEditingAgent(null)
            void queryClient.invalidateQueries({ queryKey: queryKeys.agents.list() })
          }}
          onCancel={() => {
            setEditorMode('hidden')
            setEditingAgent(null)
          }}
        />
      )}

      {editorMode === 'hidden' && (
        <div className="agents-grid">
          <AgentListSection
            agents={agents}
            selectedId={selectedAgentId}
            onSelect={setSelectedAgentId}
            onEdit={(agent) => {
              setEditingAgent(agent)
              setEditorMode('edit')
            }}
            onDelete={handleDeleteAgent}
          />

          <AgentDetailPanel
            agent={selectedAgent}
            activeExecution={activeExecution}
            isExecuting={executeMutation.isPending}
            isCancelling={cancelMutation.isPending}
            executions={executions}
            onExecute={() => executeMutation.mutate(selectedAgent!.id)}
            onExecuteInteractive={handleExecuteInteractive}
            onCancel={() => cancelMutation.mutate(activeExecutionId!)}
            onViewExecution={handleViewExecution}
          />
        </div>
      )}

      {/* 실행 결과 상세 모달 */}
      {modalExecution && (
        <AgentExecutionModal
          execution={modalExecution}
          onClose={() => setModalExecution(null)}
        />
      )}
    </div>
  )
}
