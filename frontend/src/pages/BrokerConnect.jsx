import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import './BrokerConnect.css'

const BROKER_INFO = {
  dhan: {
    name: 'Dhan',
    icon: '⚡',
    steps: [
      'Login to your Dhan account at dhan.co',
      'Go to Developer Console',
      'Copy your Access Token',
      'Paste it below'
    ]
  },
  angelone: {
    name: 'Angel One',
    icon: '😇',
    steps: [
      'Login to Angel One SmartAPI portal',
      'Get your API Key and Client ID',
      'Generate TOTP from your authenticator app',
      'Enter all credentials below'
    ]
  }
}

const BrokerConnect = () => {
  const { brokerId } = useParams()
  const navigate = useNavigate()
  const broker = BROKER_INFO[brokerId]

  if (!broker) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <main className="dashboard-main">
          <h1>Broker not found</h1>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="broker-connect-page"
        >
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>

          <div className="broker-header">
            <span className="broker-icon-large">{broker.icon}</span>
            <h1>Connect {broker.name}</h1>
          </div>

          <div className="setup-guide glass-card">
            <h3>Setup Guide</h3>
            <ol className="steps-list">
              {broker.steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="connect-form glass-card">
            <h3>Enter Credentials</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Form coming soon...
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default BrokerConnect
