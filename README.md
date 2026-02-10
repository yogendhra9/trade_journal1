<p align="center">
  <img src="frontend/public/hindsight-logo.svg" alt="Hindsight Logo" width="80" />
</p>

<h1 align="center">Hindsight</h1>

<p align="center">
  <strong>AI-Powered Trade Retrospection That Actually Makes You Better</strong>
</p>

<p align="center">
  Your personal trading analyst that explains what happened, why it happened, and how to improve — without prediction BS.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Vite-Rolldown-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## ✨ What is Hindsight?

Hindsight is an **AI-powered trade journal** designed for Indian stock market traders. It auto-syncs trades from your broker, detects market patterns using ML, and provides honest AI-driven retrospection — no predictions, no signals, just learning.

### 🎯 Key Philosophy

> **We don't predict. We explain.**
> 
> Most trading tools promise to beat the market. We promise you'll understand your trading better than ever before.

---

## 🚀 Features

### 📊 Dashboard & Analytics
- Real-time P&L tracking with interactive charts
- Win rate, average profit/loss, and streak analysis
- Broker-wise performance split
- Trade calendar with daily P&L heatmap

### 🤖 AI Trade Retrospection
- Chat with AI about your trades using natural language
- Get honest feedback on every trade
- Understand behavioral patterns and deviations
- Zero predictions — pure learning

### 🎯 Automatic Pattern Detection
9 ML-identified market patterns applied to your trades:

| Pattern | Description |
|---------|-------------|
| Range-Bound | Low volatility, sideways movement |
| Volatility Expansion | Sudden increase in price swings |
| Trending Up | Sustained bullish momentum |
| Trending Down | Sustained bearish momentum |
| Whipsaw | Rapid reversals, choppy action |
| Compression | Narrowing range before breakout |
| Blow-Off | Extreme move with exhaustion |
| Mean Reversion | Price returning to average |
| Illiquid | Low volume, erratic movement |

### 🔄 Broker Integration
- **Dhan** — OAuth-based auto-sync
- **Angel One** — API key-based sync
- Scheduled daily sync at 6 PM IST (via cron)
- Manual CSV upload for historical data
- Automatic trade deduplication

### 🔒 Security
- JWT authentication with secure token handling
- Helmet.js security headers
- Rate limiting (general + auth-specific)
- NoSQL injection prevention
- Password strength validation
- Encrypted broker credentials

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| Vite (Rolldown) | Build tool |
| Framer Motion | Animations |
| GSAP | Advanced animations |
| Recharts | Data visualization |
| React Router 7 | Routing |
| Axios | HTTP client |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express 5 | API server |
| MongoDB + Mongoose 9 | Database |
| JWT | Authentication |
| Helmet + Rate Limiting | Security |
| Node-Cron | Scheduled syncs |
| Multer | File uploads (CSV) |

### ML / AI
| Technology | Purpose |
|-----------|---------|
| Python + Scikit-learn | Pattern clustering (K-Means) |
| OpenAI API | AI chat & trade analysis |
| MCP (Model Context Protocol) | Structured AI tool integration |

### DevOps
| Technology | Purpose |
|-----------|---------|
| Docker | Containerization |
| AWS EC2 | Backend hosting |
| AWS S3 + CloudFront | Frontend hosting |
| MongoDB Atlas | Cloud database |

---

## 📁 Project Structure

```
hindsight/
├── backend/
│   ├── src/
│   │   ├── brokers/           # Broker integrations (Dhan, Angel One)
│   │   ├── config/            # Database & environment config
│   │   ├── constants/         # App constants & enums
│   │   ├── controllers/       # Route handlers
│   │   ├── mcp/               # Model Context Protocol (AI tools)
│   │   ├── middleware/        # Auth, security, logging
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # Express routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Helpers (JWT, password, formatting)
│   │   ├── app.js             # Express app setup
│   │   └── server.js          # Server entry point
│   ├── ml/                    # Python ML pipeline
│   │   ├── artifacts/         # Trained model artifacts
│   │   ├── feature_engineering.py
│   │   └── pattern_learning.py
│   ├── scripts/               # Utility scripts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # React context (Auth)
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/                # Static assets
│   └── package.json
├── deploy/
│   └── aws-guide.md           # AWS deployment guide
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** 20+
- **MongoDB** (local or [Atlas](https://www.mongodb.com/cloud/atlas) free tier)
- **Python** 3.9+ (for ML pipeline, optional)

### 1. Clone the repository

```bash
git clone https://github.com/yogendhra9/trade_journal1.git
cd trade_journal1
```

### 2. Setup Backend

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your credentials (MongoDB URI, JWT secret, broker keys, etc.)

# Start the server
node src/server.js
```

The backend runs on `http://localhost:5000`

### 3. Setup Frontend

```bash
cd frontend
npm install

# Start dev server
npm run dev
```

The frontend runs on `http://localhost:5173`

### 4. Run ML Pipeline (Optional)

```bash
cd backend/ml
pip install -r requirements.txt
python pattern_learning.py
```

This trains the pattern detection model on historical market data.

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/hindsight

# Auth
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173

# Broker APIs
DHAN_CLIENT_ID=your_dhan_client_id
DHAN_CLIENT_SECRET=your_dhan_client_secret
DHAN_REDIRECT_URI=http://localhost:5173/broker/dhan/callback

ANGEL_ONE_API_KEY=your_angel_one_api_key
ANGEL_ONE_CLIENT_ID=your_angel_one_client_id

# AI
OPENAI_API_KEY=your_openai_api_key
```

---

## 🐳 Docker

```bash
cd backend

# Build
docker build -t hindsight-backend .

# Run
docker run -d -p 5000:5000 --env-file .env --name hindsight hindsight-backend
```

---

## 🌐 Deployment

See the full [AWS Deployment Guide](deploy/aws-guide.md) for step-by-step instructions on deploying to:
- **Backend** → AWS EC2 with Docker
- **Frontend** → AWS S3 + CloudFront
- **Database** → MongoDB Atlas

Estimated monthly cost: **$0–12/mo** (with free tier)

---

## 📄 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| GET | `/trades` | Get user trades |
| POST | `/trades/upload` | Upload CSV trades |
| GET | `/broker/dhan/status` | Dhan connection status |
| GET | `/broker/angelone/status` | Angel One connection status |
| POST | `/broker/dhan/sync` | Sync trades from Dhan |
| POST | `/broker/angelone/sync` | Sync trades from Angel One |
| GET | `/analysis/dashboard` | Dashboard analytics |
| POST | `/chat` | AI chat with trade context |
| GET | `/patterns` | Get pattern definitions |
| GET | `/retrospective` | Get trade retrospectives |
| GET | `/health` | Health check |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the ISC License.

---

<p align="center">
  Built with ❤️ for Indian traders who want to learn, not gamble.
</p>
