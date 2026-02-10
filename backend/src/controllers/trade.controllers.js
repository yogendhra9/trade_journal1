import * as tradeService from '../services/trade.service.js';

/**
 * POST /trades - Create a new trade
 */
export const createTrade = async (req, res) => {
  try {
    const tradeData = {
      ...req.body,
      userId: req.user.userId
    };

    const trade = await tradeService.createTrade(tradeData);
    
    res.status(201).json({
      message: 'Trade created successfully',
      trade
    });
  } catch (error) {
    // Handle duplicate key error (MongoDB E11000)
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'Trade with this brokerOrderId already exists' 
      });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /trades - Get all trades for the user
 */
export const getAllTrades = async (req, res) => {
  try {
    const { symbol, orderStatus, productType, startDate, endDate } = req.query;
    
    const trades = await tradeService.findTradesByUser(req.user.userId, {
      symbol,
      orderStatus,
      productType,
      startDate,
      endDate
    });

    res.json({
      count: trades.length,
      trades
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /trades/:id - Get a single trade
 */
export const getTradeById = async (req, res) => {
  try {
    const trade = await tradeService.findTradeById(
      req.params.id, 
      req.user.userId
    );

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({ trade });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /trades/:id - Update a trade
 */
export const updateTrade = async (req, res) => {
  try {
    const trade = await tradeService.updateTrade(
      req.params.id,
      req.user.userId,
      req.body
    );

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({
      message: 'Trade updated successfully',
      trade
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /trades/:id - Delete a trade
 */
export const deleteTrade = async (req, res) => {
  try {
    const trade = await tradeService.deleteTrade(
      req.params.id,
      req.user.userId
    );

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /trades/:id/reflection - Add/update trade reflection
 */
export const updateReflection = async (req, res) => {
  try {
    const { entryReason, entryNotes, confidence, postTradeNotes } = req.body;
    
    const reflection = {
      entryReason: entryReason || null,
      entryNotes: entryNotes || null,
      confidence: confidence || null,
      postTradeNotes: postTradeNotes || null
    };

    const trade = await tradeService.updateTrade(
      req.params.id,
      req.user.userId,
      { reflection }
    );

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({
      message: 'Reflection saved',
      reflection: trade.reflection
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /trades/:id/analysis - Save AI analysis
 */
export const saveAnalysis = async (req, res) => {
  try {
    const { analysis } = req.body;
    
    const trade = await tradeService.updateTrade(
      req.params.id,
      req.user.userId,
      { analysis }
    );

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({
      message: 'Analysis saved',
      analysis: trade.analysis
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /trades/:id/analysis - Delete AI analysis
 */
export const deleteAnalysis = async (req, res) => {
  try {
    const trade = await tradeService.updateTrade(
      req.params.id,
      req.user.userId,
      { analysis: null }
    );

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json({ message: 'Analysis deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
