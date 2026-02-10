import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import './BrokerIcons.css'

const BROKERS = [
  { id: 'dhan', name: 'Dhan', icon: '⚡', statusEndpoint: '/broker/dhan/status' },
  { id: 'angelone', name: 'Angel One', icon: '😇', statusEndpoint: '/broker/angelone/status' }
]

const BrokerIcons = () => {
  const navigate = useNavigate()
  const [brokerStatus, setBrokerStatus] = useState({})
  const [hoveredBroker, setHoveredBroker] = useState(null)

  useEffect(() => {
    fetchBrokerStatuses()
  }, [])

  const fetchBrokerStatuses = async () => {
    const statuses = {}
    for (const broker of BROKERS) {
      try {
        const res = await api.get(broker.statusEndpoint)
        statuses[broker.id] = {
          connected: res.data.connected,
          expiresAt: res.data.expiresAt,
          lastUsedAt: res.data.lastUsedAt
        }
      } catch (error) {
        statuses[broker.id] = { connected: false }
      }
    }
    setBrokerStatus(statuses)
  }

  const handleBrokerClick = (broker) => {
    const status = brokerStatus[broker.id]
    if (status?.connected) {
      // Show modal with status (for now, navigate to connect page)
      navigate(`/broker/${broker.id}/connect`)
    } else {
      // Navigate to connect page
      navigate(`/broker/${broker.id}/connect`)
    }
  }

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt) - new Date()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m`
  }

  return (
    <div className="broker-icons">
      <span className="broker-label">Brokers:</span>
      <div className="broker-list">
        {BROKERS.map((broker) => {
          const status = brokerStatus[broker.id]
          const isConnected = status?.connected
          const timeRemaining = getTimeRemaining(status?.expiresAt)
          
          return (
            <motion.div
              key={broker.id}
              className={`broker-icon ${isConnected ? 'connected' : 'disconnected'}`}
              onClick={() => handleBrokerClick(broker)}
              onMouseEnter={() => setHoveredBroker(broker.id)}
              onMouseLeave={() => setHoveredBroker(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="broker-emoji">{broker.icon}</span>
              <span className={`status-dot ${isConnected ? 'active' : 'inactive'}`} />
              
              {hoveredBroker === broker.id && (
                <motion.div 
                  className="broker-tooltip"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <strong>{broker.name}</strong>
                  <span>{isConnected ? `Connected • ${timeRemaining}` : 'Not connected'}</span>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default BrokerIcons
