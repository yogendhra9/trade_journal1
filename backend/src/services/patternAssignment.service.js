/**
 * Pattern Assignment Service
 * 
 * Assigns market patterns to trades using historical data from IndianAPI.
 */

import * as indianApi from './indianApi.service.js';
import Trade from '../models/Trade.model.js';

/**
 * Assign pattern to a single trade
 */
export const assignPatternToTrade = async (tradeId) => {
  const trade = await Trade.findById(tradeId);
  if (!trade) {
    throw new Error('Trade not found');
  }
  
  if (trade.patternId) {
    return { 
      tradeId, 
      patternId: trade.patternId, 
      message: 'Pattern already assigned' 
    };
  }
  
  try {
    // Fetch historical data for the stock
    const historical = await indianApi.getHistoricalData(trade.symbol, '1m');
    
    // Calculate features
    const features = indianApi.calculateFeatures(historical);
    
    if (!features) {
      return { 
        tradeId, 
        patternId: null, 
        message: 'Insufficient historical data' 
      };
    }
    
    // Match to pattern (now async)
    const patternId = await indianApi.matchToPattern(features);
    
    // Update trade
    trade.patternId = patternId;
    await trade.save();
    
    return {
      tradeId,
      patternId,
      features: {
        volatility10: features.volatility10,
        trend10: features.trend10,
        volumeRatio: features.volumeRatio,
        momentum10: features.momentum10
      },
      message: 'Pattern assigned successfully'
    };
  } catch (error) {
    console.error('Pattern assignment error:', error.message);
    return {
      tradeId,
      patternId: null,
      error: error.message
    };
  }
};

/**
 * Assign patterns to all trades (re-classify)
 */
export const assignPatternsToAllTrades = async (userId) => {
  // Get ALL trades for re-classification (clear existing patterns)
  const trades = await Trade.find({ userId });
  
  const results = [];
  
  for (const trade of trades) {
    // Clear existing pattern first
    trade.patternId = null;
    await trade.save();
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await assignPatternToTrade(trade._id);
    results.push(result);
  }
  
  return {
    processed: results.length,
    results
  };
};

/**
 * Get pattern for a symbol at current time
 */
export const getCurrentPattern = async (symbol) => {
  try {
    const historical = await indianApi.getHistoricalData(symbol, '1m');
    const features = indianApi.calculateFeatures(historical);
    
    if (!features) {
      return { pattern: null, message: 'Insufficient data' };
    }
    
    const patternId = await indianApi.matchToPattern(features);
    
    return {
      symbol,
      patternId,
      features: {
        volatility10: features.volatility10,
        trend10: features.trend10,
        volumeRatio: features.volumeRatio
      }
    };
  } catch (error) {
    return {
      symbol,
      patternId: null,
      error: error.message
    };
  }
};
