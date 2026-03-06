import { useState } from 'react'
import { MessageSquare, Search, Settings, PanelLeftClose, PanelLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './Sidebar.css'

type Page = 'chat' | 'cbo' | 'settings'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const NAV_ITEMS: { page: Page; label: string; Icon: LucideIcon }[] = [
  { page: 'chat', label: 'Ask SAP', Icon: MessageSquare },
  { page: 'cbo', label: 'Analyze Source', Icon: Search },
  { page: 'settings', label: 'Settings', Icon: Settings },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <h1 className="sidebar-title">SAP Assistant</h1>
            <span className="sidebar-version">Desktop Platform v2.5</span>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className="sidebar-nav" aria-label="메인 내비게이션">
        {NAV_ITEMS.map(({ page, label, Icon }) => (
          <button
            key={page}
            className={`nav-item ${currentPage === page ? 'active' : ''}`}
            onClick={() => onNavigate(page)}
            aria-current={currentPage === page ? 'page' : undefined}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="nav-icon" aria-hidden="true" />
            {!collapsed && <span className="nav-label">{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}
