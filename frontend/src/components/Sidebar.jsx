import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const Sidebar = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🪷</span>
        <span className="logo-text">Hindsight</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          Dashboard
        </NavLink>
        
        <NavLink to="/trades" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          Trades
        </NavLink>
        
        <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🤖</span>
          AI Analyst
        </NavLink>

        <NavLink to="/brokers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🔗</span>
          Brokers
        </NavLink>
        
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⚙️</span>
          Settings
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
