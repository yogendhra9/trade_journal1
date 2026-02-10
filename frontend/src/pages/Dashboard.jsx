import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import api from '../services/api'
import TradeCalendar from '../components/TradeCalendar'
import MainLayout from '../components/MainLayout'
import './Dashboard.css'

// Pattern ID to Short Name mapping
const PATTERN_NAMES = {
  'P1': 'Range-Bound',
  'P2': 'Vol Expansion',
  'P3': 'Trending ↑',
  'P4': 'Trending ↓',
  'P5': 'Whipsaw',
  'P6': 'Compression',
  'P7': 'Blow-Off',
  'P8': 'Mean Revert',
  'P9': 'Illiquid'
}

// Only actual brokers we support
const BROKERS = [
  { id: 'dhan', name: 'Dhan', color: '#4fd1c5', statusEndpoint: '/broker/dhan/status' },
  { id: 'angelone', name: 'Angel One', color: '#4caf50', statusEndpoint: '/broker/angelone/status' }
]

// Available chart types
const CHART_OPTIONS = [
  { id: 'pnl', name: 'P&L Trend' },
  { id: 'broker', name: 'Broker Split' }
]

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    totalPnl: 0
  })
  const [pnlData, setPnlData] = useState([])
  const [brokerSplit, setBrokerSplit] = useState([])
  const [symbolData, setSymbolData] = useState([])
  const [recentTrades, setRecentTrades] = useState([])
  const [allTrades, setAllTrades] = useState([])
  const [brokerStatus, setBrokerStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChart, setSelectedChart] = useState('pnl')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Track mouse position for glow effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    fetchDashboardData()
    fetchBrokerStatus()
  }, [])

  const fetchBrokerStatus = async () => {
    const statuses = {}
    for (const broker of BROKERS) {
      try {
        const res = await api.get(broker.statusEndpoint)
        statuses[broker.id] = res.data.connected
      } catch (e) {
        statuses[broker.id] = false
      }
    }
    setBrokerStatus(statuses)
  }

  const fetchDashboardData = async () => {
    try {
      const tradesRes = await api.get('/trades')
      const trades = tradesRes.data.trades || []
      setAllTrades(trades)
      
      const closedTrades = trades.filter(t => t.pnl !== null)
      const winningTrades = closedTrades.filter(t => t.pnl > 0).length
      const losingTrades = closedTrades.filter(t => t.pnl < 0).length
      const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0)
      
      setStats({
        totalTrades: trades.length,
        winRate: closedTrades.length > 0 ? Math.round((winningTrades / closedTrades.length) * 100) : 0,
        wins: winningTrades,
        losses: losingTrades,
        totalPnl: totalPnl.toFixed(2)
      })

      // P&L trend data
      let cumulative = 0
      const pnlTrend = trades
        .filter(t => t.pnl !== null)
        .sort((a, b) => new Date(a.entryTime || a.exitTime) - new Date(b.entryTime || b.exitTime))
        .map(t => {
          cumulative += t.pnl
          return {
            date: new Date(t.entryTime || t.exitTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            pnl: cumulative
          }
        })
      setPnlData(pnlTrend)

      // Broker split data
      const brokerCounts = trades.reduce((acc, t) => {
        const broker = t.broker || 'Unknown'
        acc[broker] = (acc[broker] || 0) + 1
        return acc
      }, {})
      setBrokerSplit(Object.entries(brokerCounts).map(([name, value]) => ({ name, value })))

      // Symbol treemap data (with P&L for color)
      const symbolStats = trades.reduce((acc, t) => {
        if (!acc[t.symbol]) {
          acc[t.symbol] = { count: 0, pnl: 0 }
        }
        acc[t.symbol].count += 1
        acc[t.symbol].pnl += t.pnl || 0
        return acc
      }, {})
      setSymbolData(
        Object.entries(symbolStats)
          .map(([name, data]) => ({ 
            name, 
            size: data.count, 
            pnl: data.pnl,
            pnlPercent: data.pnl !== 0 ? ((data.pnl / Math.abs(data.pnl)) * Math.min(Math.abs(data.pnl), 100)).toFixed(1) : 0
          }))
          .sort((a, b) => b.size - a.size)
          .slice(0, 12)
      )

      // Get 5 most recent trades sorted by date
      const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(a.exitTime || a.entryTime)
        const dateB = new Date(b.exitTime || b.entryTime)
        return dateB - dateA
      })
      setRecentTrades(sortedTrades.slice(0, 5))
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }

  const COLORS = ['#4fd1c5', '#9f7aea', '#4299e1', '#48bb78', '#f6ad55']

  const renderChart = () => {
    // Determine if overall P&L is negative for color
    const lastPnl = pnlData.length > 0 ? pnlData[pnlData.length - 1].pnl : 0
    const chartColor = lastPnl >= 0 ? '#4fd1c5' : '#ef4444'
    
    switch (selectedChart) {
      case 'pnl':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={pnlData}>
              <defs>
                <linearGradient id="pnlGradientPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4fd1c5" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#4fd1c5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="pnlGradientNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
              <Tooltip 
                contentStyle={{ background: 'rgba(18, 24, 41, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                formatter={(value) => [`₹${value.toFixed(2)}`, 'P&L']}
              />
              <Area 
                type="monotone" 
                dataKey="pnl" 
                stroke={chartColor} 
                strokeWidth={2} 
                fill={lastPnl >= 0 ? 'url(#pnlGradientPositive)' : 'url(#pnlGradientNegative)'} 
              />
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'broker':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={brokerSplit}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {brokerSplit.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="dashboard-container">
          <div className="loading-screen">
            <span className="loading-icon">👁</span>
            <span>Loading...</span>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="dashboard-container" ref={containerRef}>
        {/* Cursor Glow Effect */}
        <div 
          className="cursor-glow" 
          style={{ 
            left: mousePosition.x - 200, 
            top: mousePosition.y - 200 
          }} 
        />

        {/* Main Content */}
      <main className="dashboard-main">
        <h2 className="section-title">Trading Journal & Analytics</h2>

        {/* Top Row - Brokers + Stats */}
        <div className="top-row">
          {/* Connected Brokers - Only Dhan & Angel One */}
          <motion.div 
            className="brokers-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3>CONNECTED<br/>BROKERS</h3>
            <div className="broker-list">
              {BROKERS.map(broker => (
                <div key={broker.id} className="broker-item">
                  <span className="broker-logo" style={{ background: broker.color }}>
                    {broker.id === 'dhan' ? 'D' : 'A'}
                  </span>
                  <span className="broker-name">{broker.name}</span>
                  <span className={`status-dot ${brokerStatus[broker.id] ? 'active' : ''}`} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <span className="stat-label">TOTAL TRADES</span>
            <span className="stat-value">{stats.totalTrades}</span>
            <span className="stat-subtitle">Last 30 Days</span>
          </motion.div>

          <motion.div className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <span className="stat-label">WIN RATE</span>
            <span className="stat-value">{stats.winRate}%</span>
            <span className="stat-subtitle">{stats.wins} Wins / {stats.losses} Losses</span>
          </motion.div>

          <motion.div className="stat-card pnl-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <span className="stat-label">TOTAL P&L</span>
            <span className={`stat-value ${parseFloat(stats.totalPnl) >= 0 ? 'positive' : 'negative'}`}>
              {parseFloat(stats.totalPnl) >= 0 ? '+' : ''}₹{stats.totalPnl}
            </span>
            <span className="stat-subtitle">Net Profit</span>
          </motion.div>
        </div>

        {/* Bottom Row - Chart + Trades */}
        <div className="bottom-row">
          {/* Chart with Selector */}
          <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="chart-header">
              <h3>{CHART_OPTIONS.find(c => c.id === selectedChart)?.name}</h3>
              <div className="custom-select chart-selector-wrapper">
                <select 
                  className="chart-selector"
                  value={selectedChart}
                  onChange={(e) => setSelectedChart(e.target.value)}
                >
                  {CHART_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>
            <div className="chart-container">
              {renderChart()}
            </div>
          </motion.div>

          {/* Recent Trades - Show actual patternId */}
          <motion.div className="trades-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <div className="trades-header">
              <h3>Recent Trades</h3>
              <div className="search-input compact">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="trades-list">
              {recentTrades
                .filter(t => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((trade, index) => (
                <motion.div 
                  key={trade._id}
                  className="trade-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <span className="trade-symbol">{trade.symbol}</span>
                  <span className={`trade-type ${trade.tradeType.toLowerCase()}`}>
                    {trade.tradeType}
                  </span>
                  <span className="trade-price">₹{(trade.entryPrice || trade.exitPrice)?.toLocaleString()}</span>
                  <span className="trade-date">
                    {new Date(trade.entryTime || trade.exitTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  {trade.patternId && (
                    <span className="trade-pattern">{PATTERN_NAMES[trade.patternId] || trade.patternId}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Calendar + Summary Row */}
        <div className="calendar-section">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <TradeCalendar trades={allTrades} compact={true} />
          </motion.div>

          {/* Symbol Heatmap */}
          <motion.div 
            className="symbol-heatmap-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h3>Symbol Performance</h3>
            <div className="treemap-grid">
              {symbolData.map((item, idx) => {
                const maxCount = symbolData[0]?.size || 1
                const totalTrades = symbolData.reduce((sum, s) => sum + s.size, 0)
                const sizeRatio = item.size / maxCount
                const percentage = ((item.size / totalTrades) * 100).toFixed(1)
                const isProfit = item.pnl >= 0
                const intensity = Math.min(Math.abs(item.pnl) / 100, 1) * 0.5 + 0.2
                
                return (
                  <div 
                    key={item.name}
                    className={`treemap-tile ${isProfit ? 'profit' : 'loss'}`}
                    style={{
                      flex: `${sizeRatio * 2 + 0.5}`,
                      minWidth: sizeRatio > 0.5 ? '120px' : '80px',
                      background: isProfit 
                        ? `rgba(74, 222, 128, ${intensity})`
                        : `rgba(248, 113, 113, ${intensity})`,
                      borderColor: isProfit 
                        ? `rgba(74, 222, 128, ${intensity + 0.3})`
                        : `rgba(248, 113, 113, ${intensity + 0.3})`
                    }}
                  >
                    <span className="tile-symbol">{item.name}</span>
                    <span className={`tile-pnl ${isProfit ? 'profit' : 'loss'}`}>
                      {isProfit ? '+' : ''}₹{item.pnl.toFixed(0)}
                    </span>
                    <span className="tile-percent">{percentage}%</span>
                    <span className="tile-count">{item.size} trades</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
    </MainLayout>
  )
}

export default Dashboard
