import { useQuery } from '@tanstack/react-query'
import { Mail, Cloud, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Button } from '../../components/ui/Button.js'
import './EmailSettingsPage.css'

const api = window.assistantDesktop

export function EmailSettingsPage() {
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['email', 'providers'],
    queryFn: () => api.emailListProviders(),
    staleTime: 10_000,
  })

  async function handleConnectOutlook() {
    try {
      const result = await api.initiateOAuth('microsoft' as Parameters<typeof api.initiateOAuth>[0])
      if (result.authUrl) {
        window.open(result.authUrl, '_blank')
      }
    } catch {
      // OAuth 실패 처리는 상위에서
    }
  }

  return (
    <div className="email-settings-page">
      <div className="email-settings-hero">
        <h1 className="page-title">이메일 설정</h1>
        <p className="email-settings-copy">
          Gmail과 Outlook 계정을 연결하여 메일을 동기화하세요.
        </p>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>연결 상태를 확인하는 중...</p>
      ) : (
        <div className="email-provider-list">
          {/* Gmail Provider */}
          <div className="email-provider-card">
            <div className="email-provider-icon gmail">
              <Mail size={24} />
            </div>
            <div className="email-provider-info">
              <h3>Gmail</h3>
              <p>Gmail MCP 서버를 통해 연결돼요.</p>
            </div>
            <div className="email-provider-status">
              {providers.find((p) => p.type === 'gmail')?.connected ? (
                <span className="status-badge connected">
                  <CheckCircle2 size={14} /> 연결됨
                </span>
              ) : (
                <span className="status-badge disconnected">
                  <XCircle size={14} /> 미연결
                </span>
              )}
            </div>
            <div className="email-provider-action">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => api.mcpListServers()}
                title="MCP 서버 설정에서 Gmail을 연결하세요"
              >
                MCP 설정
                <ExternalLink size={12} />
              </Button>
            </div>
          </div>

          {/* Outlook Provider */}
          <div className="email-provider-card">
            <div className="email-provider-icon outlook">
              <Cloud size={24} />
            </div>
            <div className="email-provider-info">
              <h3>Outlook</h3>
              <p>Microsoft Graph API로 직접 연결돼요.</p>
            </div>
            <div className="email-provider-status">
              {providers.find((p) => p.type === 'outlook')?.connected ? (
                <span className="status-badge connected">
                  <CheckCircle2 size={14} /> 연결됨
                </span>
              ) : (
                <span className="status-badge disconnected">
                  <XCircle size={14} /> 미연결
                </span>
              )}
            </div>
            <div className="email-provider-action">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleConnectOutlook}
              >
                {providers.find((p) => p.type === 'outlook')?.connected
                  ? 'OAuth 재연결'
                  : 'Microsoft 로그인'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
