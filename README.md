<p align="center">
  <img src="frontend/public/hindsight-logo.svg" alt="Hindsight Logo" width="80" />
</p>

<h1 align="center">Hindsight</h1>

<p align="center">
  <strong>AI-Powered Trade Retrospection for Indian Stock Market Traders</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Ollama-Local_LLM-white?logo=ollama&logoColor=black" alt="Ollama" />
  <img src="https://img.shields.io/badge/Vite-Rolldown-646CFF?logo=vite&logoColor=white" alt="Vite" />
</p>

---

## What is Hindsight?

Hindsight is a trade journal that auto-syncs trades from Indian brokers (Dhan, Angel One), detects market patterns using a K-Means ML pipeline, and lets you chat with a **local LLM** (via Ollama) about your trading history.

All AI processing runs **locally on your machine** — no trade data is sent to any external API. This was a deliberate choice because trading data is sensitive and personal.

> **We don't predict. We explain.**
> No signals, no recommendations. Just retrospective analysis of what happened and why.

---

## What's Built

### Broker Integration
- **Dhan** — OAuth2 flow for authentication, auto-sync of trade history via API
- **Angel One** — API key + TOTP-based auth, auto-sync of trade history
- **Scheduled Sync** — Cron job runs daily at 6:00 PM IST to pull new trades from all connected brokers
- **CSV Upload** — Manual upload with auto-detection of broker format (Dhan or Angel One)
- **Deduplication** — Compound index on `(userId, brokerOrderId)` prevents duplicate trades on re-sync

### Trade Management
- Trade model supports BUY/SELL with entry/exit tracking
- Automatic P&L calculation when matching BUY/SELL pairs via a position tracking service
- Open position tracking with average buy price
- Support for product types: Intraday, Delivery, CNC, Margin, MTF, CO, BO
- User reflection fields on each trade (entry reason, confidence, post-trade notes)

### ML Pattern Detection
- Python pipeline trained on ~4M rows of historical stock data (`stocks_df.csv`)
- K-Means clustering (k=9) identifies 9 market behavior patterns:
  - P1: Range-Bound | P2: Volatility Expansion | P3: Trending Up
  - P4: Trending Down | P5: Whipsaw | P6: Compression
  - P7: Blow-Off Top | P8: Mean Reversion | P9: Illiquid
- Feature engineering: volatility, trend strength, drawdown, volume metrics
- Artifacts (centroids, scaler, pattern definitions) are loaded into MongoDB on server start
- Each synced trade gets a pattern assigned by matching against cluster centroids

### AI Chat (Local LLM via Ollama)
- Uses **Ollama** running locally (default model: `qwen2.5:3b`)
- Tool-calling loop: Ollama decides which tools to call, backend executes them against MongoDB, results fed back for final response
- 8 tools available to the LLM:
  - `get_all_patterns` — list all 9 market patterns
  - `get_pattern_details` — details for a specific pattern
  - `get_user_trades` — fetch trades with optional symbol/status filter
  - `get_trade_context` — full context for a specific trade including its pattern
  - `get_user_pattern_stats` — win rate and P&L grouped by pattern
  - `get_open_positions` — current holdings
  - `get_trading_summary` — overall performance metrics
  - `analyze_trade` — deep analysis combining trade + pattern + user history
- **Adaptive system prompt** adjusts language complexity based on user's experience level (beginner/intermediate/advanced)
- Chat history persisted per user in localStorage

### Retrospective Analysis
- Standalone retrospective service assembles full context (trade + pattern + user reflection + historical stats) and sends to Ollama for analysis
- Pattern insight generation for quick explanations of what a pattern means

### Dashboard & Analytics
- Summary stats: total trades, win rate, total P&L, average P&L
- Performance analytics: holding duration, direction bias (BUY vs SELL), product type breakdown, top 10 symbols by trade count
- P&L trend chart (area chart via Recharts)
- Broker-wise performance split (pie chart)
- Trade calendar with daily P&L heatmap
- Trade detail modal with reflection fields

### Frontend Pages
| Page | What it does |
|------|-------------|
| Landing | Marketing page with feature overview, comparison table, FAQ |
| Login/Register | Auth with JWT |
| Dashboard | Summary cards, P&L charts, trade calendar, broker status |
| Trades | Trade list with filtering, trade detail modal, CSV upload |
| Chat | Chat interface with preset prompts, markdown rendering, per-user history |
| Brokers | Broker connection management, sync triggers |
| BrokerConnect | OAuth/API key flow for connecting a broker |
| Settings | Experience level, currency preference |

### Security
- Helmet.js for security headers (CSP, CORS policy)
- Rate limiting: 100 req/15min general, 10 req/15min for auth endpoints
- Custom NoSQL injection prevention middleware
- Password strength validation middleware
- JWT authentication
- Non-root Docker user in Dockerfile

---

## Tech Stack

### Frontend
| Tech | Version | Use |
|------|---------|-----|
| React | 19 | UI |
| Vite (Rolldown) | 7.2.5 | Build tool |
| Framer Motion | 12.x | Page transitions & animations |
| GSAP | 3.x | Landing page animations |
| Recharts | 3.x | Charts (area, pie) |
| React Router | 7.x | Routing |
| React Markdown | 10.x | Rendering AI responses |
| Axios | 1.x | HTTP client |

