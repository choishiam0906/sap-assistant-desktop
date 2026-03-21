import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { AgentExecutionState } from '../../stores/chatStore.js'
import './AgentProgressBar.css'

interface AgentProgressBarProps {
  execution: AgentExecutionState
  onDismiss?: () => void
}

export function AgentProgressBar({ execution, onDismiss }: AgentProgressBarProps) {
  const { agentTitle, currentStepIndex, totalSteps, currentStepLabel, status, errorMessage } = execution
  const progressPercent = totalSteps > 0
    ? Math.round(((status === 'completed' ? totalSteps : currentStepIndex) / totalSteps) * 100)
    : 0

  return (
    <div className={`agent-progress-bar agent-progress-bar--${status}`} role="status">
      <div className="agent-progress-bar__header">
        <div className="agent-progress-bar__title">
          {status === 'running' && <Loader2 size={14} className="agent-progress-bar__spinner" />}
          {status === 'completed' && <CheckCircle2 size={14} />}
          {status === 'failed' && <XCircle size={14} />}
          <span>{agentTitle}</span>
        </div>
        <div className="agent-progress-bar__meta">
          <span className="agent-progress-bar__step-count">
            {status === 'completed' ? totalSteps : currentStepIndex + 1} / {totalSteps}
          </span>
          {(status === 'completed' || status === 'failed') && onDismiss && (
            <button
              type="button"
              className="agent-progress-bar__dismiss"
              onClick={onDismiss}
              aria-label="닫기"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div className="agent-progress-bar__track">
        <div
          className="agent-progress-bar__fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="agent-progress-bar__label">
        {status === 'running' && currentStepLabel}
        {status === 'completed' && '에이전트 실행이 완료되었어요'}
        {status === 'failed' && (errorMessage ?? '에이전트 실행 중 오류가 발생했어요')}
      </div>
    </div>
  )
}
