import { useAppShellStore } from '../stores/appShellStore.js'
import type { AssistantSubPage } from '../stores/appShellStore.js'
import { ChatMode } from './assistant/ChatMode.js'
import { CodeLabMode } from './assistant/CodeLabMode.js'
import './assistant/AssistantPage.css'

type Mode = 'chat' | 'code-lab'

function parseSubPage(subPage: string | null): { mode: Mode; chatFilter?: string } {
  const sp = (subPage ?? 'chat') as AssistantSubPage
  if (sp === 'code-lab' || sp.startsWith('code-lab:')) return { mode: 'code-lab' }
  if (sp === 'analysis' || sp === 'archive') return { mode: 'code-lab' }
  if (sp.startsWith('chat:')) return { mode: 'chat', chatFilter: sp.slice(5) }
  return { mode: 'chat' }
}

export function SapAssistantPage() {
  const subPage = useAppShellStore((state) => state.subPage)
  const { mode, chatFilter } = parseSubPage(subPage)

  return (
    <div className="assistant-page">
      <div className="assistant-content">
        {mode === 'chat' && <ChatMode chatFilter={chatFilter} />}
        {mode === 'code-lab' && <CodeLabMode />}
      </div>
    </div>
  )
}
