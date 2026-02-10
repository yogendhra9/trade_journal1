/**
 * Chat Service - The Orchestrator
 * 
 * Connects Ollama (the brain) to MCP tools (the actions).
 * 
 * Flow:
 * 1. User asks question
 * 2. Send to Ollama with tool definitions
 * 3. Ollama decides which tools to call
 * 4. We execute those tools
 * 5. Send results back to Ollama
 * 6. Get final answer
 */

import axios from 'axios';
import Trade from '../models/Trade.model.js';
import Pattern from '../models/Pattern.model.js';
import Position from '../models/Position.model.js';
import User from '../models/User.model.js';

// Constants will be read at runtime
const getOllamaUrl = () => process.env.OLLAMA_URL || 'http://localhost:11434';
const getOllamaModel = () => process.env.OLLAMA_MODEL || 'qwen2.5:3b';

// ============ TOOL DEFINITIONS ============
// These tell Ollama what tools are available

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_all_patterns',
      description: 'Get all market behavior patterns (P1-P9) learned from historical data. Use this to understand what patterns exist.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_pattern_details',
      description: 'Get detailed information about a specific pattern by ID.',
      parameters: {
        type: 'object',
        properties: {
          patternId: {
            type: 'string',
            description: 'Pattern ID: P1, P2, P3, P4, P5, P6, P7, P8, or P9'
          }
        },
        required: ['patternId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_trades',
      description: 'Get trading history for the user. Can filter by symbol or status.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Optional: Filter by stock symbol (e.g., RELIANCE)'
          },
          status: {
            type: 'string',
            description: 'Optional: OPEN, CLOSED, or CANCELLED'
          },
          limit: {
            type: 'number',
            description: 'Max trades to return (default 10)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_trade_context',
      description: 'Get full context for a specific trade including the market pattern at entry.',
      parameters: {
        type: 'object',
        properties: {
          tradeId: {
            type: 'string',
            description: 'MongoDB ObjectId of the trade'
          }
        },
        required: ['tradeId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_pattern_stats',
      description: 'Get user\'s win rate and performance grouped by market pattern.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_open_positions',
      description: 'Get user\'s current open positions (holdings).',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_trading_summary',
      description: 'Get overall trading performance: total trades, win rate, P&L.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_trade',
      description: 'Get deep analysis of a specific trade including pattern details, user history in that pattern, and user reflection. Use this for detailed trade analysis.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Stock symbol to analyze (e.g., MISHTANN, RELIANCE)'
          }
        },
        required: ['symbol']
      }
    }
  }
];

// ============ TOOL EXECUTORS ============
// These actually run the tools and get data from MongoDB

