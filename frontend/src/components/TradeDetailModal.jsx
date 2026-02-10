import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import api from '../services/api'
import './TradeDetailModal.css'

// Pattern descriptions with risk levels
const PATTERN_INFO = {
  'P1': { name: 'Low Volatility Range-Bound', risk: 'low', emoji: '🟢' },
  'P2': { name: 'Volatility Expansion', risk: 'medium', emoji: '🟡' },
  'P3': { name: 'Trending Up', risk: 'low', emoji: '🟢' },
  'P4': { name: 'Trending Down', risk: 'medium', emoji: '🟡' },
  'P5': { name: 'Whipsaw / Choppy', risk: 'high', emoji: '🔴' },
  'P6': { name: 'Compression Pre-Breakout', risk: 'medium', emoji: '🟡' },
  'P7': { name: 'Exhaustion / Blow-Off', risk: 'high', emoji: '🔴' },
  'P8': { name: 'Mean Reversion Setup', risk: 'medium', emoji: '🟡' },
  'P9': { name: 'Illiquid / Gappy', risk: 'high', emoji: '🔴' }
}

const ENTRY_REASONS = [
  { value: 'breakout', label: '📈 Breakout' },
  { value: 'breakdown', label: '📉 Breakdown' },
  { value: 'support_bounce', label: '🔼 Support Bounce' },
  { value: 'resistance_rejection', label: '🔽 Resistance Rejection' },
  { value: 'trend_following', label: '➡️ Trend Following' },
  { value: 'news_event', label: '📰 News Event' },
  { value: 'scalping', label: '⚡ Scalping' },
  { value: 'other', label: '🔄 Other' }
]

const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low', color: '#f87171' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#4ade80' }
]

