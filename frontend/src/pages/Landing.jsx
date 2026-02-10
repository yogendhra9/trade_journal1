import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import './Landing.css'

// FAQ Data
const FAQ_DATA = [
  {
    q: "Is this just another AI hype tool?",
    a: "No. We use AI for one thing: explaining your past trades. No predictions, no signals, no BS. Just honest retrospection."
  },
  {
    q: "How is my data secured?",
    a: "Broker credentials are encrypted. Trade data never leaves our servers. We never sell data. Your privacy is our priority."
  },
  {
    q: "What brokers do you support?",
    a: "Currently Dhan and Angel One. Zerodha support is coming soon!"
  },
  {
    q: "Do I need to manually enter trades?",
    a: "No! We offer three sync methods: Auto-sync from your broker (one-time setup), scheduled daily sync at 6 PM IST, and manual CSV upload for historical data."
  },
  {
    q: "Can this make me profitable?",
    a: "We can't promise profits. We can promise you'll understand your trading better than ever before. Self-awareness is the first step to improvement."
  }
]

const Landing = () => {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <img src="/hindsight-logo.svg" alt="Hindsight" className="logo-icon-img" />
          <span className="logo-text">Hindsight</span>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/register" className="btn-primary">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="hero-headline">
            Stop Guessing. <span className="gradient-text">Start Learning.</span>
          </h1>
          <p className="hero-subheadline">
            AI-Powered Trade Retrospection That Actually Makes You Better
          </p>
          <p className="hero-description">
            Your personal trading analyst that explains what happened, 
            why it happened, and how to improve—without prediction BS.
          </p>
          
          <div className="hero-cta">
            <Link to="/register" className="btn-cta primary">
              Start Free - Connect Your Broker
            </Link>
            <a href="#how-it-works" className="btn-cta secondary">
              See How It Works ↓
            </a>
          </div>

          <div className="trust-badges">
            <span>✓ Works with Dhan, Angel One</span>
            <span>✓ No predictions, just insights</span>
            <span>✓ Your data stays private</span>
          </div>
        </motion.div>

        <motion.div 
          className="hero-visual"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="split-visual">
            <div className="visual-before">
              <div className="visual-label">Before</div>
              <div className="messy-spreadsheet">
                <div className="spreadsheet-row header">
                  <span>Date</span><span>Stock</span><span>P&L</span>
                </div>
                <div className="spreadsheet-row">
                  <span>12/01</span><span>RELIANCE</span><span className="red">-500</span>
                </div>
                <div className="spreadsheet-row">
                  <span>12/02</span><span>TCS</span><span className="green">+200</span>
                </div>
                <div className="spreadsheet-row faded">
                  <span>12/03</span><span>???</span><span>???</span>
                </div>
                <div className="confused-emoji">😵‍💫</div>
              </div>
            </div>
            <div className="visual-arrow">→</div>
            <div className="visual-after">
              <div className="visual-label">After</div>
              <div className="clean-dashboard">
                <div className="dashboard-card">
                  <div className="card-header">AI Insight</div>
                  <div className="card-content">
                    <span className="insight-icon">🧠</span>
                    <p>You trade P1 patterns at 50% win rate vs 65% overall</p>
                  </div>
                </div>
                <div className="mini-chart">
                  <div className="chart-line"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Problem Section */}
      <section className="problem-section">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="section-headline">You're Trading <span className="red-text">Blind</span></h2>
          
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">📊</div>
              <h3>You Don't Track</h3>
              <ul>
                <li>Trades lost in broker statements</li>
                <li>No way to spot patterns</li>
                <li>Data scattered everywhere</li>
              </ul>
            </div>
            <div className="problem-card">
              <div className="problem-icon">🤔</div>
              <h3>You Don't Learn</h3>
              <ul>
                <li>Can't remember why you entered</li>
                <li>No feedback loop</li>
                <li>Same mistakes on repeat</li>
              </ul>
            </div>
            <div className="problem-card">
              <div className="problem-icon">😵</div>
              <h3>You Repeat Mistakes</h3>
              <ul>
                <li>Same patterns, same losses</li>
                <li>Emotional decisions</li>
                <li>No self-awareness</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Solution Section */}
      <section className="solution-section" id="how-it-works">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="section-headline">Turn Every Trade Into a <span className="gradient-text">Lesson</span></h2>
          
          <div className="steps-flow">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-icon">🔌</div>
              <h3>Connect Broker</h3>
              <p>Link Dhan or Angel One. One-time setup. Auto-sync or scheduled daily sync at 6 PM.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-icon">🧠</div>
              <h3>AI Analyzes</h3>
              <p>Pattern detection, market regime matching, behavioral analysis.</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-icon">📈</div>
              <h3>Get Insights</h3>
              <p>"You trade P1 patterns at 50% win rate vs 65% overall"</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-icon">🏆</div>
              <h3>Improve</h3>
              <p>Track real improvement over time. See what actually works for you.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="section-headline">Powerful Features</h2>
          
          <div className="features-grid">
            <div className="feature-card featured">
              <div className="feature-badge">Core Feature</div>
              <div className="feature-icon">🎯</div>
              <h3>Automatic Pattern Detection</h3>
              <p>We identify 9 proven market patterns in your trades:</p>
              <div className="pattern-list">
                <span className="pattern-tag">Range-Bound</span>
                <span className="pattern-tag">Vol Expansion</span>
                <span className="pattern-tag">Trending Up</span>
                <span className="pattern-tag">Trending Down</span>
                <span className="pattern-tag">Whipsaw</span>
                <span className="pattern-tag">Compression</span>
                <span className="pattern-tag">Blow-Off</span>
                <span className="pattern-tag">Mean Revert</span>
                <span className="pattern-tag">Illiquid</span>
              </div>
              <p className="feature-note">No manual tagging. No tedious data entry.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Performance Analytics</h3>
              <p>See exactly where you make and lose money:</p>
              <ul>
                <li>Win rate by pattern</li>
                <li>P&L trend visualization</li>
                <li>Symbol performance heatmap</li>
                <li>Trade calendar view</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI Trade Retrospection</h3>
              <p>Get honest feedback on every trade:</p>
              <ul>
                <li>✓ What pattern you traded</li>
                <li>✓ Historical performance in similar conditions</li>
                <li>✓ Where you deviate from your plan</li>
                <li>✓ Zero predictions. Pure learning.</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Flexible Sync Options</h3>
              <p>Multiple ways to get your trades:</p>
              <ul>
                <li>Auto-sync from broker API</li>
                <li>Daily scheduled sync at 6 PM IST</li>
                <li>Manual CSV upload</li>
                <li>Automatic deduplication</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Comparison Section */}
      <section className="comparison-section">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="section-headline">Not Another Trading Journal</h2>
          
          <div className="comparison-table">
            <div className="comparison-header">
              <span>Feature</span>
              <span>Traditional Journals</span>
              <span>Other Apps</span>
              <span className="highlight">Hindsight</span>
            </div>
            <div className="comparison-row">
              <span>Auto-sync trades</span>
              <span className="no">❌</span>
              <span className="yes">✓</span>
              <span className="yes highlight">✓</span>
            </div>
            <div className="comparison-row">
              <span>Pattern detection</span>
              <span className="no">❌</span>
              <span className="no">❌</span>
              <span className="yes highlight">✓</span>
            </div>
            <div className="comparison-row">
              <span>AI insights</span>
              <span className="no">❌</span>
              <span className="no">❌</span>
              <span className="yes highlight">✓</span>
            </div>
            <div className="comparison-row">
              <span>No predictions</span>
              <span className="neutral">-</span>
              <span className="no">❌ Claims to predict</span>
              <span className="yes highlight">✓</span>
            </div>
            <div className="comparison-row">
              <span>Behavioral analysis</span>
              <span className="no">❌</span>
              <span className="no">❌</span>
              <span className="yes highlight">✓</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="section-headline">What We <span className="red-text">DON'T</span> Do</h2>
          
          <div className="trust-grid">
            <div className="dont-list">
              <div className="dont-item">✗ We don't predict stock prices</div>
              <div className="dont-item">✗ We don't give buy/sell recommendations</div>
              <div className="dont-item">✗ We don't share your data</div>
              <div className="dont-item">✗ We don't charge per trade</div>
              <div className="dont-item">✗ We don't claim to "beat the market"</div>
            </div>
            <div className="do-list">
              <h3>What we DO:</h3>
              <div className="do-item">✓ Explain what happened in your trades</div>
              <div className="do-item">✓ Show behavior patterns</div>
              <div className="do-item">✓ Track actual performance</div>
              <div className="do-item">✓ Help you learn from mistakes</div>
              <div className="do-item">✓ Keep your data private</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="section-headline">Frequently Asked Questions</h2>
          
          <div className="faq-list">
            {FAQ_DATA.map((faq, index) => (
              <div 
                key={index}
                className={`faq-item ${openFaq === index ? 'open' : ''}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <span className="faq-toggle">{openFaq === index ? '−' : '+'}</span>
                </div>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div 
                      className="faq-answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2>Ready to Understand Your Trading?</h2>
          <p>Join traders who are learning from every trade instead of repeating mistakes.</p>
          <Link to="/register" className="btn-cta primary large">
            Start Free - No Credit Card Required
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/hindsight-logo.svg" alt="Hindsight" className="logo-icon-img" />
            <span className="logo-text">Hindsight</span>
          </div>
          <p className="footer-tagline">AI-Powered Trade Retrospection</p>
          <div className="footer-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
          </div>
          <p className="footer-copyright">© 2026 Chintan. Learn from every trade.</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
