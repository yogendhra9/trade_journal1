import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../services/api'
import TradeDetailModal from '../components/TradeDetailModal'
import MainLayout from '../components/MainLayout'
import './Trades.css'

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

const Trades = () => {
  const [trades, setTrades] = useState([])
  const [filteredTrades, setFilteredTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('entryTime')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [isClassifying, setIsClassifying] = useState(false)
  const [filters, setFilters] = useState({
    broker: 'all',
    tradeType: 'all',
    pattern: 'all'
  })

  useEffect(() => {
    fetchTrades()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [trades, searchQuery, filters, sortField, sortOrder])

  const fetchTrades = async () => {
    try {
      const res = await api.get('/trades')
      setTrades(res.data.trades || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch trades:', error)
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...trades]

    // Search filter
    if (searchQuery) {
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Broker filter
    if (filters.broker !== 'all') {
      result = result.filter(t => t.broker === filters.broker)
    }

    // Trade type filter
    if (filters.tradeType !== 'all') {
      result = result.filter(t => t.tradeType === filters.tradeType)
    }

    // Pattern filter
    if (filters.pattern !== 'all') {
      result = result.filter(t => t.patternId === filters.pattern)
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      
      if (sortField === 'entryTime') {
        // Use entryTime for BUY, exitTime for SELL
        aVal = new Date(a.entryTime || a.exitTime).getTime()
        bVal = new Date(b.entryTime || b.exitTime).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

    setFilteredTrades(result)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  // Get unique values for filters
  const brokers = [...new Set(trades.map(t => t.broker).filter(Boolean))]
  const patterns = [...new Set(trades.map(t => t.patternId).filter(Boolean))]
  const unclassifiedCount = trades.filter(t => !t.patternId).length

  const handleClassifyTrades = async () => {
    setIsClassifying(true)
    try {
      await api.post('/patterns/assign-all')
      fetchTrades()
    } catch (error) {
      console.error('Failed to classify trades:', error)
    }
    setIsClassifying(false)
  }

  const handleTradeClick = (trade) => {
    setSelectedTrade(trade)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="trades-page">
          <div className="loading-screen">
            <span className="loading-icon">👁</span>
            <span>Loading trades...</span>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="trades-page">
        <main className="trades-main">
        <div className="page-title-row">
          <div className="title-left">
            <h1>Trade History</h1>
            <span className="trade-count">{filteredTrades.length} trades</span>
          </div>
          {trades.length > 0 && (
            <button 
              className="classify-btn"
              onClick={handleClassifyTrades}
              disabled={isClassifying}
            >
              {isClassifying ? (
                <>
                  <span className="spinner-small"></span>
                  Classifying...
                </>
              ) : unclassifiedCount > 0 ? (
                <>🎯 Classify {unclassifiedCount} Trades</>
              ) : (
                <>🔄 Re-classify Patterns</>
              )}
            </button>
          )}
        </div>

        {/* Filters Bar */}
        <motion.div 
          className="filters-bar"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="search-input">
            <span className="search-icon">🔍</span>
            <input 
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <div className="custom-select">
              <select 
                value={filters.broker} 
                onChange={(e) => setFilters({...filters, broker: e.target.value})}
              >
                <option value="all">All Brokers</option>
                {brokers.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <span className="select-arrow">▼</span>
            </div>

            <div className="custom-select">
              <select 
                value={filters.tradeType} 
                onChange={(e) => setFilters({...filters, tradeType: e.target.value})}
              >
                <option value="all">All Types</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
              <span className="select-arrow">▼</span>
            </div>

            <div className="custom-select">
              <select 
                value={filters.pattern} 
                onChange={(e) => setFilters({...filters, pattern: e.target.value})}
              >
                <option value="all">All Patterns</option>
                {patterns.map(p => <option key={p} value={p}>{PATTERN_NAMES[p] || p}</option>)}
              </select>
              <span className="select-arrow">▼</span>
            </div>
          </div>
        </motion.div>

        {/* Trades List (Cards) */}
        <motion.div 
          className="trades-list-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="trades-grid-header">
            <span onClick={() => handleSort('symbol')} className="col-symbol">Symbol {getSortIcon('symbol')}</span>
            <span onClick={() => handleSort('tradeType')} className="col-type">Type {getSortIcon('tradeType')}</span>
            <span onClick={() => handleSort('pnl')} className="col-pnl">P&L {getSortIcon('pnl')}</span>
            <span onClick={() => handleSort('entryPrice')} className="col-price">Entry {getSortIcon('entryPrice')}</span>
            <span onClick={() => handleSort('exitPrice')} className="col-price">Exit {getSortIcon('exitPrice')}</span>
            <span onClick={() => handleSort('quantity')} className="col-qty">Qty {getSortIcon('quantity')}</span>
            <span onClick={() => handleSort('entryTime')} className="col-date">Date {getSortIcon('entryTime')}</span>
            <span className="col-pattern">Pattern</span>
            <span className="col-broker">Broker</span>
          </div>

          <div className="trades-list">
            {filteredTrades.map((trade, idx) => (
              <motion.div 
                key={trade._id}
                className="trade-card-row"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleTradeClick(trade)}
              >
                <div className="col-symbol">
                  <span className="symbol-text">{trade.symbol}</span>
                </div>
                
                <div className="col-type">
                  <span className={`type-badge ${trade.tradeType.toLowerCase()}`}>
                    {trade.tradeType}
                  </span>
                </div>

                <div className="col-pnl">
                  <span className={`pnl-text ${trade.pnl > 0 ? 'profit' : trade.pnl < 0 ? 'loss' : ''}`}>
                    {trade.pnl !== null ? `${trade.pnl > 0 ? '+' : ''}₹${trade.pnl.toFixed(2)}` : '-'}
                  </span>
                </div>

                <div className="col-price">
                  <span className="price-text">{trade.entryPrice ? `₹${trade.entryPrice.toLocaleString()}` : '-'}</span>
                </div>

                <div className="col-price">
                  <span className="price-text">{trade.exitPrice ? `₹${trade.exitPrice.toLocaleString()}` : '-'}</span>
                </div>

                <div className="col-qty">
                  <span className="qty-text">{trade.quantity}</span>
                </div>

                <div className="col-date">
                  <span className="date-text">
                    {new Date(trade.entryTime || trade.exitTime).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short',
                      year: '2-digit'
                    })}
                  </span>
                  <span className="time-text">
                    {new Date(trade.entryTime || trade.exitTime).toLocaleTimeString('en-IN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>

                <div className="col-pattern">
                  {trade.patternId ? (
                    <span className="pattern-badge">{PATTERN_NAMES[trade.patternId] || trade.patternId}</span>
                  ) : (
                    <span className="empty-dash">-</span>
                  )}
                </div>

                <div className="col-broker">
                  <span className="broker-text">{trade.broker || '-'}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredTrades.length === 0 && (
            <div className="no-trades">
              <span>📭</span>
              <p>No trades found</p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Trade Detail Modal */}
      <TradeDetailModal 
        trade={selectedTrade}
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        onUpdate={fetchTrades}
      />
    </div>
    </MainLayout>
  )
}

export default Trades
