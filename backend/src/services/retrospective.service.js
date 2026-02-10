/**
 * Retrospective Analysis Service
 * 
 * Assembles context for LLM-based trade analysis.
 * Combines: trade data + pattern context + user reflection + history
 */

import * as patternMatchService from './patternMatch.service.js';
import * as ollamaService from './ollama.service.js';
import Trade from '../models/Trade.model.js';

/**
 * System prompt with pattern knowledge
 */
const buildSystemPrompt = async () => {
  const patternPrompt = await patternMatchService.formatPatternsForPrompt();
  
  return `You are a trading journal analyst helping traders understand their past trades.

${patternPrompt}

IMPORTANT RULES:
- You analyze trades RETROSPECTIVELY only
- Never predict future prices
- Never give trading advice or recommendations
- Focus on explaining patterns, behaviors, and risks
- Be concise and insightful
- Reference specific pattern characteristics when relevant

Your role is to help traders learn from their past decisions, not to make future decisions for them.`;
};

/**
 * Build analysis context for a trade
 */
export const buildTradeContext = async (tradeId, userId, userReflection = null) => {
  // Get the trade
  const trade = await Trade.findOne({ _id: tradeId, userId });
  if (!trade) {
    throw new Error('Trade not found');
  }

  // Get pattern info if trade has pattern assigned
  let pattern = null;
  if (trade.patternId) {
    pattern = await patternMatchService.getPatternById(trade.patternId);
  }

  // Get user's historical pattern stats
  const patternHistory = await patternMatchService.getUserPatternStats(userId, Trade);

  // Build context object
  const context = {
    trade: {
      symbol: trade.symbol,
      action: trade.tradeType,
      price: trade.entryPrice,
      date: trade.entryTime,
      pnl: trade.pnl,
      productType: trade.productType,
      quantity: trade.quantity
    },
    pattern: pattern ? {
      id: pattern.patternId,
      name: pattern.name,
      description: pattern.description,
      characteristics: pattern.characteristics,
      risks: pattern.risks,
      stats: pattern.stats
    } : null,
    userReflection: userReflection || null,
    patternHistory: patternHistory
  };

  return context;
};

/**
 * Generate retrospective analysis for a trade
 */
export const analyzeTradeRetrospective = async (tradeId, userId, userReflection = null) => {
  // Build context
  const context = await buildTradeContext(tradeId, userId, userReflection);
  
  // Build user prompt
  let userPrompt = `Analyze this trade retrospectively:

Trade Details:
- Symbol: ${context.trade.symbol}
- Action: ${context.trade.action}
- Entry Price: ₹${context.trade.price}
- Date: ${new Date(context.trade.date).toLocaleDateString()}
- Quantity: ${context.trade.quantity}
- Product Type: ${context.trade.productType}
${context.trade.pnl !== null ? `- P&L: ₹${context.trade.pnl.toFixed(2)}` : '- Status: Open position'}
`;

  if (context.pattern) {
    userPrompt += `
Market Pattern at Entry:
- Pattern: ${context.pattern.id} - ${context.pattern.name}
- Description: ${context.pattern.description}
- Key Characteristics: ${context.pattern.characteristics.join(', ')}
`;
  }

  if (context.userReflection) {
    userPrompt += `
Trader's Reflection:
- Entry Reason: ${context.userReflection.entryReason || 'Not provided'}
- Target Price: ${context.userReflection.targetPrice || 'Not specified'}
- Followed Plan: ${context.userReflection.followedPlan !== undefined ? (context.userReflection.followedPlan ? 'Yes' : 'No') : 'Not specified'}
`;
  }

  // Add pattern history
  const historyPatterns = Object.entries(context.patternHistory);
  if (historyPatterns.length > 0) {
    userPrompt += `
Trader's Historical Performance by Pattern:`;
    for (const [patternId, stats] of historyPatterns) {
      userPrompt += `
- ${patternId}: ${stats.trades} trades, ${stats.winRate}% win rate`;
    }
  }

  userPrompt += `

Please provide:
1. What the market pattern suggests about conditions at entry
2. How this aligns (or conflicts) with the trader's stated reason
3. Key risks that were present based on the pattern
4. Learning points for future trades in similar conditions`;

  // Get system prompt with pattern knowledge
  const systemPrompt = await buildSystemPrompt();

  // Call Ollama
  const response = await ollamaService.generate(userPrompt, systemPrompt, {
    temperature: 0.7,
    maxTokens: 1024
  });

  return {
    analysis: response.text,
    context,
    model: response.model,
    generationTime: response.totalDuration
  };
};

/**
 * Get quick pattern insight (lighter weight)
 */
export const getPatternInsight = async (patternId) => {
  const pattern = await patternMatchService.getPatternById(patternId);
  
  if (!pattern) {
    throw new Error('Pattern not found');
  }

  const prompt = `Briefly explain what a "${pattern.name}" market pattern means for a trader and what they should be aware of. Keep it to 2-3 sentences.`;
  
  const systemPrompt = `You are a trading journal analyst. Be concise and educational. Never give trading advice.`;

  const response = await ollamaService.generate(prompt, systemPrompt, {
    temperature: 0.5,
    maxTokens: 256
  });

  return {
    patternId: pattern.patternId,
    patternName: pattern.name,
    insight: response.text
  };
};