const TradeDetailModal = ({ trade, isOpen, onClose, onUpdate }) => {
  const [reflection, setReflection] = useState({
    entryReason: trade?.reflection?.entryReason || '',
    confidence: trade?.reflection?.confidence || '',
    entryNotes: trade?.reflection?.entryNotes || '',
    postTradeNotes: trade?.reflection?.postTradeNotes || ''
  })
  const [analysis, setAnalysis] = useState(trade?.analysis || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [unsavedAnalysis, setUnsavedAnalysis] = useState(null)
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(!!trade?.analysis)

  useEffect(() => {
    if (trade) {
      setReflection({
        entryReason: trade.reflection?.entryReason || '',
        confidence: trade.reflection?.confidence || '',
        entryNotes: trade.reflection?.entryNotes || '',
        postTradeNotes: trade.reflection?.postTradeNotes || ''
      })
      setAnalysis(trade.analysis || null)
      setUnsavedAnalysis(null)
      setHasGeneratedOnce(!!trade.analysis)
    }
  }, [trade])

  if (!trade) return null

  const patternInfo = PATTERN_INFO[trade.patternId] || { name: trade.patternId || 'Unknown', risk: 'unknown', emoji: '⚪' }

  const handleSaveReflection = async () => {
    setIsSaving(true)
    try {
      await api.put(`/trades/${trade._id}/reflection`, reflection)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to save reflection:', error)
    }
    setIsSaving(false)
  }

  const handleGenerateAnalysis = async () => {
    setIsGenerating(true)
    try {
      const res = await api.post(`/analysis/generate`, { 
        tradeId: trade._id,
        reflection 
      })
      setUnsavedAnalysis(res.data.analysis)
      setHasGeneratedOnce(true)
    } catch (error) {
      console.error('Failed to generate analysis:', error)
    }
    setIsGenerating(false)
  }

  const handleSaveAnalysis = async () => {
    setIsSaving(true)
    try {
      await api.put(`/trades/${trade._id}/analysis`, { analysis: unsavedAnalysis })
      setAnalysis(unsavedAnalysis)
      setUnsavedAnalysis(null)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to save analysis:', error)
    }
    setIsSaving(false)
  }

  const handleDeleteAnalysis = async () => {
    try {
      await api.delete(`/trades/${trade._id}/analysis`)
      setAnalysis(null)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to delete analysis:', error)
    }
  }

  const StarRating = ({ value, onChange, label }) => (
    <div className="star-rating">
      <span className="star-label">{label}</span>
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span 
            key={star}
            className={`star ${star <= value ? 'filled' : ''}`}
            onClick={() => onChange(star)}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal Panel */}
          <motion.div 
            className="trade-detail-modal"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Close Button */}
            <button className="modal-close" onClick={onClose}>✕</button>

            {/* Header */}
            <div className="modal-header">
              <div className="trade-title">
                <span className="trade-symbol-large">{trade.symbol}</span>
                <span className={`trade-type-badge ${trade.tradeType.toLowerCase()}`}>
                  {trade.tradeType}
                </span>
              </div>
              <div className="trade-meta">
                <span className={`trade-pnl ${trade.pnl >= 0 ? 'profit' : 'loss'}`}>
                  {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}₹${trade.pnl?.toFixed(2)}` : '-'}
                </span>
                <span className="trade-date">
                  {new Date(trade.entryTime || trade.exitTime).toLocaleDateString('en-IN', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })}
                </span>
              </div>
            </div>

            {/* Trade Details */}
            <div className="trade-details-grid">
              <div className="detail-item">
                <span className="detail-label">{trade.tradeType === 'SELL' ? 'Exit Price' : 'Entry Price'}</span>
                <span className="detail-value">₹{(trade.entryPrice || trade.exitPrice)?.toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`detail-value status-${trade.orderStatus?.toLowerCase()}`}>
                  {trade.orderStatus === 'OPEN' ? '🟢 Open' : trade.orderStatus === 'CLOSED' ? '✅ Closed' : trade.orderStatus}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Quantity</span>
                <span className="detail-value">{trade.quantity}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Broker</span>
                <span className="detail-value">{trade.broker || '-'}</span>
              </div>
              {trade.exitPrice && (
                <>
                  <div className="detail-item">
                    <span className="detail-label">Exit Price</span>
                    <span className="detail-value">₹{trade.exitPrice.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">P&L</span>
                    <span className={`detail-value ${trade.pnl >= 0 ? 'profit-text' : 'loss-text'}`}>
                      {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl?.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Pattern Section */}
            <div className="pattern-section">
              <h4>📊 Market Pattern</h4>
              <div className="pattern-card">
                <div className="pattern-header">
                  <span className="pattern-risk">{patternInfo.emoji}</span>
                  <span className="pattern-name">{patternInfo.name}</span>
                </div>
                <div className="pattern-risk-label">
                  Risk Level: <span className={`risk-${patternInfo.risk}`}>{patternInfo.risk.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Reflection Section */}
            <div className="reflection-section">
              <h4>📝 Your Reflection</h4>
              
              <div className="reflection-form">
                <div className="form-row">
                  <label>Why did you enter this trade?</label>
                  <div className="reason-pills">
                    {ENTRY_REASONS.map(r => (
                      <button
                        key={r.value}
                        className={`reason-pill ${reflection.entryReason === r.value ? 'active' : ''}`}
                        onClick={() => setReflection({...reflection, entryReason: r.value})}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <label>Confidence Level</label>
                  <div className="confidence-options">
                    {CONFIDENCE_LEVELS.map(c => (
                      <button
                        key={c.value}
                        className={`confidence-btn ${reflection.confidence === c.value ? 'active' : ''}`}
                        style={{ '--active-color': c.color }}
                        onClick={() => setReflection({...reflection, confidence: c.value})}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <label>Entry Notes</label>
                  <textarea
                    placeholder="What setup did you see? Why did you enter here?"
                    value={reflection.entryNotes}
                    onChange={(e) => setReflection({...reflection, entryNotes: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="form-row">
                  <label>Post Trade Notes</label>
                  <textarea
                    placeholder="What did you learn? What would you do differently?"
                    value={reflection.postTradeNotes}
                    onChange={(e) => setReflection({...reflection, postTradeNotes: e.target.value})}
                    rows={3}
                  />
                </div>

                {hasGeneratedOnce && (
                  <button 
                    className="save-reflection-btn"
                    onClick={handleSaveReflection}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : '💾 Save Reflection'}
                  </button>
                )}
              </div>
            </div>

            {/* AI Analysis Section */}
            <div className="analysis-section">
              <h4>🤖 AI Insights</h4>
              
              {!analysis && !unsavedAnalysis && !isGenerating && (
                <div className="analysis-empty">
                  <p>Get AI-powered insights about this trade based on the pattern and your reflection.</p>
                  <button 
                    className="generate-btn"
                    onClick={handleGenerateAnalysis}
                    disabled={isGenerating}
                  >
                    🧠 Generate AI Insights
                  </button>
                </div>
              )}

              {isGenerating && (
                <div className="analysis-generating">
                  <div className="ai-progress-container">
                    <div className="ai-progress-bar">
                      <div className="ai-progress-fill"></div>
                    </div>
                    <div className="ai-progress-text">
                      <span className="ai-brain">🧠</span>
                      <span>Hindsight is analyzing your trade...</span>
                    </div>
                    <div className="ai-progress-steps">
                      <span className="step active">📊 Analyzing pattern</span>
                      <span className="step">🔍 Processing reflection</span>
                      <span className="step">💡 Generating insights</span>
                    </div>
                  </div>
                </div>
              )}

              {unsavedAnalysis && (
                <div className="analysis-content unsaved">
                  <div className="analysis-markdown">
                    <ReactMarkdown>{unsavedAnalysis}</ReactMarkdown>
                  </div>
                  <div className="analysis-actions">
                    <button 
                      className="regenerate-btn"
                      onClick={handleGenerateAnalysis}
                      disabled={isGenerating}
                    >
                      🔄 Regenerate
                    </button>
                    <button 
                      className="save-analysis-btn"
                      onClick={handleSaveAnalysis}
                      disabled={isSaving}
                    >
                      💾 Save Analysis
                    </button>
                  </div>
                </div>
              )}

              {analysis && !unsavedAnalysis && (
                <div className="analysis-content saved">
                  <div className="analysis-markdown">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                  <div className="analysis-actions">
                    <button 
                      className="delete-btn"
                      onClick={handleDeleteAnalysis}
                    >
                      🗑️ Delete Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default TradeDetailModal
