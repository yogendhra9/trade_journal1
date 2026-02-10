import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './TradeCalendar.css'

const TradeCalendar = ({ trades = [], compact = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  // Group trades by date and calculate daily P&L
  const tradesByDate = useMemo(() => {
    const grouped = {}
    trades.forEach(trade => {
      // Use entryTime for BUY, exitTime for SELL
      const dateKey = new Date(trade.entryTime || trade.exitTime).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = { trades: [], pnl: 0, count: 0 }
      }
      grouped[dateKey].trades.push(trade)
      grouped[dateKey].pnl += trade.pnl || 0
      grouped[dateKey].count += 1
    })
    return grouped
  }, [trades])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const handleDayClick = (day) => {
    const dateKey = new Date(year, month, day).toDateString()
    if (tradesByDate[dateKey]) {
      setSelectedDate({ date: dateKey, data: tradesByDate[dateKey] })
    }
  }

  const formatPnl = (pnl) => {
    if (pnl >= 1000) return `+₹${(pnl / 1000).toFixed(1)}k`
    if (pnl <= -1000) return `-₹${(Math.abs(pnl) / 1000).toFixed(1)}k`
    if (pnl > 0) return `+₹${pnl.toFixed(0)}`
    if (pnl < 0) return `-₹${Math.abs(pnl).toFixed(0)}`
    return '₹0'
  }

  const monthName = currentDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Adjust firstDayOfMonth for Monday start (0 = Monday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const days = []
  // Empty cells for days before first day
  for (let i = 0; i < adjustedFirstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-cell empty" />)
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = new Date(year, month, day).toDateString()
    const dayData = tradesByDate[dateKey]
    const hasTrades = dayData?.count > 0
    const isToday = new Date().toDateString() === dateKey
    const isProfit = dayData?.pnl > 0
    const isLoss = dayData?.pnl < 0

    days.push(
      <motion.div
        key={day}
        className={`calendar-cell ${hasTrades ? 'has-trades' : ''} ${isToday ? 'today' : ''} ${isProfit ? 'profit' : ''} ${isLoss ? 'loss' : ''}`}
        onClick={() => handleDayClick(day)}
        whileHover={{ scale: hasTrades ? 1.02 : 1 }}
        whileTap={{ scale: hasTrades ? 0.98 : 1 }}
      >
        <span className="cell-day">{String(day).padStart(2, '0')}</span>
        {hasTrades && (
          <>
            <span className={`cell-pnl ${isProfit ? 'profit' : ''} ${isLoss ? 'loss' : ''}`}>
              {formatPnl(dayData.pnl)}
            </span>
            <span className="cell-trades">{dayData.count} trade{dayData.count > 1 ? 's' : ''}</span>
          </>
        )}
      </motion.div>
    )
  }

  return (
    <div className={`pnl-calendar ${compact ? 'compact' : ''}`}>
      <div className="calendar-header">
        <button className="nav-btn" onClick={handlePrevMonth}>◀</button>
        <h3 className="month-title">{monthName}</h3>
        <button className="nav-btn" onClick={handleNextMonth}>▶</button>
      </div>

      <div className="calendar-weekdays">
        {weekdays.map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {days}
      </div>

      {/* Trade Popup */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            className="trade-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              className="trade-popup"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popup-header">
                <div>
                  <h4>{new Date(selectedDate.date).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}</h4>
                  <span className={`popup-total ${selectedDate.data.pnl >= 0 ? 'profit' : 'loss'}`}>
                    {formatPnl(selectedDate.data.pnl)} • {selectedDate.data.count} trades
                  </span>
                </div>
                <button className="close-btn" onClick={() => setSelectedDate(null)}>✕</button>
              </div>
              <div className="popup-trades">
                {selectedDate.data.trades.map((trade, idx) => (
                  <div key={idx} className="popup-trade-row">
                    <span className="popup-symbol">{trade.symbol}</span>
                    <span className={`popup-type ${trade.tradeType.toLowerCase()}`}>
                      {trade.tradeType}
                    </span>
                    <span className="popup-price">₹{trade.entryPrice || trade.exitPrice}</span>
                    <span className={`popup-pnl ${trade.pnl > 0 ? 'profit' : trade.pnl < 0 ? 'loss' : ''}`}>
                      {trade.pnl !== null ? `₹${trade.pnl.toFixed(2)}` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TradeCalendar
