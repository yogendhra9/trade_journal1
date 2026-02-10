import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route imports
import authRoutes from './routes/auth.routes.js';
import testRoutes from './routes/test.routes.js';
import brokerRoutes from './routes/brokers.routes.js';
import tradeRoutes from './routes/trade.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import patternRoutes from './routes/patterns.routes.js';
import retrospectiveRoutes from './routes/retrospective.routes.js';
import chatRoutes from './routes/chat.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Custom sanitization function for NoSQL injection prevention
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    // Block keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) continue;
    
    const value = obj[key];
    if (typeof value === 'string') {
      // Remove $ at start of strings
      sanitized[key] = value.replace(/^\$/, '');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Custom NoSQL injection prevention middleware
const mongoSanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  // Don't modify req.query as it's read-only in newer Express
  next();
};

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://apiconnect.angelone.in", "https://api.dhan.co"]
    }
  }
}));

// Rate limiting - General API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting - Auth endpoints (stricter to prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per 15 minutes
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Apply custom sanitization (instead of express-mongo-sanitize)
app.use(mongoSanitizeMiddleware);

// Enable CORS - Dynamic based on environment
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parser with size limits (prevent DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================
// ROUTES
// ============================================

// Apply stricter rate limiting to auth routes
app.use("/auth", authLimiter, authRoutes);

// Regular routes
app.use("/test", testRoutes);
app.use("/broker", brokerRoutes);
app.use("/trades", tradeRoutes);
app.use("/analysis", analysisRoutes);
app.use("/patterns", patternRoutes);
app.use("/retrospective", retrospectiveRoutes);
app.use("/chat", chatRoutes);
app.use("/users", userRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

export default app;