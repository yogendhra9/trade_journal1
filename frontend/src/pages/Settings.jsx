import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import MainLayout from '../components/MainLayout'
import api from '../services/api'
import './Settings.css'

const Settings = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // CSV Import state
  const [importBroker, setImportBroker] = useState('DHAN')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me')
      setProfile({ name: res.data.name || '', email: res.data.email || '' })
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/users/me', profile)
      showMessage('Profile updated successfully!')
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to update profile', 'error')
    }
    setLoading(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('Passwords do not match', 'error')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      showMessage('Password must be at least 6 characters', 'error')
      return
    }
    setLoading(true)
    try {
      await api.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      showMessage('Password changed successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to change password', 'error')
    }
    setLoading(false)
  }

  const handleExportData = async (format) => {
    setLoading(true)
    try {
      const res = await api.get('/trades', { params: { limit: 1000 } })
      const trades = res.data.trades || []
      
      if (format === 'csv') {
        const headers = ['Date', 'Symbol', 'Type', 'Quantity', 'Entry', 'Exit', 'P&L', 'Pattern']
        const rows = trades.map(t => [
          new Date(t.entryTime).toLocaleDateString(),
          t.symbol, t.tradeType, t.quantity, t.entryPrice,
          t.exitPrice || '', t.pnl || '', t.patternId || ''
        ])
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        downloadFile(csv, 'trades.csv', 'text/csv')
      } else {
        downloadFile(JSON.stringify(trades, null, 2), 'trades.json', 'application/json')
      }
      showMessage(`Exported ${trades.length} trades as ${format.toUpperCase()}`)
    } catch (err) {
      showMessage('Failed to export data', 'error')
    }
    setLoading(false)
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    setImportResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('broker', importBroker)
      
      const res = await api.post('/trades/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setImportResult(res.data.results)
      showMessage(`Imported ${res.data.results.synced} new trades`)
    } catch (err) {
      showMessage(err.response?.data?.message || 'Import failed', 'error')
    }
    
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return
    if (!window.confirm('This will permanently delete all your data. Continue?')) return
    try {
      await api.delete('/users/me')
      logout()
    } catch (err) {
      showMessage('Failed to delete account', 'error')
    }
  }

  const tabs = [
    { id: 'profile', label: '👤 Profile' },
    { id: 'appearance', label: '🎨 Appearance' },
    { id: 'security', label: '🔐 Security' },
    { id: 'data', label: '📊 Data' },
    { id: 'import', label: '📥 Import' }
  ]

  return (
    <MainLayout>
      <div className="settings-page">
        <div className="settings-header">
          <h1>⚙️ Settings</h1>
          <p>Manage your account and preferences</p>
        </div>

        {message && (
          <motion.div 
            className={`message-toast ${message.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </motion.div>
        )}

        <div className="settings-layout">
          <nav className="settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {activeTab === 'profile' && (
              <motion.div className="settings-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2>Profile Information</h2>
                <form onSubmit={handleSaveProfile}>
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      placeholder="your@email.com"
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div className="settings-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2>Appearance</h2>
                <div className="theme-selector">
                  <p>Choose your preferred theme</p>
                  <div className="theme-options">
                    <button 
                      className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      <span className="theme-icon">🌙</span>
                      <span>Dark Mode</span>
                    </button>
                    <button 
                      className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      <span className="theme-icon">☀️</span>
                      <span>Light Mode</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div className="settings-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2>Change Password</h2>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'data' && (
              <motion.div className="settings-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2>Export Data</h2>
                <p className="section-description">Download all your trade data</p>
                <div className="export-buttons">
                  <button className="btn-export" onClick={() => handleExportData('csv')} disabled={loading}>
                    📥 Export as CSV
                  </button>
                  <button className="btn-export" onClick={() => handleExportData('json')} disabled={loading}>
                    📥 Export as JSON
                  </button>
                </div>

                <div className="danger-zone">
                  <h3>⚠️ Danger Zone</h3>
                  <p>Permanently delete your account and all data</p>
                  <button className="btn-danger" onClick={handleDeleteAccount}>
                    Delete Account
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'import' && (
              <motion.div className="settings-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2>📥 Import Trades</h2>
                <p className="section-description">
                  Import historical trades from broker contract notes or trade history exports
                </p>
                
                <div className="import-section">
                  <div className="form-group">
                    <label>Select Broker</label>
                    <div className="broker-selector">
                      <button 
                        className={`broker-btn ${importBroker === 'DHAN' ? 'active' : ''}`}
                        onClick={() => setImportBroker('DHAN')}
                      >
                        Dhan
                      </button>
                      <button 
                        className={`broker-btn ${importBroker === 'ANGELONE' ? 'active' : ''}`}
                        onClick={() => setImportBroker('ANGELONE')}
                      >
                        Angel One
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Upload CSV File</label>
                    <div className="file-upload-area">
                      <input 
                        type="file" 
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                        disabled={importing}
                      />
                      <div className="upload-placeholder">
                        {importing ? (
                          <span>⏳ Importing...</span>
                        ) : (
                          <>
                            <span className="upload-icon">📄</span>
                            <span>Click to select CSV file or drag & drop</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {importResult && (
                    <div className="import-results">
                      <h4>Import Results</h4>
                      <div className="result-stats">
                        <div className="stat">
                          <span className="stat-value">{importResult.total}</span>
                          <span className="stat-label">Total Rows</span>
                        </div>
                        <div className="stat success">
                          <span className="stat-value">{importResult.synced}</span>
                          <span className="stat-label">Imported</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{importResult.skipped}</span>
                          <span className="stat-label">Duplicates</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="import-tips">
                    <h4>💡 Tips</h4>
                    <ul>
                      <li>Download trade history CSV from your broker's website</li>
                      <li>Duplicate trades are automatically ignored</li>
                      <li>CSV should contain: Date, Symbol, Buy/Sell, Quantity, Price</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default Settings
