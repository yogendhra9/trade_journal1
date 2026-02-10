/**
 * Pattern Assignment Controller
 */

import * as patternAssignment from '../services/patternAssignment.service.js';

/**
 * POST /patterns/assign/:tradeId
 * Assign pattern to a specific trade
 */
export const assignToTrade = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const result = await patternAssignment.assignPatternToTrade(tradeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /patterns/assign-all
 * Assign patterns to all trades without patterns
 */
export const assignToAllTrades = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await patternAssignment.assignPatternsToAllTrades(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /patterns/current/:symbol
 * Get current pattern for a symbol
 */
export const getCurrentPattern = async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await patternAssignment.getCurrentPattern(symbol);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
