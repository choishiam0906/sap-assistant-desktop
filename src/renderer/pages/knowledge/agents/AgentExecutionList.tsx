import { History } from 'lucide-react'
import type { AgentExecutionSummary } from '../../../../main/contracts.js'
import { Badge } from '../../../components/ui/Badge.js'
import { formatTimestamp, executionStatusIcon } from './utils.js'

interface AgentExecutionListProps {
  executions: AgentExecutionSummary[]
  onViewExecution: (execId: string) => void
}

export function AgentExecutionList({ executions, onViewExecution }: AgentExecutionListProps) {
  return (
    <div className="agent-history-section">
      <div className="agent-history-header">
        <h3>
          <History
            size={14}
            style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
            aria-hidden="true"
          />
          실행 이력
        </h3>
        <Badge variant="neutral">{executions.length}건</Badge>
      </div>

      <div className="agent-history-list">
        {executions.length === 0 && (
          <div className="agents-empty">아직 실행 이력이 없습니다.</div>
        )}
        {executions.map((exec) => (
          <div
            key={exec.id}
            className="agent-history-row"
            role="button"
            tabIndex={0}
            onClick={() => onViewExecution(exec.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                void onViewExecution(exec.id)
              }
            }}
          >
            <div className="agent-history-row-info">
              {executionStatusIcon(exec.status)}
              <span>{formatTimestamp(exec.startedAt)}</span>
            </div>
            <div className="agent-history-row-meta">
              <span>
                {exec.completedSteps}/{exec.stepCount} steps
              </span>
              <Badge
                variant={
                  exec.status === 'completed'
                    ? 'success'
                    : exec.status === 'failed'
                      ? 'warning'
                      : exec.status === 'running'
                        ? 'info'
                        : 'neutral'
                }
              >
                {exec.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
