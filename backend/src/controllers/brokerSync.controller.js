import { getBrokerAdapter, getSupportedBrokers } from '../brokers/brokerRegistry.js';
import * as tradeService from '../services/trade.service.js';
import * as positionService from '../services/position.service.js';
import * as patternAssignment from '../services/patternAssignment.service.js';
import * as dhanOAuth from '../brokers/dhan/dhan.oauth.js';
import * as angelOneAuth from '../brokers/angelone/angelone.auth.js';
import Trade from '../models/Trade.model.js';

/**
 * POST /broker/sync - Sync trades from a broker
 * 
 * Flow:
 * 1. Fetch trades from broker
 * 2. Normalize to canonical schema
 * 3. Upsert (deduplicate)
 * 4. Process for position tracking & PnL calculation
 */
export const syncTrades = async (req, res) => {
  try {
    const { broker } = req.body;
    const userId = req.user.userId;

    // Validate request
    if (!broker) {
      return res.status(400).json({ 
        message: 'broker is required',
        supportedBrokers: getSupportedBrokers()
      });
    }

    // Get stored credentials for this broker
    let credentials;
    const brokerUpper = broker.toUpperCase();
    
    if (brokerUpper === 'DHAN') {
      credentials = await dhanOAuth.getCredentials(userId);
    } else if (brokerUpper === 'ANGELONE') {
      credentials = await angelOneAuth.getCredentials(userId);
    }

    if (!credentials) {
      return res.status(401).json({
        message: `${broker} account not connected or token expired. Please reconnect.`,
        reconnectUrl: brokerUpper === 'DHAN' ? '/broker/dhan/connect' : '/broker/angelone/login'
      });
    }

    // Get adapter for the broker
    let adapter;
    try {
      adapter = getBrokerAdapter(broker, { 
        accessToken: credentials.accessToken,
        apiKey: credentials.apiKey,    // Angel One needs apiKey
        clientId: credentials.clientId  // Dhan needs clientId
      });
    } catch (error) {
      return res.status(400).json({ 
        message: error.message,
        supportedBrokers: getSupportedBrokers()
      });
    }

    // Fetch trades from broker
    const rawTrades = await adapter.fetchTrades();

    // Handle case where broker returns no trades
    if (!rawTrades || !Array.isArray(rawTrades) || rawTrades.length === 0) {
      return res.json({
        message: 'Sync completed',
        summary: {
          fetched: 0,
          synced: 0,
          skipped: 0,
          errors: []
        }
      });
    }

    // Sort trades by time to ensure correct position calculation
    rawTrades.sort((a, b) => new Date(a.updateTime) - new Date(b.updateTime));

    // Process each trade
    const results = {
      synced: 0,
      skipped: 0,
      pnlCalculated: 0,
      errors: []
    };

    for (const rawTrade of rawTrades) {
      try {
        // Normalize trade to canonical schema
        const normalizedTrade = adapter.normalizeTrade(rawTrade, userId);
        
        // Upsert (idempotent insert)
        const { trade, created } = await tradeService.upsertTrade(normalizedTrade);
        
        if (created) {
          results.synced++;
          
          // Process for position tracking and PnL calculation
          const { pnl } = await positionService.processTradeForPnL(trade);
          
          // If PnL was calculated (SELL trade with position), update the trade
          if (pnl !== null) {
            await Trade.findByIdAndUpdate(trade._id, { 
              pnl,
              orderStatus: 'CLOSED'
            });
            results.pnlCalculated++;
          }
          
          // Assign pattern to new trade (async, don't block sync)
          patternAssignment.assignPatternToTrade(trade._id)
            .then(result => console.log(`Pattern assigned for ${trade.symbol}:`, result.patternId || 'none'))
            .catch(err => console.log(`Pattern assignment failed for ${trade.symbol}:`, err.message));
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push({
          brokerOrderId: rawTrade.orderId || 'unknown',
          error: error.message
        });
      }
    }

    res.json({
      message: 'Sync completed',
      summary: {
        fetched: rawTrades.length,
        ...results
      }
    });

  } catch (error) {
    // Log full error for debugging
    console.error('Broker sync error:', {
      broker: req.body.broker,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle broker API errors
    if (error.response) {
      const brokerUpper = req.body.broker?.toUpperCase();
      const reconnectUrl = brokerUpper === 'ANGELONE' 
        ? '/broker/angelone/login' 
        : '/broker/dhan/connect';

      if (error.response.status === 401) {
        return res.status(401).json({
          message: 'Broker rejected the token. Please reconnect your account.',
          reconnectUrl,
          brokerError: error.response.data
        });
      }
      
      return res.status(error.response.status || 502).json({
        message: 'Broker API error',
        details: error.response.data || error.message
      });
    }
    
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /broker/recalculate-pnl - Recalculate all positions and PnL from trade history
 */
export const recalculatePnL = async (req, res) => {
  try {
    const positions = await positionService.recalculatePositions(req.user.userId);
    
    res.json({
      message: 'PnL recalculated successfully',
      openPositions: positions.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /broker/positions - Get open positions
 */
export const getPositions = async (req, res) => {
  try {
    const positions = await positionService.getPositions(req.user.userId);
    
    res.json({
      count: positions.length,
      positions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /broker/supported - Get list of supported brokers
 */
export const getSupportedBrokersHandler = (req, res) => {
  res.json({
    brokers: getSupportedBrokers()
  });
};
