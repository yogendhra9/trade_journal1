import Trade from '../models/Trade.model.js';

/**
 * Create a new trade
 */
export const createTrade = async (tradeData) => {
  const trade = new Trade(tradeData);
  return await trade.save();
};

/**
 * Find all trades for a user with optional filters
 */
export const findTradesByUser = async (userId, filters = {}) => {
  const query = { userId };

  if (filters.symbol) {
    query.symbol = filters.symbol;
  }

  if (filters.orderStatus) {
    query.orderStatus = filters.orderStatus;
  }

  if (filters.productType) {
    query.productType = filters.productType;
  }

  if (filters.startDate || filters.endDate) {
    query.entryTime = {};
    if (filters.startDate) {
      query.entryTime.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.entryTime.$lte = new Date(filters.endDate);
    }
  }

  return await Trade.find(query).sort({ entryTime: -1 });
};

/**
 * Find a single trade by ID (scoped to user)
 */
export const findTradeById = async (tradeId, userId) => {
  return await Trade.findOne({ _id: tradeId, userId });
};

/**
 * Update a trade (scoped to user)
 */
export const updateTrade = async (tradeId, userId, updates) => {
  // Prevent updating immutable fields
  const { userId: _, broker: __, brokerOrderId: ___, ...safeUpdates } = updates;
  
  return await Trade.findOneAndUpdate(
    { _id: tradeId, userId },
    safeUpdates,
    { new: true, runValidators: true }
  );
};

/**
 * Delete a trade (scoped to user)
 */
export const deleteTrade = async (tradeId, userId) => {
  return await Trade.findOneAndDelete({ _id: tradeId, userId });
};

/**
 * Upsert a trade - idempotent insert using brokerOrderId
 * Returns { trade, created: boolean }
 */
export const upsertTrade = async (tradeData) => {
  const { userId, brokerOrderId } = tradeData;
  
  const existingTrade = await Trade.findOne({ userId, brokerOrderId });
  
  if (existingTrade) {
    return { trade: existingTrade, created: false };
  }
  
  const trade = await createTrade(tradeData);
  return { trade, created: true };
};

/**
 * Get closed trades with PnL for analytics
 */
export const getClosedTradesWithPnl = async (userId, filters = {}) => {
  const query = {
    userId,
    orderStatus: 'CLOSED',
    pnl: { $ne: null }
  };

  if (filters.symbol) {
    query.symbol = filters.symbol;
  }

  if (filters.productType) {
    query.productType = filters.productType;
  }

  if (filters.startDate || filters.endDate) {
    query.entryTime = {};
    if (filters.startDate) {
      query.entryTime.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.entryTime.$lte = new Date(filters.endDate);
    }
  }

  return await Trade.find(query).sort({ entryTime: -1 });
};
