import mongoose from 'mongoose';

/**
 * Position - Tracks open positions per user per symbol
 * 
 * Used to calculate PnL on SELL trades by tracking:
 * - Quantity held
 * - Average buy price (weighted average cost basis)
 * 
 * FIFO approach simplified to average cost for MVP
 */
const PositionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    // Current quantity held
    quantity: {
      type: Number,
      required: true,
      default: 0
    },
    // Average buy price (weighted average)
    avgBuyPrice: {
      type: Number,
      required: true,
      default: 0
    },
    // Total cost basis (quantity * avgBuyPrice when bought)
    totalCost: {
      type: Number,
      default: 0
    },
    // Last updated trade
    lastTradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// One position per user per symbol per exchange
PositionSchema.index({ userId: 1, symbol: 1, exchange: 1 }, { unique: true });

const Position = mongoose.model('Position', PositionSchema);

export default Position;
