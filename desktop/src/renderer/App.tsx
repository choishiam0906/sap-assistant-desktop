import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { CboPage } from './pages/CboPage'
import { SettingsPage } from './pages/SettingsPage'
import './App.css'

type Page = 'chat' | 'cbo' | 'settings'

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('chat')

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="app-main">
        {currentPage === 'chat' && <ChatPage />}
        {currentPage === 'cbo' && <CboPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