### Backend
| Tech | Version | Use |
|------|---------|-----|
| Node.js + Express | 5.x | API server |
| MongoDB + Mongoose | 9.x | Database |
| Ollama | local | LLM inference (qwen2.5:3b default) |
| node-cron | 4.x | Scheduled broker sync |
| Multer | 2.x | CSV file upload |
| bcrypt | 6.x | Password hashing |
| jsonwebtoken | 9.x | Auth tokens |
| Helmet | 8.x | Security headers |
| express-rate-limit | 8.x | Rate limiting |

### ML Pipeline
| Tech | Use |
|------|-----|
| Python + scikit-learn | K-Means clustering |
| NumPy | Centroid storage |
| Pandas | Feature engineering |

---

## Project Structure

```
hindsight/
├── backend/
│   ├── src/
│   │   ├── brokers/           # Dhan & Angel One integrations
│   │   │   ├── dhan/          # OAuth flow, API calls, trade mapping
│   │   │   ├── angelone/      # API key auth, trade mapping
│   │   │   ├── basebroker.adapter.js
│   │   │   └── brokerRegistry.js
│   │   ├── config/            # MongoDB connection, env config
│   │   ├── constants/         # Messages, roles, trade types
│   │   ├── controllers/       # Route handlers
│   │   ├── mcp/               # Model Context Protocol tools
│   │   ├── middleware/        # Auth, security, password validation
│   │   ├── models/            # User, Trade, Pattern, Position, etc.
│   │   ├── routes/            # Express route definitions
│   │   ├── services/          # Business logic
│   │   │   ├── ollama.service.js         # Local LLM interface
│   │   │   ├── chat.service.js           # Tool-calling orchestrator
│   │   │   ├── retrospective.service.js  # Trade analysis context builder
│   │   │   ├── patternMatch.service.js   # ML pattern matching
│   │   │   ├── patternAssignment.service.js
│   │   │   ├── trade.service.js          # Trade CRUD
│   │   │   ├── position.service.js       # Position & P&L tracking
│   │   │   ├── analysis.service.js       # Dashboard analytics
│   │   │   ├── cron.service.js           # Scheduled sync
│   │   │   ├── csvParser.service.js      # CSV import
│   │   │   └── auth.service.js
│   │   └── utils/             # JWT, password hashing, formatters
│   ├── ml/
│   │   ├── artifacts/         # Trained model outputs
│   │   ├── feature_engineering.py
│   │   └── pattern_learning.py
│   ├── scripts/               # Migration & utility scripts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Sidebar, TradeCalendar, TradeDetailModal, etc.
│   │   ├── context/           # AuthContext
│   │   ├── pages/             # Dashboard, Trades, Chat, Brokers, Settings, etc.
│   │   └── services/          # API client (Axios instance)
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js** 20+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier)
- **Ollama** installed and running ([ollama.com](https://ollama.com))
- **Python** 3.9+ (only if you want to retrain the ML pipeline)

### 1. Clone

```bash
git clone https://github.com/yogendhra9/trade_journal1.git
cd trade_journal1
```

### 2. Pull the LLM model

```bash
ollama pull qwen2.5:3b
```

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and broker API keys
node src/server.js
```

Runs on `http://localhost:5000`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

### 5. ML Pipeline (optional — artifacts are pre-included)

```bash
cd backend/ml
pip install -r requirements.txt
python pattern_learning.py
```

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/hindsight

JWT_SECRET=your-secret-key-minimum-32-characters

FRONTEND_URL=http://localhost:5173

# Ollama (local LLM)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Dhan broker
DHAN_CLIENT_ID=your_dhan_client_id
DHAN_CLIENT_SECRET=your_dhan_client_secret
DHAN_REDIRECT_URI=http://localhost:5173/broker/dhan/callback

# Angel One broker
ANGEL_ONE_API_KEY=your_angel_one_api_key
ANGEL_ONE_CLIENT_ID=your_angel_one_client_id
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |
| GET | `/trades` | Get user trades |
| POST | `/trades/upload` | Upload CSV |
| GET | `/broker/dhan/status` | Dhan connection status |
| GET | `/broker/angelone/status` | Angel One connection status |
| POST | `/broker/dhan/sync` | Sync from Dhan |
| POST | `/broker/angelone/sync` | Sync from Angel One |
| GET | `/analysis/dashboard` | Dashboard analytics |
| POST | `/chat` | Chat with local LLM |
| GET | `/patterns` | Pattern definitions |
| GET | `/retrospective/:tradeId` | Trade retrospective analysis |
| GET | `/health` | Health check |

---

## Why Local LLM?

Trading data is sensitive — positions, P&L, strategies, behavioral patterns. Sending this to an external API (OpenAI, etc.) means your data hits third-party servers. With Ollama running locally:

- **Your data never leaves your machine**
- No API costs
- Works offline
- Full control over the model

The tradeoff is that local models (qwen2.5:3b) are less capable than GPT-4, but for retrospective trade analysis with structured tool outputs, they work well enough.

---

## License

ISC

---

<p align="center">
  Built for Indian traders who want to learn from every trade.
</p>
