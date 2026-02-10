import * as analysisService from '../services/analysis.service.js';
import Analysis from '../models/Analysis.model.js';
import Trade from '../models/Trade.model.js';

/**
 * GET /analysis/summary - Get trade summary analytics
 * 
 * Query params: startDate, endDate, symbol, productType
 */
export const getSummary = async (req, res) => {
  try {
    const { startDate, endDate, symbol, productType } = req.query;
    
    const summary = await analysisService.getSummary(req.user.userId, {
      startDate,
      endDate,
      symbol,
      productType
    });

    res.json({
      filters: { startDate, endDate, symbol, productType },
      summary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /analysis/performance - Get trade performance analytics
 * 
 * Query params: startDate, endDate, symbol, productType
 */
export const getPerformance = async (req, res) => {
  try {
    const { startDate, endDate, symbol, productType } = req.query;
    
    const performance = await analysisService.getPerformance(req.user.userId, {
      startDate,
      endDate,
      symbol,
      productType
    });

    res.json({
      filters: { startDate, endDate, symbol, productType },
      performance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============ LLM ANALYSIS STORAGE ============

/**
 * POST /analysis/save - Save an LLM trade analysis
 */
export const saveAnalysis = async (req, res) => {
  try {
    const { symbol, tradeId, userQuery, response, context, model } = req.body;
    
    if (!symbol || !response) {
      return res.status(400).json({ message: 'symbol and response are required' });
    }

    // If tradeId provided, verify it belongs to user
    let validTradeId = null;
    if (tradeId) {
      const trade = await Trade.findOne({ 
        _id: tradeId, 
        userId: req.user.userId 
      });
      if (trade) {
        validTradeId = trade._id;
      }
    }

    const analysis = new Analysis({
      userId: req.user.userId,
      tradeId: validTradeId,
      symbol: symbol.toUpperCase(),
      userQuery: userQuery || 'Analyze trade',
      response,
      context: context || {},
      model: model || 'qwen2.5:3b'
    });

    await analysis.save();

    res.status(201).json({
      message: 'Analysis saved',
      analysisId: analysis._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /analysis/saved/:symbol - Get saved LLM analyses for a symbol
 */
export const getSavedAnalyses = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 10 } = req.query;

    const analyses = await Analysis.find({
      userId: req.user.userId,
      symbol: symbol.toUpperCase()
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      count: analyses.length,
      analyses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /analysis/saved/:id - Delete a saved analysis
 */
export const deleteSavedAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json({ message: 'Analysis deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /analysis/generate - Generate AI analysis for a trade
 */
export const generateTradeAnalysis = async (req, res) => {
  try {
    const { tradeId, reflection } = req.body;
    
    if (!tradeId) {
      return res.status(400).json({ message: 'tradeId is required' });
    }

    // Get the trade
    const trade = await Trade.findOne({ 
      _id: tradeId, 
      userId: req.user.userId 
    });

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Get pattern info
    const patterns = await import('../ml/artifacts/patterns.json', { assert: { type: 'json' } }).catch(() => ({ default: [] }));
    const patternInfo = patterns.default?.find(p => p.patternId === trade.patternId) || { name: trade.patternId || 'Unknown', description: 'No pattern data' };

    // Get similar trades for context
    const similarTrades = await Trade.find({
      userId: req.user.userId,
      patternId: trade.patternId,
      _id: { $ne: trade._id }
    }).limit(5).lean();

    const wins = similarTrades.filter(t => t.pnl > 0).length;
    const total = similarTrades.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    // Build the prompt
    const prompt = `You are Chintan, a trading journal AI assistant. Analyze this trade and provide structured insights.

**Trade Details:**
- Symbol: ${trade.symbol}
- Type: ${trade.tradeType}
- Entry: ₹${trade.entryPrice} on ${new Date(trade.entryTime).toLocaleDateString('en-IN')}
- Exit: ${trade.exitPrice ? `₹${trade.exitPrice}` : 'Still open'}
- P&L: ${trade.pnl !== null ? `₹${trade.pnl.toFixed(2)}` : 'N/A'}
- Quantity: ${trade.quantity}

**Pattern: ${patternInfo.name || trade.patternId}**
${patternInfo.description || 'No description available'}

**Historical Win Rate:** ${winRate}% (${wins}/${total} similar trades)

**User Reflection:**
- Entry Reason: ${reflection?.entryReason || 'Not specified'}
- Confidence: ${reflection?.confidence || 'Not specified'}
- Entry Notes: ${reflection?.entryNotes || 'None'}
- Post Trade Notes: ${reflection?.postTradeNotes || 'None'}

Provide analysis in this EXACT markdown format:

## 🎯 Pattern Analysis: ${patternInfo.name || trade.patternId}
### Strengths
- [2-3 bullet points about pattern strengths]
### Risks
- [2-3 bullet points about pattern risks]

## 📊 Outcome vs Expectation
[1-2 sentences comparing trade result with pattern's typical behavior]

## 🪞 Reflection Insights
[2-3 sentences connecting user's reasoning and confidence to the outcome]

## 💡 Key Takeaways
1. [Actionable lesson #1]
2. [Actionable lesson #2]`;

    // Call Ollama
    const ollamaService = await import('../services/ollama.service.js');
    const result = await ollamaService.generate(prompt);

    res.json({
      analysis: result.text,
      tradeId: trade._id
    });
  } catch (error) {
    console.error('Generate analysis error:', error);
    res.status(500).json({ message: error.message });
  }
};
