import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useAuthenticatedProviders } from '../../hooks/useAuthenticatedProviders.js'
import { useAppShellStore } from '../../stores/appShellStore.js'
import './FirstRunBanner.css'

const DISMISS_KEY = 'sap-ops-first-run-dismissed'

export function FirstRunBanner() {
  const { authenticatedTypes, isLoading } = useAuthenticatedProviders()
  const setSection = useAppShellStore((s) => s.setSection)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  if (isLoading || dismissed || authenticatedTypes.length > 0) {
    return null
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  function handleGoToSettings() {
    setSection('settings', 'ai')
  }

  return (
    <div className="first-run-banner" role="alert">
      <div className="first-run-banner-content">
        <Sparkles size={20} className="first-run-banner-icon" aria-hidden="true" />
        <div className="first-run-banner-text">
          <strong>AI 연결을 설정하세요</strong>
          <p>OpenAI, Anthropic, Google 등 AI 프로바이더를 연결하면 모든 기능을 사용할 수 있어요.</p>
        </div>
        <div className="first-run-banner-actions">
          <button className="first-run-banner-btn-primary" onClick={handleGoToSettings}>
            설정하러 가기
          </button>
          <button
            className="first-run-banner-btn-dismiss"
            onClick={handleDismiss}
            aria-label="배너 닫기"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
