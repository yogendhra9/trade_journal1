import Position from '../models/Position.model.js';
import Trade from '../models/Trade.model.js';

/**
 * Update position and calculate PnL for a trade
 * 
 * BUY: Add to position using entryPrice, update average cost
 * SELL: Calculate PnL using exitPrice and average buy price, reduce position
 * 
 * Returns: { pnl: number | null, position: Position }
 */
export const processTradeForPnL = async (trade) => {
  const { userId, symbol, exchange, tradeType, quantity } = trade;
  
  // Get the price - BUY uses entryPrice, SELL uses exitPrice
  const price = tradeType === 'SELL' ? trade.exitPrice : trade.entryPrice;

  // Find or create position
  let position = await Position.findOne({ userId, symbol, exchange });

  if (!position) {
    position = new Position({
      userId,
      symbol,
      exchange,
      quantity: 0,
      avgBuyPrice: 0,
      totalCost: 0
    });
  }

  let pnl = null;

  if (tradeType === 'BUY') {
    // Add to position with weighted average cost
    const newTotalCost = position.totalCost + (quantity * price);
    const newQuantity = position.quantity + quantity;
    
    position.quantity = newQuantity;
    position.totalCost = newTotalCost;
    position.avgBuyPrice = newQuantity > 0 ? newTotalCost / newQuantity : 0;
    
  } else if (tradeType === 'SELL') {
    // Calculate PnL if we have a position
    if (position.quantity > 0 && position.avgBuyPrice > 0 && price) {
      // PnL = (Sell Price - Avg Buy Price) × Quantity Sold
      pnl = (price - position.avgBuyPrice) * quantity;
      pnl = Number(pnl.toFixed(2));

      // Reduce position
      const soldQuantity = Math.min(quantity, position.quantity);
      const remainingQuantity = position.quantity - soldQuantity;
      
      position.quantity = remainingQuantity;
      position.totalCost = remainingQuantity * position.avgBuyPrice;
      
      // Reset avg price if position is fully closed
      if (remainingQuantity === 0) {
        position.avgBuyPrice = 0;
      }
    } else {
      // Short selling (selling without position) - track as negative position
      // For now, we'll just record the sell with null PnL
      pnl = null;
    }
  }

  position.lastTradeId = trade._id;
  position.lastUpdated = new Date();
  await position.save();

  return { pnl, position };
};

/**
 * Get all positions for a user
 */
export const getPositions = async (userId) => {
  return await Position.find({ userId, quantity: { $gt: 0 } });
};

/**
 * Get position for a specific symbol
 */
export const getPosition = async (userId, symbol, exchange) => {
  return await Position.findOne({ userId, symbol, exchange });
};

/**
 * Recalculate all positions from trade history
 * Useful if positions get out of sync
 */
export const recalculatePositions = async (userId) => {
  // Clear existing positions
  await Position.deleteMany({ userId });

  // Get all trades sorted by time (use entryTime for BUY, exitTime for SELL)
  const trades = await Trade.find({ userId })
    .sort({ createdAt: 1 }); // Sort by when the trade was created

  // Process each trade
  for (const trade of trades) {
    const { pnl } = await processTradeForPnL(trade);
    
    // Update trade with calculated PnL if it's a SELL
    if (trade.tradeType === 'SELL' && pnl !== null) {
      await Trade.findByIdAndUpdate(trade._id, { 
        pnl,
        orderStatus: 'CLOSED'
      });
    }
  }

  return await getPositions(userId);
};
