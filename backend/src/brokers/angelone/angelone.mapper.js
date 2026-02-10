/**
 * Map Angel One trade response to canonical Trade model
 * 
 * BUY trades: price goes to entryPrice
 * SELL trades: price goes to exitPrice
 */
import { normalizeSymbol } from '../../services/symbolLookup.service.js';

export const mapAngelOneTradeToTradeModel = (angelTrade, userId) => {
  // Debug: log the raw trade data to see field names
  console.log('Raw Angel One Trade:', JSON.stringify(angelTrade, null, 2));

  // Map product type
  const productTypeMap = {
    'DELIVERY': 'DELIVERY',
    'CARRYFORWARD': 'DELIVERY',
    'MARGIN': 'MARGIN',
    'INTRADAY': 'INTRADAY',
    'BO': 'BO',
    'CO': 'CO'
  };

  // Parse date from various possible fields
  const parseTradeTime = () => {
    const timeFields = ['filltime', 'updatetime', 'orderupdatetime', 'exchorderupdatetime', 'exchtime'];
    for (const field of timeFields) {
      if (angelTrade[field]) {
        const parsed = new Date(angelTrade[field]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    // Fallback to current time if no valid date found
    console.log('Warning: No valid date found in Angel One trade, using current time');
    return new Date();
  };

  // Parse quantity from various possible fields
  const quantityFields = [
    'fillsize', 'quantity', 'filledshares', 'fillquantity', 
    'qty', 'filled_quantity', 'tradedquantity', 'tradedqty'
  ];
  let parsedQuantity = 0;
  for (const field of quantityFields) {
    const val = parseInt(angelTrade[field]);
    if (val > 0) {
      parsedQuantity = val;
      break;
    }
  }
  if (parsedQuantity === 0) {
    parsedQuantity = 1;
  }

  // Parse price from various possible fields
  const priceFields = ['fillprice', 'averageprice', 'price', 'tradedprice', 'tradedPrice'];
  let parsedPrice = 0;
  for (const field of priceFields) {
    const val = parseFloat(angelTrade[field]);
    if (val > 0) {
      parsedPrice = val;
      break;
    }
  }

  const tradeTime = parseTradeTime();
  const isSell = angelTrade.transactiontype === 'SELL';

  return {
    userId,
    broker: "ANGELONE",

    // Use tradeid if available, otherwise orderid
    brokerOrderId: String(angelTrade.tradeid || angelTrade.orderid || angelTrade.uniqueorderid || Date.now()),

    symbol: normalizeSymbol(angelTrade.tradingsymbol || angelTrade.symbolname),
    exchange: angelTrade.exchange || "NSE",
    segment: angelTrade.exchange === "NSE" ? "EQUITY" : "EQUITY",

    tradeType: angelTrade.transactiontype, // BUY or SELL
    productType: productTypeMap[angelTrade.producttype] || "DELIVERY",

    quantity: parsedQuantity,
    
    // BUY: price is entry, SELL: price is exit
    entryPrice: isSell ? null : parsedPrice,
    entryTime: isSell ? null : tradeTime,
    exitPrice: isSell ? parsedPrice : null,
    exitTime: isSell ? tradeTime : null,

    orderStatus: isSell ? "CLOSED" : "OPEN",
    pnl: null  // Will be calculated in position service
  };
};
