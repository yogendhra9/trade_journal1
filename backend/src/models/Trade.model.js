import mongoose from 'mongoose';

const TradeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    broker: {
      type: String,
      required: true,
      enum: ['DHAN', 'ANGELONE']
    },
    brokerOrderId: {
      type: String,
      required: true
    },
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      required: true
    },
    segment: {
      type: String,
      required: true
    },
    tradeType: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL']
    },
    productType: {
      type: String,
      required: true,
      enum: ['INTRADAY', 'DELIVERY', 'CNC', 'MARGIN', 'MTF', 'CO', 'BO']
    },
    quantity: {
      type: Number,
      required: true
    },
    entryPrice: {
      type: Number,
      default: null  // Null for SELL trades (they have exitPrice instead)
    },
    entryTime: {
      type: Date,
      default: null  // Null for SELL trades (they have exitTime instead)
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['OPEN', 'CLOSED', 'CANCELLED'],
      default: 'OPEN'
    },
    exitPrice: {
      type: Number,
      default: null
    },
    exitTime: {
      type: Date,
      default: null
    },
    pnl: {
      type: Number,
      default: null
    },
    // Pattern detected at trade entry (from ML)
    patternId: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'],
      default: null
    },
    // User's reflection on the trade
    reflection: {
      entryReason: {
        type: String,
        enum: ['breakout', 'breakdown', 'support_bounce', 'resistance_rejection', 
               'trend_following', 'news_event', 'scalping', 'other'],
        default: null
      },
      entryNotes: {
        type: String,
        maxlength: 500,
        default: null
      },
      confidence: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: null
      },
      postTradeNotes: {
        type: String,
        maxlength: 1000,
        default: null
      }
    },
    // AI-generated analysis (markdown)
    analysis: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Compound index for idempotent ingestion - prevents duplicate trades from same broker
TradeSchema.index({ userId: 1, brokerOrderId: 1 }, { unique: true });

// Index for analytics queries
TradeSchema.index({ userId: 1, orderStatus: 1, entryTime: -1 });

const Trade = mongoose.model('Trade', TradeSchema);

export default Trade;
