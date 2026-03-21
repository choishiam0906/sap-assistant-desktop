import { Play, MessageSquare, XCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import type { AgentDefinition, AgentExecution, AgentExecutionSummary } from '../../../main/contracts.js'
import { Button } from '../../../components/ui/Button.js'
import { AgentExecutionList } from './AgentExecutionList.js'

interface AgentDetailPanelProps {
  agent: AgentDefinition | null
  activeExecution: AgentExecution | undefined
  isExecuting: boolean
  isCancelling: boolean
  executions: AgentExecutionSummary[]
  onExecute: () => void
  onExecuteInteractive?: () => void
  onCancel: () => void
  onViewExecution: (execId: string) => void
}

export function AgentDetailPanel({
  agent,
  activeExecution,
  isExecuting,
  isCancelling,
  executions,
  onExecute,
  onExecuteInteractive,
  onCancel,
  onViewExecution,
}: AgentDetailPanelProps) {
  if (!agent) {
    return (
      <section>
        <div className="agent-detail-panel">
          <div className="agents-detail-empty">
            왼쪽에서 에이전트를 선택하면 상세 정보를 확인할 수 있어요.
          </div>
        </div>
      </section>
    )
  }

  const isRunning = activeExecution?.status === 'running'

  return (
    <section>
      <div className="agent-detail-panel">
        <div className="agent-detail-header">
          <div>
            <h2>{agent.title}</h2>
            <p>{agent.description}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isRunning ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onCancel}
                loading={isCancelling}
              >
                <XCircle size={14} aria-hidden="true" />
                취소
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onExecute}
                  loading={isExecuting}
                >
                  <Play size={14} aria-hidden="true" />
                  실행
                </Button>
                {onExecuteInteractive && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onExecuteInteractive}
                  >
                    <MessageSquare size={14} aria-hidden="true" />
                    대화형 실행
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 파이프라인 스텝 시각화 */}
        <div className="agent-pipeline">
          {agent.steps
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((step, index) => {
              const runningResult = activeExecution?.stepResults.find(
                (r) => r.stepId === step.id
              )
              const stepStatus = runningResult?.status ?? 'pending'

              return (
                <div key={step.id} className="agent-step">
                  <div className={`agent-step-icon ${stepStatus}`}>
                    {stepStatus === 'completed' ? (
                      <CheckCircle2 size={14} />
                    ) : stepStatus === 'running' ? (
                      <Loader2 size={14} className="mcp-spinner" />
                    ) : stepStatus === 'failed' ? (
                      <XCircle size={14} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="agent-step-content">
                    <div className="agent-step-label">
                      {step.label}
                      {step.dependsOn && step.dependsOn.length > 0 && (
                        <span
                          style={{
                            marginLeft: 8,
                            color: 'var(--color-text-muted)',
                            fontSize: 'var(--font-size-xs)',
                          }}
                        >
                          <ArrowRight size={10} style={{ verticalAlign: 'middle' }} /> {step.dependsOn.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="agent-step-skill">{step.skillId}</div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* 실행 히스토리 */}
        <AgentExecutionList executions={executions} onViewExecution={onViewExecution} />
      </div>
    </section>
  )
}
