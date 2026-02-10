export const TRADE_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL'
};

// Product types - includes all Dhan types
export const PRODUCT_TYPES = {
  INTRADAY: 'INTRADAY',
  DELIVERY: 'DELIVERY',  // CNC in Dhan
  CNC: 'CNC',            // Cash and Carry (Dhan's term for delivery)
  MARGIN: 'MARGIN',
  MTF: 'MTF',            // Margin Trading Facility
  CO: 'CO',              // Cover Order
  BO: 'BO'               // Bracket Order
};

export const ORDER_STATUSES = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

export const BROKERS = {
  DHAN: 'DHAN'
};

// Mapping from broker-specific product types to canonical types
export const PRODUCT_TYPE_MAP = {
  DHAN: {
    CNC: 'CNC',
    INTRADAY: 'INTRADAY',
    MARGIN: 'MARGIN',
    MTF: 'MTF',
    CO: 'CO',
    BO: 'BO'
  }
};
