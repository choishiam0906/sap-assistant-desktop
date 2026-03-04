import { useState, useEffect } from 'react'
import type { ProviderType, AuthStatus, OAuthStartResult } from '../../main/contracts.js'
import './SettingsPage.css'

const api = window.sapOpsDesktop

interface ProviderState {
  status: AuthStatus
  oauthResult: OAuthStartResult | null
  loading: boolean
}

const PROVIDERS: { type: ProviderType; name: string; desc: string }[] = [
  { type: 'codex', name: 'Codex', desc: 'OpenAI Codex API를 통한 LLM 호출' },
  { type: 'copilot', name: 'Copilot', desc: 'GitHub Copilot API를 통한 LLM 호출' },
]

export function SettingsPage() {
  const [states, setStates] = useState<Record<ProviderType, ProviderState>>({
    codex: { status: 'unauthenticated', oauthResult: null, loading: false },
    copilot: { status: 'unauthenticated', oauthResult: null, loading: false },
  })
  const [completionCode, setCompletionCode] = useState('')

  useEffect(() => {
    checkAllStatus()
  }, [])

  async function checkAllStatus() {
    for (const p of PROVIDERS) {
      try {
        const status = await api.getAuthStatus(p.type)
        setStates((prev) => ({
          ...prev,
          [p.type]: { ...prev[p.type], status: status?.status ?? 'unauthenticated' },
        }))
      } catch {
        // 상태 확인 실패 시 unauthenticated 유지
      }
    }
  }

  async function startAuth(provider: ProviderType) {
    setStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], loading: true },
    }))
    try {
      const result = await api.startOAuth(provider)
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], oauthResult: result, status: 'pending', loading: false },
      }))
    } catch {
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], loading: false },
      }))
    }
  }

  async function completeAuth(provider: ProviderType) {
    const oauthResult = states[provider].oauthResult
    if (!oauthResult || !completionCode.trim()) return

    setStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], loading: true },
    }))
    try {
      await api.completeOAuth({
        provider,
        state: oauthResult.state,
        code: completionCode.trim(),
      })
      setStates((prev) => ({
        ...prev,
        [provider]: { status: 'authenticated', oauthResult: null, loading: false },
      }))
      setCompletionCode('')
    } catch {
      setStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], status: 'error', loading: false },
      }))
    }
  }

  async function handleLogout(provider: ProviderType) {
    try {
      await api.logout(provider)
      setStates((prev) => ({
        ...prev,
        [provider]: { status: 'unauthenticated', oauthResult: null, loading: false },
      }))
    } catch {
      // 로그아웃 실패 시 무시
    }
  }

  const statusLabels: Record<AuthStatus, { label: string; className: string }> = {
    unauthenticated: { label: '미인증', className: 'status-none' },
    pending: { label: '인증 대기', className: 'status-pending' },
    authenticated: { label: '인증됨', className: 'status-ok' },
    expired: { label: '만료됨', className: 'status-warn' },
    error: { label: '오류', className: 'status-error' },
  }

  return (
    <div className="settings-page">
      <h2 className="page-title">설정</h2>
      <p className="settings-desc">LLM Provider 인증을 관리해요</p>

      <div className="provider-cards">
        {PROVIDERS.map(({ type, name, desc }) => {
          const state = states[type]
          const sl = statusLabels[state.status]

          return (
            <div key={type} className="provider-card">
              <div className="provider-header">
                <h3>{name}</h3>
                <span className={`status-badge ${sl.className}`}>{sl.label}</span>
              </div>
              <p className="provider-desc">{desc}</p>

              {state.status === 'authenticated' ? (
                <button className="btn-secondary" onClick={() => handleLogout(type)}>
                  로그아웃
                </button>
              ) : state.oauthResult ? (
                <div className="oauth-flow">
                  <div className="oauth-info">
                    <p>아래 URL에 접속하여 코드를 입력하세요</p>
                    <div className="oauth-uri">{state.oauthResult.verificationUri}</div>
                    <div className="oauth-code">{state.oauthResult.userCode}</div>
                  </div>
                  <div className="oauth-complete">
                    <input
                      type="text"
                      value={completionCode}
                      onChange={(e) => setCompletionCode(e.target.value)}
                      placeholder="인증 코드 입력"
                      className="cbo-input"
                    />
                    <button
                      className="btn-primary"
                      onClick={() => completeAuth(type)}
                      disabled={state.loading || !completionCode.trim()}
                    >
                      인증 완료
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => startAuth(type)}
                  disabled={state.loading}
                >
                  {state.loading ? '처리 중...' : '인증하기'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
