import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // The trade this analysis is for (optional)
    tradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade',
      default: null
    },
    // Stock symbol for quick filtering
    symbol: {
      type: String,
      required: true,
      index: true
    },
    // The user's question/prompt
    userQuery: {
      type: String,
      required: true
    },
    // The LLM's response
    response: {
      type: String,
      required: true
    },
    // Context data used for the analysis
    context: {
      patternId: String,
      patternName: String,
      userPatternWinRate: Number,
      pnl: Number,
      reflection: {
        entryReason: String,
        confidence: String,
        postTradeNotes: String
      }
    },
    // Model used
    model: {
      type: String,
      default: 'qwen2.5:3b'
    }
  },
  { timestamps: true }
);

// Index for fetching user's analyses for a trade
AnalysisSchema.index({ userId: 1, tradeId: 1 });

// Index for fetching all analyses for a symbol
AnalysisSchema.index({ userId: 1, symbol: 1, createdAt: -1 });

const Analysis = mongoose.model('Analysis', AnalysisSchema);

export default Analysis;
