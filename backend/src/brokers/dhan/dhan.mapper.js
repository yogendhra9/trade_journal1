/**
 * Map Dhan Trade History response to canonical Trade model
 * 
 * Trade History API returns slightly different format than Trade Book.
 * BUY trades: price goes to entryPrice
 * SELL trades: price goes to exitPrice
 */
export const mapDhanTradeToTradeModel = (dhanTrade, userId) => {
  const [exchange, segment] = dhanTrade.exchangeSegment.split("_");

  // IMPORTANT: Use tradingSymbol (NSE/BSE code) NOT customSymbol (display name)
  // customSymbol = "Mishtann Foods", tradingSymbol = "MISHTANN"
  // We need consistent symbols for P&L matching across trades
  const symbol = dhanTrade.tradingSymbol || dhanTrade.securityId || dhanTrade.customSymbol;

  // Parse trade time - prefer exchangeTime for historical trades
  let tradeTime;
  if (dhanTrade.exchangeTime && dhanTrade.exchangeTime !== "NA") {
    tradeTime = new Date(dhanTrade.exchangeTime);
  } else if (dhanTrade.updateTime && dhanTrade.updateTime !== "NA") {
    tradeTime = new Date(dhanTrade.updateTime);
  } else {
    tradeTime = new Date(); // fallback to now
  }

  const isSell = dhanTrade.transactionType === 'SELL';

  return {
    userId,
    broker: "DHAN",

    brokerOrderId: dhanTrade.orderId,

    symbol,
    exchange,
    segment,

    tradeType: dhanTrade.transactionType,
    productType: dhanTrade.productType,

    quantity: dhanTrade.tradedQuantity,
    
    // BUY: price is entry, SELL: price is exit
    entryPrice: isSell ? null : dhanTrade.tradedPrice,
    entryTime: isSell ? null : tradeTime,
    exitPrice: isSell ? dhanTrade.tradedPrice : null,
    exitTime: isSell ? tradeTime : null,

    orderStatus: isSell ? "CLOSED" : "OPEN",
    pnl: null  // Will be calculated in position service
  };
};
