import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Link2 } from 'lucide-react'
import { queryKeys } from '../../hooks/queryKeys.js'
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

export function EmailAnalyzedPage() {
  const [selectedEmail, setSelectedEmail] = useState<EmailInbox | null>(null)
  const queryClient = useQueryClient()

  const { data: emails = [], isLoading } = useQuery({
    queryKey: queryKeys.email.inbox({ unprocessedOnly: false }),
    queryFn: () => api.emailListInbox(),
    staleTime: 30_000,
  })

  const analyzed = (emails as EmailInbox[]).filter((e) => e.isProcessed)

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
          <h1 className="page-title">분석 완료</h1>
          <p className="email-inbox-copy">
            AI 분석이 완료되어 업무 Plan이 생성된 메일이에요.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>메일을 불러오는 중...</p>
      ) : analyzed.length === 0 ? (
        <div className="email-inbox-empty">
          <CheckCircle2 size={48} strokeWidth={1} />
          <h3>분석 완료된 메일이 없어요</h3>
          <p>받은편지함에서 메일을 선택하고 AI 분석을 실행해 보세요.</p>
        </div>
      ) : (
        <div className="email-inbox-list">
          {analyzed.map((email) => (
            <article
              key={email.id}
              className="email-inbox-card processed"
              onClick={() => setSelectedEmail(email)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedEmail(email)}
            >
              <div className="email-card-icon">
                <CheckCircle2 size={18} />
              </div>
              <div className="email-card-body">
                <div className="email-card-subject">
                  {email.subject}
                  <Link2 size={12} style={{ marginLeft: 6, opacity: 0.5 }} />
                </div>
                <div className="email-card-meta">
                  <span>{email.fromName ?? email.fromEmail}</span>
                  <span>{formatDate(email.receivedAt)}</span>
                  <span className="email-provider-badge">{email.provider === 'outlook' ? 'Outlook' : 'Gmail'}</span>
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