const toolExecutors = {
  
  async get_all_patterns() {
    const patterns = await Pattern.find({}).lean();
    return patterns.map(p => ({
      id: p.patternId,
      name: p.name,
      description: p.description,
      characteristics: p.characteristics,
      risks: p.risks,
      frequency: `${p.stats?.percentage || 0}%`
    }));
  },

  async get_pattern_details({ patternId }) {
    const pattern = await Pattern.findOne({ patternId }).lean();
    if (!pattern) return { error: `Pattern ${patternId} not found` };
    return {
      id: pattern.patternId,
      name: pattern.name,
      description: pattern.description,
      characteristics: pattern.characteristics,
      risks: pattern.risks,
      stats: pattern.stats
    };
  },

  async get_user_trades({ symbol, status, limit = 10 }, userId) {
    const query = { userId };
    if (symbol) query.symbol = symbol.toUpperCase();
    if (status) query.orderStatus = status;

    const trades = await Trade.find(query)
      .sort({ entryTime: -1 })
      .limit(limit)
      .lean();

    return trades.map(t => ({
      id: t._id.toString(),
      symbol: t.symbol,
      action: t.tradeType,
      price: t.entryPrice,
      quantity: t.quantity,
      date: t.entryTime,
      status: t.orderStatus,
      pnl: t.pnl,
      patternId: t.patternId
    }));
  },

  async get_trade_context({ tradeId }, userId) {
    const trade = await Trade.findOne({ _id: tradeId, userId }).lean();
    if (!trade) return { error: 'Trade not found' };

    let pattern = null;
    if (trade.patternId) {
      pattern = await Pattern.findOne({ patternId: trade.patternId }).lean();
    }

    return {
      trade: {
        symbol: trade.symbol,
        action: trade.tradeType,
        price: trade.entryPrice,
        quantity: trade.quantity,
        date: trade.entryTime,
        pnl: trade.pnl,
        status: trade.orderStatus
      },
      pattern: pattern ? {
        id: pattern.patternId,
        name: pattern.name,
        description: pattern.description,
        risks: pattern.risks
      } : null
    };
  },

  async get_user_pattern_stats(_, userId) {
    const trades = await Trade.find({
      userId,
      orderStatus: 'CLOSED',
      pnl: { $ne: null },
      patternId: { $exists: true, $ne: null }
    }).lean();

    const stats = {};
    for (const trade of trades) {
      const pid = trade.patternId;
      if (!stats[pid]) stats[pid] = { trades: 0, wins: 0, totalPnl: 0 };
      stats[pid].trades++;
      if (trade.pnl > 0) stats[pid].wins++;
      stats[pid].totalPnl += trade.pnl;
    }

    const result = {};
    for (const [pid, data] of Object.entries(stats)) {
      result[pid] = {
        trades: data.trades,
        winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
        totalPnl: Math.round(data.totalPnl * 100) / 100
      };
    }
    return result;
  },

  async get_open_positions(_, userId) {
    const positions = await Position.find({ userId, quantity: { $gt: 0 } }).lean();
    return positions.map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      avgPrice: p.avgBuyPrice,
      totalCost: p.totalCost
    }));
  },

  async get_trading_summary(_, userId) {
    const trades = await Trade.find({
      userId,
      orderStatus: 'CLOSED',
      pnl: { $ne: null }
    }).lean();

    const wins = trades.filter(t => t.pnl > 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    return {
      totalTrades: trades.length,
      wins,
      losses: trades.length - wins,
      winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0,
      totalPnl: Math.round(totalPnl * 100) / 100
    };
  },

  // Deep trade analysis - pools all context for insightful analysis
  async analyze_trade({ symbol }, userId) {
    // Get all trades for this symbol
    const trades = await Trade.find({ 
      userId, 
      symbol: symbol.toUpperCase() 
    }).sort({ entryTime: -1 }).lean();

    if (trades.length === 0) {
      return { error: `No trades found for ${symbol}` };
    }

    // Get the most recent trade's pattern
    const latestTrade = trades[0];
    const patternId = latestTrade.patternId;

    // Get pattern details
    let patternDetails = null;
    if (patternId) {
      patternDetails = await Pattern.findOne({ patternId }).lean();
    }

    // Calculate user's history in this pattern
    const allPatternTrades = await Trade.find({
      userId,
      patternId,
      orderStatus: 'CLOSED',
      pnl: { $ne: null }
    }).lean();

    const patternStats = {
      totalTrades: allPatternTrades.length,
      wins: allPatternTrades.filter(t => t.pnl > 0).length,
      winRate: allPatternTrades.length > 0 
        ? Math.round((allPatternTrades.filter(t => t.pnl > 0).length / allPatternTrades.length) * 100) 
        : 0,
      totalPnl: allPatternTrades.reduce((sum, t) => sum + t.pnl, 0)
    };

    // Calculate P&L for this symbol
    const closedTrades = trades.filter(t => t.pnl !== null);
    const symbolPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);

    return {
      symbol: symbol.toUpperCase(),
      tradeCount: trades.length,
      latestTrade: {
        action: latestTrade.tradeType,
        price: latestTrade.entryPrice,
        quantity: latestTrade.quantity,
        date: latestTrade.entryTime,
        pnl: latestTrade.pnl,
        status: latestTrade.orderStatus
      },
      pattern: patternDetails ? {
        id: patternDetails.patternId,
        name: patternDetails.name,
        description: patternDetails.description,
        characteristics: patternDetails.characteristics,
        risks: patternDetails.risks
      } : null,
      userPatternHistory: patternStats,
      userReflection: latestTrade.reflection || null,
      symbolTotalPnl: Math.round(symbolPnl * 100) / 100
    };
  }
};

// ============ ADAPTIVE SYSTEM PROMPT ============

