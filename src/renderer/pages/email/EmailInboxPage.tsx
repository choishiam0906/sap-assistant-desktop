import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, CheckCircle2 } from 'lucide-react'
import { queryKeys } from '../../hooks/queryKeys.js'
import { Button } from '../../components/ui/Button.js'
import { ManualEmailInput } from '../../components/email/ManualEmailInput.js'
import { EmailDetailModal } from './EmailDetailModal.js'
import './EmailInboxPage.css'

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
  provider: string
  createdAt: string
}

export function EmailInboxPage() {
  const [selectedEmail, setSelectedEmail] = useState<EmailInbox | null>(null)
  const queryClient = useQueryClient()

  const { data: emails = [], isLoading } = useQuery({
    queryKey: queryKeys.email.inbox(),
    queryFn: () => api.emailListInbox(),
    staleTime: 30_000,
  })

  const syncMutation = useMutation({
    mutationFn: (sourceId: string) => api.emailSyncInbox(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.inbox() })
    },
  })

  function handleSync() {
    // 모든 연결된 provider에서 동기화
    syncMutation.mutate(undefined as unknown as string)
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  return (
    <div className="email-inbox-page">
      <div className="email-inbox-hero">
        <div>
          <h1 className="page-title">받은편지함</h1>
          <p className="email-inbox-copy">
            Gmail과 Outlook에서 동기화된 메일을 확인하고, AI로 업무를 자동 생성하세요.
          </p>
        </div>
        <div className="email-inbox-actions">
          <Button
            variant="secondary"
            size="sm"
            loading={syncMutation.isPending}
            onClick={handleSync}
          >
            <RefreshCw size={14} />
            동기화
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>메일을 불러오는 중...</p>
      ) : emails.length === 0 ? (
        <div className="email-inbox-empty">
          <Mail size={48} strokeWidth={1} />
          <h3>메일이 없어요</h3>
          <p>설정에서 Gmail 또는 Outlook을 연결하거나, 아래에서 직접 이메일을 붙여넣으세요.</p>
          <ManualEmailInput />
        </div>
      ) : (
        <div className="email-inbox-list">
          {(emails as EmailInbox[]).map((email) => (
            <article
              key={email.id}
              className={`email-inbox-card ${email.isProcessed ? 'processed' : ''}`}
              onClick={() => setSelectedEmail(email)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedEmail(email)}
            >
              <div className="email-card-icon">
                {email.isProcessed ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Mail size={18} />
                )}
              </div>
              <div className="email-card-body">
                <div className="email-card-subject">{email.subject}</div>
                <div className="email-card-meta">
                  <span>{email.fromName ?? email.fromEmail}</span>
                  <span>{formatDate(email.receivedAt)}</span>
                  <span className="email-provider-badge">{email.provider === 'outlook' ? 'Outlook' : 'Gmail'}</span>
                  {email.isProcessed && <span>✓ 처리됨</span>}
                </div>
                <div className="email-card-excerpt">
                  {email.bodyText.slice(0, 120)}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onPlanCreated={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.email.inbox() })
            setSelectedEmail(null)
          }}
        />
      )}
    </div>
  )
}
