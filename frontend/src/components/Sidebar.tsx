import { NavLink } from 'react-router-dom'
import './Sidebar.css'

export const Sidebar: React.FC = () => {
  const isActive = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-link active' : 'nav-link'

  return (
    <aside className="sidebar">
      <nav className="nav">
        <NavLink to="/" className={isActive}>
          <span className="nav-icon">📊</span>
          <span className="nav-text">대시보드</span>
        </NavLink>
        <NavLink to="/knowledge" className={isActive}>
          <span className="nav-icon">📚</span>
          <span className="nav-text">지식 관리</span>
        </NavLink>
        <NavLink to="/history" className={isActive}>
          <span className="nav-icon">💬</span>
          <span className="nav-text">대화 이력</span>
        </NavLink>
      </nav>
    </aside>
  )
}
