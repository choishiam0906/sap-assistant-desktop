import { useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react'
import './RagStatusBadge.css'

type RagStatus = 'success' | 'partial' | 'failed' | 'skipped'

interface RagMetrics {
  queryTimeMs?: number
  resultCount?: number
  contextTokens?: number
}

interface RagStatusBadgeProps {
  status: RagStatus
  metrics?: RagMetrics
}

const statusConfig: Record<RagStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  success: {
    icon: CheckCircle2,
    label: 'RAG 성공',
    className: 'rag-status-badge--success',
  },
  partial: {
    icon: AlertTriangle,
    label: 'RAG 부분 성공',
    className: 'rag-status-badge--partial',
  },
  failed: {
    icon: XCircle,
    label: 'RAG 실패',
    className: 'rag-status-badge--failed',
  },
  skipped: {
    icon: MinusCircle,
    label: 'RAG 스킵됨',
    className: 'rag-status-badge--skipped',
  },
}

export function RagStatusBadge({ status, metrics }: RagStatusBadgeProps) {
  const [showMetrics, setShowMetrics] = useState(false)
  const config = statusConfig[status]
  const Icon = config.icon

  if (!metrics) {
    return (
      <button
        className={`rag-status-badge ${config.className}`}
        title={config.label}
        aria-label={config.label}
        onClick={() => setShowMetrics(false)}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="rag-status-badge-wrapper">
      <button
        className={`rag-status-badge ${config.className}`}
        title={config.label}
        aria-label={config.label}
        onClick={() => setShowMetrics(!showMetrics)}
      >
        <Icon size={16} aria-hidden="true" />
      </button>

      {showMetrics && (
        <div className="rag-status-popover">
          {metrics.queryTimeMs !== undefined && (
            <div className="rag-metric-row">
              <span className="rag-metric-label">응답 시간</span>
              <span className="rag-metric-value">{metrics.queryTimeMs}ms</span>
            </div>
          )}
          {metrics.resultCount !== undefined && (
            <div className="rag-metric-row">
              <span className="rag-metric-label">결과 건수</span>
              <span className="rag-metric-value">{metrics.resultCount}건</span>
            </div>
          )}
          {metrics.contextTokens !== undefined && (
            <div className="rag-metric-row">
              <span className="rag-metric-label">컨텍스트 토큰</span>
              <span className="rag-metric-value">{metrics.contextTokens}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
