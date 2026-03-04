import './Sidebar.css'

type Page = 'chat' | 'cbo' | 'settings'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'chat', label: '채팅', icon: '💬' },
  { page: 'cbo', label: 'CBO 분석', icon: '🔍' },
  { page: 'settings', label: '설정', icon: '⚙️' },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">SAP Ops Bot</h1>
        <span className="sidebar-version">v2.1</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ page, label, icon }) => (
          <button
            key={page}
            className={`nav-item ${currentPage === page ? 'active' : ''}`}
            onClick={() => onNavigate(page)}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            <span className="nav-icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
