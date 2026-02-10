import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '../components/MainLayout'
import api from '../services/api'
import './Brokers.css'

const BROKER_INFO = {
  DHAN: {
    name: 'Dhan',
    logo: '📊',
    color: '#00C853',
    description: 'Connect your Dhan account to auto-sync trades.',
    instructions: [
      'Go to Dhan Developer Console (dhanhq.co/app-dashboard)',
      'Create a new app (Type: SELF)',
      'Copy your Access Token',
      'Copy your Client ID (shown on dashboard)',
      'Paste both below and click Save'
    ],
    tokenType: 'manual',
    fields: ['accessToken', 'clientId']
  },
  ANGELONE: {
    name: 'Angel One',
    logo: '👼',
    color: '#FF6B00',
    description: 'Connect Angel One SmartAPI for trade sync.',
    instructions: [
      'Go to SmartAPI Portal (smartapi.angelone.in)',
      'Create an app to get API Key',
      'Note your Client ID (Angel One user ID)',
      'Enter your Trading PIN',
      'Generate TOTP from Google Authenticator',
      '(Optional) Add TOTP Secret for auto-refresh'
    ],
    tokenType: 'totp',
    fields: ['apiKey', 'clientId', 'pin', 'totp', 'totpSecret']
  }
}

const Brokers = () => {
  const [brokerStatus, setBrokerStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState(null)
  const [detailsModal, setDetailsModal] = useState(null)
  const [formData, setFormData] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [syncStats, setSyncStats] = useState({})
  const [syncing, setSyncing] = useState(null) // broker currently syncing
  const [autoSyncing, setAutoSyncing] = useState(false) // auto-sync in progress

  useEffect(() => {
    fetchBrokerStatus()
  }, [])

  // Auto-sync connected brokers on page load
  useEffect(() => {
    const autoSync = async () => {
      const connectedBrokers = Object.entries(brokerStatus)
        .filter(([_, status]) => status.connected)
        .map(([brokerId]) => brokerId)

      if (connectedBrokers.length > 0 && !autoSyncing) {
        setAutoSyncing(true)
        console.log('Auto-syncing connected brokers:', connectedBrokers)
        
        for (const broker of connectedBrokers) {
          try {
            const res = await api.post('/broker/sync', { broker })
            console.log(`Auto-sync ${broker}:`, res.data.summary)
            setSyncStats(prev => ({ ...prev, [broker]: res.data.summary }))
          } catch (err) {
            console.log(`Auto-sync ${broker} failed:`, err.message)
          }
        }
        setAutoSyncing(false)
      }
    }

    if (!loading && Object.keys(brokerStatus).length > 0) {
      autoSync()
    }
  }, [loading, brokerStatus])

  const fetchBrokerStatus = async () => {
    setLoading(true)
    try {
      const [dhanRes, angelRes] = await Promise.all([
        api.get('/broker/dhan/status').catch(() => ({ data: { connected: false } })),
        api.get('/broker/angelone/status').catch(() => ({ data: { connected: false } }))
      ])
      
      setBrokerStatus({
        DHAN: dhanRes.data,
        ANGELONE: angelRes.data
      })
    } catch (err) {
      console.error('Failed to fetch broker status:', err)
    }
    setLoading(false)
  }

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry - now
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const handleConnect = (brokerId) => {
    setFormData({})
    setError(null)
    setActiveModal(brokerId)
  }

  const handleDisconnect = async (brokerId) => {
    try {
      if (brokerId === 'DHAN') {
        await api.post('/broker/dhan/disconnect')
      } else {
        await api.delete('/broker/angelone/disconnect')
      }
      fetchBrokerStatus()
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    
    try {
      if (activeModal === 'DHAN') {
        // Backend will validate token and set 1-day expiry
        await api.post('/broker/dhan/token', {
          accessToken: formData.accessToken,
          clientId: formData.clientId
        })
      } else if (activeModal === 'ANGELONE') {
        await api.post('/broker/angelone/login', formData)
      }
      
      setActiveModal(null)
      fetchBrokerStatus()
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    }
    setSubmitting(false)
  }

  const handleSync = async (brokerId) => {
    setError(null)
    setSyncing(brokerId)
    try {
      const res = await api.post('/broker/sync', { broker: brokerId })
      setSyncStats(prev => ({
        ...prev,
        [brokerId]: res.data.summary
      }))
      setDetailsModal(brokerId)
    } catch (err) {
      const status = err.response?.status
      const data = err.response?.data
      
      if (status === 401) {
        setError(`⚠️ ${BROKER_INFO[brokerId].name} token expired. Please reconnect.`)
        fetchBrokerStatus()
      } else {
        setError(data?.message || data?.hint || err.message || 'Sync failed')
      }
    } finally {
      setSyncing(null)
    }
  }

  const handleShowDetails = (brokerId) => {
    setDetailsModal(brokerId)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="brokers-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading broker status...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="brokers-page">
      <div className="brokers-header">
        <h1>🔗 Broker Connections</h1>
        <p>Connect your trading accounts to auto-sync trades</p>
      </div>

      {error && (
        <div className="broker-error-toast">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="brokers-grid">
        {Object.entries(BROKER_INFO).map(([brokerId, info]) => {
          const status = brokerStatus[brokerId] || {}
          const isConnected = status.connected
          
          return (
            <motion.div
              key={brokerId}
              className={`broker-card ${isConnected ? 'connected' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
            >
              <div className="broker-header">
                <div className="broker-logo" style={{ background: `${info.color}20` }}>
                  <span>{info.logo}</span>
                </div>
                <div className="broker-info">
                  <h3>{info.name}</h3>
                  <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? '🟢 Connected' : '🔴 Not Connected'}
                  </span>
                </div>
              </div>

              {isConnected && (
                <div className="broker-details">
                  <div className="detail-row">
                    <span className="detail-label">Token Expires</span>
                    <span className="detail-value expiry">
                      ⏱️ {getTimeRemaining(status.expiresAt)}
                    </span>
                  </div>
                  {status.lastUsedAt && (
                    <div className="detail-row">
                      <span className="detail-label">Last Sync</span>
                      <span className="detail-value">
                        {new Date(status.lastUsedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p className="broker-description">{info.description}</p>

              <div className="broker-actions">
                {isConnected ? (
                  <>
                    <button 
                      className={`btn-sync ${syncing === brokerId ? 'syncing' : ''}`}
                      onClick={() => handleSync(brokerId)}
                      disabled={syncing === brokerId}
                    >
                      {syncing === brokerId ? '⏳ Syncing...' : '🔄 Sync Now'}
                    </button>
                    <button 
                      className="btn-details"
                      onClick={() => handleShowDetails(brokerId)}
                    >
                      📊 Details
                    </button>
                    <button 
                      className="btn-disconnect"
                      onClick={() => handleDisconnect(brokerId)}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn-connect"
                    onClick={() => handleConnect(brokerId)}
                  >
                    Connect {info.name}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Connect Modal */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Connect {BROKER_INFO[activeModal].name}</h2>
                <button className="close-btn" onClick={() => setActiveModal(null)}>×</button>
              </div>

              <div className="instructions-section">
                <h4>📋 Instructions</h4>
                <ol>
                  {BROKER_INFO[activeModal].instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {activeModal === 'DHAN' && (
                  <>
                    <div className="form-group">
                      <label>Access Token</label>
                      <input
                        type="text"
                        placeholder="Paste your Dhan access token"
                        value={formData.accessToken || ''}
                        onChange={(e) => setFormData({...formData, accessToken: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Client ID</label>
                      <input
                        type="text"
                        placeholder="Your Dhan Client ID"
                        value={formData.clientId || ''}
                        onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                        required
                      />
                    </div>
                  </>
                )}

                {activeModal === 'ANGELONE' && (
                  <>
                    <div className="form-group">
                      <label>API Key</label>
                      <input
                        type="text"
                        placeholder="SmartAPI Key"
                        value={formData.apiKey || ''}
                        onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Client ID</label>
                      <input
                        type="text"
                        placeholder="Angel One User ID"
                        value={formData.clientId || ''}
                        onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>PIN</label>
                      <input
                        type="password"
                        placeholder="Trading PIN"
                        value={formData.pin || ''}
                        onChange={(e) => setFormData({...formData, pin: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>TOTP</label>
                      <input
                        type="text"
                        placeholder="6-digit code from authenticator"
                        value={formData.totp || ''}
                        onChange={(e) => setFormData({...formData, totp: e.target.value})}
                        required
                        maxLength={6}
                      />
                    </div>
                    <div className="form-group optional-field">
                      <label>TOTP Secret <span className="optional-tag">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="Secret key for auto-refresh (from QR setup)"
                        value={formData.totpSecret || ''}
                        onChange={(e) => setFormData({...formData, totpSecret: e.target.value})}
                      />
                      <small className="field-hint">
                        💡 Add this to enable automatic token refresh when it expires
                      </small>
                    </div>
                  </>
                )}

                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Connecting...' : 'Connect'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {detailsModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetailsModal(null)}
          >
            <motion.div
              className="modal-content details-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{BROKER_INFO[detailsModal].logo} {BROKER_INFO[detailsModal].name} Details</h2>
                <button className="close-btn" onClick={() => setDetailsModal(null)}>×</button>
              </div>

              <div className="details-content">
                <div className="details-section">
                  <h4>Connection Status</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="label">Status</span>
                      <span className={`value ${brokerStatus[detailsModal]?.connected ? 'success' : 'error'}`}>
                        {brokerStatus[detailsModal]?.connected ? '🟢 Active' : '🔴 Disconnected'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Token Expires</span>
                      <span className="value">
                        {getTimeRemaining(brokerStatus[detailsModal]?.expiresAt) || 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Last Used</span>
                      <span className="value">
                        {brokerStatus[detailsModal]?.lastUsedAt 
                          ? new Date(brokerStatus[detailsModal].lastUsedAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>

                {syncStats[detailsModal] && (
                  <div className="details-section">
                    <h4>Last Sync Results</h4>
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="label">Fetched</span>
                        <span className="value">{syncStats[detailsModal].fetched || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Synced</span>
                        <span className="value success">{syncStats[detailsModal].synced || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Skipped</span>
                        <span className="value">{syncStats[detailsModal].skipped || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">P&L Calculated</span>
                        <span className="value">{syncStats[detailsModal].pnlCalculated || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </MainLayout>
  )
}

export default Brokers
