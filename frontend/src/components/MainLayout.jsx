import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './MainLayout.css'

/**
 * MainLayout - Wrapper component that provides consistent layout
 * with TOP header navigation across all authenticated pages
 */
const MainLayout = ({ children }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="main-layout">
      {/* Top Header Navbar */}
      <header className="top-header">
        <div className="logo-section">
          <img src="/hindsight-logo.svg" alt="Hindsight" className="logo-icon" />
          <span className="logo-text">Hindsight</span>
        </div>
        <nav className="nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/trades" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Trades
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            AI Analyst
          </NavLink>
          <NavLink to="/brokers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Brokers
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Settings
          </NavLink>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>
      
      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default MainLayout
