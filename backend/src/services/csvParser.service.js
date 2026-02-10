/**
 * CSV Parser Service
 * 
 * Parses CSV files from Angel One and Dhan contract notes/trade history
 * into canonical trade format.
 */

/**
 * Parse CSV string to rows
 */
const parseCSVToRows = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      rows.push(row);
    }
  }
  
  return rows;
};

/**
 * Parse Angel One contract note CSV
 * 
 * Expected columns: trade no, trade date, trade time, symbol, buy/sell, quantity, rate, amount
 */
export const parseAngelOneCSV = (csvContent, userId) => {
  const rows = parseCSVToRows(csvContent);
  const trades = [];
  
  for (const row of rows) {
    try {
      // Find common column variations
      const tradeId = row['trade no'] || row['tradeno'] || row['order id'] || Date.now().toString();
      const tradeDate = row['trade date'] || row['date'] || row['settlement date'];
      const tradeTime = row['trade time'] || row['time'] || '00:00:00';
      const symbol = row['symbol'] || row['scrip'] || row['trading symbol'] || row['script'];
      const tradeType = (row['buy/sell'] || row['type'] || row['transaction type'] || '').toUpperCase();
      const quantity = parseInt(row['quantity'] || row['qty'] || row['traded qty'] || '0');
      const price = parseFloat(row['rate'] || row['price'] || row['traded price'] || '0');
      
      if (!symbol || !tradeType || quantity <= 0) continue;
      
      const isSell = tradeType.includes('SELL') || tradeType === 'S';
      const dateTime = new Date(`${tradeDate} ${tradeTime}`);
      
      trades.push({
        userId,
        broker: 'ANGELONE',
        brokerOrderId: `AO_CSV_${tradeId}`,
        symbol: symbol.toUpperCase(),
        exchange: 'NSE',
        segment: 'EQUITY',
        tradeType: isSell ? 'SELL' : 'BUY',
        productType: 'DELIVERY',
        quantity,
        entryPrice: isSell ? null : price,
        entryTime: isSell ? null : dateTime,
        exitPrice: isSell ? price : null,
        exitTime: isSell ? dateTime : null,
        orderStatus: isSell ? 'CLOSED' : 'OPEN',
        pnl: null
      });
    } catch (error) {
      console.log('Skipping row due to parse error:', error.message);
    }
  }
  
  return trades;
};

/**
 * Parse Dhan trade history CSV
 * 
 * Expected columns: Order ID, Trade Date, Symbol, Transaction Type, Quantity, Price
 */
export const parseDhanCSV = (csvContent, userId) => {
  const rows = parseCSVToRows(csvContent);
  const trades = [];
  
  for (const row of rows) {
    try {
      const orderId = row['order id'] || row['orderid'] || row['trade id'] || Date.now().toString();
      const tradeDate = row['trade date'] || row['date'] || row['exchange time'];
      const symbol = row['symbol'] || row['trading symbol'] || row['scrip'];
      const tradeType = (row['transaction type'] || row['type'] || row['buy/sell'] || '').toUpperCase();
      const quantity = parseInt(row['quantity'] || row['qty'] || row['traded quantity'] || '0');
      const price = parseFloat(row['price'] || row['traded price'] || row['rate'] || '0');
      
      if (!symbol || !tradeType || quantity <= 0) continue;
      
      const isSell = tradeType.includes('SELL') || tradeType === 'S';
      const dateTime = new Date(tradeDate);
      
      trades.push({
        userId,
        broker: 'DHAN',
        brokerOrderId: `DHAN_CSV_${orderId}`,
        symbol: symbol.toUpperCase(),
        exchange: 'NSE',
        segment: 'EQUITY',
        tradeType: isSell ? 'SELL' : 'BUY',
        productType: 'DELIVERY',
        quantity,
        entryPrice: isSell ? null : price,
        entryTime: isSell ? null : dateTime,
        exitPrice: isSell ? price : null,
        exitTime: isSell ? dateTime : null,
        orderStatus: isSell ? 'CLOSED' : 'OPEN',
        pnl: null
      });
    } catch (error) {
      console.log('Skipping row due to parse error:', error.message);
    }
  }
  
  return trades;
};

/**
 * Auto-detect broker from CSV content and parse
 */
export const parseTradeCSV = (csvContent, userId, broker = null) => {
  const content = csvContent.toLowerCase();
  
  // Auto-detect if broker not specified
  if (!broker) {
    if (content.includes('angel') || content.includes('smartapi')) {
      broker = 'ANGELONE';
    } else if (content.includes('dhan')) {
      broker = 'DHAN';
    } else {
      // Default to generic parsing
      broker = 'DHAN';
    }
  }
  
  if (broker === 'ANGELONE') {
    return parseAngelOneCSV(csvContent, userId);
  } else {
    return parseDhanCSV(csvContent, userId);
  }
};
