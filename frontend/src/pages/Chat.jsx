import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import MainLayout from '../components/MainLayout'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './Chat.css'

const PRESET_PROMPTS = [
  { icon: '📊', text: 'Analyze my trading performance this week' },
  { icon: '🎯', text: 'Which patterns am I most profitable in?' },
  { icon: '⚠️', text: 'What are my biggest trading mistakes?' },
  { icon: '💡', text: 'How can I improve my win rate?' }
]

// Get user ID from JWT token
const getUserIdFromToken = (token) => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.userId || payload.id || payload._id || 'default'
  } catch (e) {
    return 'default'
  }
}

const Chat = () => {
  const { token } = useAuth()
  const userId = getUserIdFromToken(token)
  const chatHistoryKey = `chatHistory_${userId}`
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load user-specific chat history
  useEffect(() => {
    const savedHistory = localStorage.getItem(chatHistoryKey)
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory))
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }
    } else {
      // Clear messages if no history for this user
      setMessages([])
    }
  }, [chatHistoryKey])

  // Save user-specific chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatHistoryKey, JSON.stringify(messages))
    }
  }, [messages, chatHistoryKey])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text = input) => {
    if (!text.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const context = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }))

      const res = await api.post('/chat', {
        message: text,
        context
      })

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.response || res.data.text || 'I received your message but couldn\'t generate a response.',
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ Error: ${error.response?.data?.message || error.message || 'Failed to get response'}`,
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    }
    
    setIsLoading(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePresetClick = (prompt) => {
    handleSend(prompt.text)
  }

  const clearHistory = () => {
    if (window.confirm('Clear all chat history?')) {
      setMessages([])
      localStorage.removeItem(chatHistoryKey)
    }
  }

  return (
    <MainLayout>
      <div className="chat-page">
        <div className="chat-container">
          <div className="chat-header">
            <div className="header-info">
              <span className="ai-avatar">🧠</span>
              <div>
                <h1>Hindsight AI</h1>
                <span className="status">Your trading assistant</span>
              </div>
            </div>
            {messages.length > 0 && (
              <button className="clear-btn" onClick={clearHistory}>
                🗑️ Clear
              </button>
            )}
          </div>

          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🧠</div>
                <h2>Hi! I'm Hindsight</h2>
                <p>Your AI trading assistant. Ask me about your trades, patterns, or how to improve.</p>
                
                <div className="preset-prompts">
                  {PRESET_PROMPTS.map((prompt, i) => (
                    <button 
                      key={i} 
                      className="preset-btn"
                      onClick={() => handlePresetClick(prompt)}
                    >
                      <span>{prompt.icon}</span>
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`message ${message.role} ${message.isError ? 'error' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="message-avatar">
                      {message.role === 'user' ? '👤' : '🧠'}
                    </div>
                    <div className="message-content">
                      {message.role === 'assistant' ? (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      ) : (
                        <p>{message.content}</p>
                      )}
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {isLoading && (
              <motion.div 
                className="message assistant loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="message-avatar">🧠</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your trades..."
                rows={1}
                disabled={isLoading}
              />
              <button 
                className="send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  '➤'
                )}
              </button>
            </div>
            <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default Chat
