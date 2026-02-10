import * as tradeService from './trade.service.js';

/**
 * Get summary analytics for user's closed trades
 * 
 * Returns: totalTrades, winRate, totalPnl, avgPnl
 */
export const getSummary = async (userId, filters = {}) => {
  const trades = await tradeService.getClosedTradesWithPnl(userId, filters);

  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0
    };
  }

  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: Number(((winningTrades.length / trades.length) * 100).toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
    avgPnl: Number((totalPnl / trades.length).toFixed(2))
  };
};

/**
 * Get performance analytics for user's closed trades
 * 
 * Returns: avgHoldingDuration, directionBias, productTypeBreakdown, symbolBreakdown
 */
export const getPerformance = async (userId, filters = {}) => {
  const trades = await tradeService.getClosedTradesWithPnl(userId, filters);

  if (trades.length === 0) {
    return {
      avgHoldingDurationMinutes: 0,
      directionBias: { BUY: 0, SELL: 0, ratio: 0 },
      productTypeBreakdown: {},
      symbolBreakdown: {}
    };
  }

  // Calculate average holding duration (only for trades with exitTime)
  const tradesWithDuration = trades.filter(t => t.exitTime && t.entryTime);
  let avgHoldingDurationMinutes = 0;
  
  if (tradesWithDuration.length > 0) {
    const totalDurationMs = tradesWithDuration.reduce((sum, t) => {
      return sum + (new Date(t.exitTime) - new Date(t.entryTime));
    }, 0);
    avgHoldingDurationMinutes = Number((totalDurationMs / tradesWithDuration.length / 60000).toFixed(2));
  }

  // Direction bias (BUY vs SELL)
  const buyTrades = trades.filter(t => t.tradeType === 'BUY');
  const sellTrades = trades.filter(t => t.tradeType === 'SELL');
  const directionBias = {
    BUY: buyTrades.length,
    SELL: sellTrades.length,
    ratio: sellTrades.length > 0 
      ? Number((buyTrades.length / sellTrades.length).toFixed(2)) 
      : buyTrades.length > 0 ? Infinity : 0
  };

  // Product type breakdown
  const productTypeBreakdown = {};
  for (const trade of trades) {
    if (!productTypeBreakdown[trade.productType]) {
      productTypeBreakdown[trade.productType] = { count: 0, totalPnl: 0, winRate: 0 };
    }
    productTypeBreakdown[trade.productType].count++;
    productTypeBreakdown[trade.productType].totalPnl += trade.pnl;
  }
  
  // Calculate win rate per product type
  for (const type of Object.keys(productTypeBreakdown)) {
    const typeTrades = trades.filter(t => t.productType === type);
    const typeWins = typeTrades.filter(t => t.pnl > 0).length;
    productTypeBreakdown[type].winRate = Number(((typeWins / typeTrades.length) * 100).toFixed(2));
    productTypeBreakdown[type].totalPnl = Number(productTypeBreakdown[type].totalPnl.toFixed(2));
  }

  // Symbol breakdown (top 10 by trade count)
  const symbolMap = {};
  for (const trade of trades) {
    if (!symbolMap[trade.symbol]) {
      symbolMap[trade.symbol] = { count: 0, totalPnl: 0, winRate: 0 };
    }
    symbolMap[trade.symbol].count++;
    symbolMap[trade.symbol].totalPnl += trade.pnl;
  }
  
  // Calculate win rate per symbol and sort by count
  const symbolEntries = Object.entries(symbolMap);
  for (const [symbol, data] of symbolEntries) {
    const symTrades = trades.filter(t => t.symbol === symbol);
    const symWins = symTrades.filter(t => t.pnl > 0).length;
    data.winRate = Number(((symWins / symTrades.length) * 100).toFixed(2));
    data.totalPnl = Number(data.totalPnl.toFixed(2));
  }
  
  // Sort by count descending and take top 10
  const symbolBreakdown = Object.fromEntries(
    symbolEntries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
  );

  return {
    avgHoldingDurationMinutes,
    directionBias,
    productTypeBreakdown,
    symbolBreakdown
  };
};
