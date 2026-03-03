import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import './Layout.css'

export const Layout: React.FC = () => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <header className="layout-header">
          <h1 className="layout-title">SAP Ops Bot Admin</h1>
        </header>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
