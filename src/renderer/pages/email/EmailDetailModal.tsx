import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Sparkles, ExternalLink } from 'lucide-react'
import { queryKeys } from '../../hooks/queryKeys.js'
import { Button } from '../../components/ui/Button.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import { useSettingsStore } from '../../stores/settingsStore'

const api = window.assistantDesktop

interface EmailInbox {
  id: string
  sourceId: string
  providerMessageId: string
  fromEmail: string
  fromName?: string
  subject: string
  bodyText: string
  receivedAt: string
  labels: string[]
  isProcessed: boolean
  createdAt: string
}

interface EmailDetailModalProps {
  email: EmailInbox
  onClose: () => void
  onPlanCreated: () => void
}

export function EmailDetailModal({ email, onClose, onPlanCreated }: EmailDetailModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(true)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const defaultProvider = useSettingsStore((s) => s.defaultProvider)
  const defaultModel = useSettingsStore((s) => s.defaultModel)

  const { data: linkedPlans = [] } = useQuery({
    queryKey: queryKeys.email.linkedPlans(email.id),
    queryFn: () => api.emailListLinkedPlans(email.id),
    staleTime: 10_000,
  })

  const analyzeMutation = useMutation({
    mutationFn: () =>
      api.emailAnalyzeAndCreatePlan({
        emailId: email.id,
        provider: defaultProvider,
        model: defaultModel,
      }),
    onSuccess: () => {
      setAnalysisError(null)
      onPlanCreated()
    },
    onError: (err: Error) => {
      setAnalysisError(err.message)
    },
  })

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('ko-KR')
    } catch {
      return iso
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="메일 상세">
      <div
        className="modal-content"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, maxHeight: '80vh', overflow: 'auto' }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{email.subject}</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 'var(--spacing-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          <div>발신자: {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}</div>
          <div>수신일: {formatDate(email.receivedAt)}</div>
          {email.labels.length > 0 && <div>라벨: {email.labels.join(', ')}</div>}
        </div>

        <div style={{
          padding: 'var(--spacing-4)',
          background: 'var(--color-surface-raised)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          whiteSpace: 'pre-wrap',
          maxHeight: 300,
          overflow: 'auto',
          marginBottom: 'var(--spacing-4)',
        }}>
          {email.bodyText}
        </div>

        {/* 연결된 Plan 표시 */}
        {linkedPlans.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>
              연결된 Closing Plan
            </h3>
            {(linkedPlans as Array<{ id: string; planId: string; aiSummary?: string }>).map((link) => (
              <div key={link.id} style={{
                padding: 'var(--spacing-2) var(--spacing-3)',
                background: 'var(--color-primary-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
              }}>
                <ExternalLink size={12} />
                <span>Plan: {link.planId}</span>
                {link.aiSummary && <span style={{ color: 'var(--color-text-secondary)' }}>— {link.aiSummary}</span>}
              </div>
            ))}
          </div>
        )}

        {/* AI 분석 + Plan 생성 버튼 */}
        {!email.isProcessed && (
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
            <Button
              variant="primary"
              size="sm"
              loading={analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate()}
            >
              <Sparkles size={14} />
              AI 분석 → Plan 생성
            </Button>
            {analysisError && (
              <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}>
                {analysisError}
              </span>
            )}
          </div>
        )}

        {email.isProcessed && linkedPlans.length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            이 메일은 이미 처리되었어요.
          </p>
        )}
      </div>
    </div>
  )
}