const getSystemPrompt = (experienceLevel, currency = 'INR') => {
  const currencySymbol = currency === 'INR' ? '₹' : '$';
  
  const levelGuidance = {
    beginner: `
LANGUAGE STYLE: Simple and friendly
- Use simple, everyday words - avoid jargon
- Explain terms like "pattern", "volatility" when you use them
- Give one clear takeaway, not multiple points
- Be encouraging and supportive`,
    
    intermediate: `
LANGUAGE STYLE: Balanced technical
- Use trading terms but explain complex concepts briefly
- Reference pattern names (P1, P2, etc.) with brief descriptions
- Include relevant statistics when helpful
- Be direct but not overwhelming`,
    
    advanced: `
LANGUAGE STYLE: Full technical
- Use precise trading terminology freely
- Include detailed statistics and pattern metrics
- Reference risk characteristics and historical data
- Be concise and data-driven`
  };

  return `You are a trading journal analyst. Your job is to help traders understand their past trades and patterns.

USER EXPERIENCE LEVEL: ${experienceLevel.toUpperCase()}
CURRENCY: ${currency} (${currencySymbol}) - Always use ${currencySymbol} symbol for prices and amounts
${levelGuidance[experienceLevel] || levelGuidance.beginner}

IMPORTANT RULES:
1. NEVER predict future prices
2. NEVER give trading advice or recommendations
3. Focus on explaining patterns, behaviors, and past performance
4. Use the analyze_trade tool for deep trade analysis when asked about a specific stock
5. Be concise - prefer quality over quantity
6. Reference specific data from tools when available
7. Always use ${currencySymbol} for currency values

You have access to tools that fetch:
- Market patterns (P1-P9) learned from historical data
- User's trading history and performance per pattern
- Deep trade analysis with pattern context

Use these tools to provide data-driven retrospective analysis.`;
};

// ============ MAIN CHAT FUNCTION ============

/**
 * Process a chat message with tool calling
 */
export const chat = async (userId, userMessage, conversationHistory = []) => {
  
  // Get user's experience level and currency
  const user = await User.findById(userId).select('experienceLevel currency').lean();
  const experienceLevel = user?.experienceLevel || 'beginner';
  const currency = user?.currency || 'INR';
  
  // Build messages array with adaptive system prompt
  const messages = [
    { role: 'system', content: getSystemPrompt(experienceLevel, currency) },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  // First call to Ollama - may request tool calls
  const ollamaUrl = getOllamaUrl();
  const ollamaModel = getOllamaModel();
  
  let response = await axios.post(`${ollamaUrl}/api/chat`, {
    model: ollamaModel,
    messages,
    tools: TOOL_DEFINITIONS,
    stream: false
  });

  let assistantMessage = response.data.message;
  const toolCalls = [];

  // Process tool calls if any
  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      // Handle both string and object arguments (Ollama may return either)
      const rawArgs = toolCall.function.arguments;
      const toolArgs = typeof rawArgs === 'string' ? JSON.parse(rawArgs || '{}') : (rawArgs || {});
      
      console.log(`Executing tool: ${toolName}`, toolArgs);
      
      // Execute the tool
      const executor = toolExecutors[toolName];
      if (!executor) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      
      const toolResult = await executor(toolArgs, userId);
      
      toolCalls.push({
        tool: toolName,
        args: toolArgs,
        result: toolResult
      });

      // Add tool result to messages
      messages.push(assistantMessage);
      messages.push({
        role: 'tool',
        content: JSON.stringify(toolResult)
      });
    }

    // Call Ollama again with tool results
    response = await axios.post(`${ollamaUrl}/api/chat`, {
      model: ollamaModel,
      messages,
      tools: TOOL_DEFINITIONS,
      stream: false
    });

    assistantMessage = response.data.message;
  }

  // Return final response
  return {
    response: assistantMessage.content,
    toolsUsed: toolCalls,
    model: ollamaModel
  };
};

/**
 * Simple health check
 */
export const healthCheck = async () => {
  try {
    const response = await axios.get(`${getOllamaUrl()}/api/tags`);
    return { 
      status: 'ok', 
      models: response.data.models?.map(m => m.name) || [] 
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};
