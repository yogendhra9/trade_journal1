/**
 * MCP Server for Trading Journal
 * 
 * Exposes tools for LLM clients to access:
 * - Trade context and patterns
 * - User trading history
 * - Pattern definitions
 * 
 * Run as: node src/mcp/server.js
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

// Import models and services
import Trade from '../models/Trade.model.js';
import Pattern from '../models/Pattern.model.js';
import Position from '../models/Position.model.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.error('MCP Server: MongoDB connected');
  } catch (error) {
    console.error('MCP Server: MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Create MCP Server
const server = new McpServer({
  name: 'trading-journal',
  version: '1.0.0'
});

// ============ TOOLS ============

/**
 * Tool: get_all_patterns
 * Returns all learned market patterns with descriptions
 */
server.tool(
  'get_all_patterns',
  'Get all market behavior patterns learned from historical data. Use this to understand what patterns are available.',
  {},
  async () => {
    const patterns = await Pattern.find({}).lean();
    
    const patternList = patterns.map(p => ({
      id: p.patternId,
      name: p.name,
      description: p.description,
      characteristics: p.characteristics,
      risks: p.risks,
      frequency: `${p.stats?.percentage || 0}% of historical data`
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(patternList, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_pattern_details
 * Get detailed information about a specific pattern
 */
server.tool(
  'get_pattern_details',
  'Get detailed information about a specific market pattern by its ID (P1-P9).',
  {
    patternId: {
      type: 'string',
      description: 'Pattern ID (P1, P2, P3, P4, P5, P6, P7, P8, or P9)'
    }
  },
  async ({ patternId }) => {
    const pattern = await Pattern.findOne({ patternId }).lean();
    
    if (!pattern) {
      return {
        content: [{
          type: 'text',
          text: `Pattern ${patternId} not found`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: pattern.patternId,
          name: pattern.name,
          description: pattern.description,
          characteristics: pattern.characteristics,
          risks: pattern.risks,
          stats: pattern.stats
        }, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_user_trades
 * Get trades for a user with optional filters
 */
server.tool(
  'get_user_trades',
  'Get trading history for a user. Can filter by symbol, date range, or status.',
  {
    userId: {
      type: 'string',
      description: 'MongoDB ObjectId of the user'
    },
    symbol: {
      type: 'string',
      description: 'Optional: Filter by stock symbol'
    },
    status: {
      type: 'string',
      description: 'Optional: Filter by status (OPEN, CLOSED, CANCELLED)'
    },
    limit: {
      type: 'number',
      description: 'Optional: Maximum number of trades to return (default 20)'
    }
  },
  async ({ userId, symbol, status, limit = 20 }) => {
    const query = { userId };
    if (symbol) query.symbol = symbol;
    if (status) query.orderStatus = status;

    const trades = await Trade.find(query)
      .sort({ entryTime: -1 })
      .limit(limit)
      .lean();

    const summary = trades.map(t => ({
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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          count: trades.length,
          trades: summary
        }, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_trade_context
 * Get full context for a specific trade including pattern info
 */
server.tool(
  'get_trade_context',
  'Get complete context for a specific trade, including the market pattern at entry time.',
  {
    tradeId: {
      type: 'string',
      description: 'MongoDB ObjectId of the trade'
    }
  },
  async ({ tradeId }) => {
    const trade = await Trade.findById(tradeId).lean();
    
    if (!trade) {
      return {
        content: [{
          type: 'text',
          text: 'Trade not found'
        }],
        isError: true
      };
    }

    let pattern = null;
    if (trade.patternId) {
      pattern = await Pattern.findOne({ patternId: trade.patternId }).lean();
    }

    const context = {
      trade: {
        id: trade._id.toString(),
        symbol: trade.symbol,
        action: trade.tradeType,
        entryPrice: trade.entryPrice,
        quantity: trade.quantity,
        entryTime: trade.entryTime,
        exitPrice: trade.exitPrice,
        exitTime: trade.exitTime,
        pnl: trade.pnl,
        status: trade.orderStatus,
        productType: trade.productType,
        broker: trade.broker
      },
      pattern: pattern ? {
        id: pattern.patternId,
        name: pattern.name,
        description: pattern.description,
        characteristics: pattern.characteristics,
        risks: pattern.risks
      } : null
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(context, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_user_pattern_stats
 * Get user's historical performance grouped by pattern
 */
server.tool(
  'get_user_pattern_stats',
  'Get a user\'s trading performance statistics grouped by market pattern. Shows win rate and trade count per pattern.',
  {
    userId: {
      type: 'string',
      description: 'MongoDB ObjectId of the user'
    }
  },
  async ({ userId }) => {
    const trades = await Trade.find({
      userId,
      orderStatus: 'CLOSED',
      pnl: { $ne: null },
      patternId: { $exists: true, $ne: null }
    }).lean();

    const stats = {};
    
    for (const trade of trades) {
      const pid = trade.patternId;
      if (!stats[pid]) {
        stats[pid] = { trades: 0, wins: 0, totalPnl: 0 };
      }
      stats[pid].trades++;
      if (trade.pnl > 0) stats[pid].wins++;
      stats[pid].totalPnl += trade.pnl;
    }

    // Calculate win rates
    const result = {};
    for (const [patternId, data] of Object.entries(stats)) {
      result[patternId] = {
        trades: data.trades,
        wins: data.wins,
        winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
        totalPnl: Math.round(data.totalPnl * 100) / 100
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_open_positions
 * Get user's current open positions
 */
server.tool(
  'get_open_positions',
  'Get all open positions (holdings) for a user.',
  {
    userId: {
      type: 'string',
      description: 'MongoDB ObjectId of the user'
    }
  },
  async ({ userId }) => {
    const positions = await Position.find({ 
      userId, 
      quantity: { $gt: 0 } 
    }).lean();

    const summary = positions.map(p => ({
      symbol: p.symbol,
      exchange: p.exchange,
      quantity: p.quantity,
      avgBuyPrice: p.avgBuyPrice,
      totalCost: p.totalCost
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          count: positions.length,
          positions: summary
        }, null, 2)
      }]
    };
  }
);

/**
 * Tool: get_trading_summary
 * Get overall trading summary for a user
 */
server.tool(
  'get_trading_summary',
  'Get overall trading performance summary for a user including win rate, total P&L, and trade count.',
  {
    userId: {
      type: 'string',
      description: 'MongoDB ObjectId of the user'
    }
  },
  async ({ userId }) => {
    const trades = await Trade.find({
      userId,
      orderStatus: 'CLOSED',
      pnl: { $ne: null }
    }).lean();

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalTrades,
          winningTrades: wins,
          losingTrades: losses,
          winRate: totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0,
          totalPnl: Math.round(totalPnl * 100) / 100,
          avgPnl: totalTrades > 0 ? Math.round((totalPnl / totalTrades) * 100) / 100 : 0
        }, null, 2)
      }]
    };
  }
);

// ============ RESOURCES ============

/**
 * Resource: Pattern definitions
 */
server.resource(
  'patterns://all',
  'All market behavior patterns',
  async () => {
    const patterns = await Pattern.find({}).lean();
    
    let text = '# Market Behavior Patterns\n\n';
    for (const p of patterns) {
      text += `## ${p.patternId}: ${p.name}\n`;
      text += `${p.description}\n\n`;
      text += `**Characteristics:**\n`;
      for (const c of p.characteristics) {
        text += `- ${c}\n`;
      }
      text += `\n**Risks:**\n`;
      for (const r of p.risks) {
        text += `- ${r}\n`;
      }
      text += `\n---\n\n`;
    }

    return {
      contents: [{
        uri: 'patterns://all',
        mimeType: 'text/markdown',
        text
      }]
    };
  }
);

// ============ START SERVER ============

const main = async () => {
  // Connect to database
  await connectDB();
  
  // Start MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Trading Journal MCP Server running');
};

main().catch(console.error);
