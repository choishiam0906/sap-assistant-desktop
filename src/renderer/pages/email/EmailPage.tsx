import { useAppShellStore } from '../../stores/appShellStore'
import type { EmailSubPage } from '../../stores/appShellStore'
import { EmailInboxPage } from './EmailInboxPage.js'
import { EmailAnalyzedPage } from './EmailAnalyzedPage.js'
import { EmailSettingsPage } from './EmailSettingsPage.js'

export function EmailPage() {
  const subPage = useAppShellStore((state) => state.subPage) as EmailSubPage | null
  const activePage = subPage ?? 'inbox'

  return (
    <div className="email-page">
      {activePage === 'inbox' && <EmailInboxPage />}
      {activePage === 'analyzed' && <EmailAnalyzedPage />}
      {activePage === 'settings' && <EmailSettingsPage />}
    </div>
  )
}
