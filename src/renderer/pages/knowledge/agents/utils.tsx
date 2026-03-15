import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react'
import type { AgentDefinition, AgentExecutionSummary } from '../../../main/contracts.js'

export function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function categoryLabel(category: AgentDefinition['category']): string {
  switch (category) {
    case 'analysis':
      return '분석'
    case 'documentation':
      return '문서화'
    case 'validation':
      return '검증'
    case 'automation':
      return '자동화'
  }
}

export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}초`
  return `${Math.round(seconds / 60)}분`
}

export function executionStatusIcon(status: AgentExecutionSummary['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="agent-status-completed" />
    case 'running':
      return <Loader2 size={14} className="agent-status-running mcp-spinner" />
    case 'failed':
      return <XCircle size={14} className="agent-status-failed" />
    default:
      return <Clock size={14} className="agent-status-cancelled" />
  }
}
