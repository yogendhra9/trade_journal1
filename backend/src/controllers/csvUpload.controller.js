/**
 * CSV Upload Controller
 * 
 * Handles trade import via CSV file upload
 */

import multer from 'multer';
import * as csvParser from '../services/csvParser.service.js';
import * as tradeService from '../services/trade.service.js';
import * as positionService from '../services/position.service.js';
import Trade from '../models/Trade.model.js';

// Multer config - store in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
}).single('file');

/**
 * POST /trades/upload
 * Upload CSV file with trades
 */
export const uploadTrades = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    try {
      const userId = req.user.userId;
      const broker = req.body.broker || null; // Optional: DHAN or ANGELONE
      
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const trades = csvParser.parseTradeCSV(csvContent, userId, broker);
      
      console.log(`Parsed ${trades.length} trades from CSV`);
      
      const results = {
        total: trades.length,
        synced: 0,
        skipped: 0,
        errors: []
      };
      
      // Upsert each trade
      for (const tradeData of trades) {
        try {
          const { trade, created } = await tradeService.upsertTrade(tradeData);
          
          if (created) {
            results.synced++;
            
            // Process P&L
            const { pnl } = await positionService.processTradeForPnL(trade);
            if (pnl !== null) {
              await Trade.findByIdAndUpdate(trade._id, { pnl, orderStatus: 'CLOSED' });
            }
          } else {
            results.skipped++;
          }
        } catch (error) {
          results.errors.push({
            symbol: tradeData.symbol,
            error: error.message
          });
        }
      }
      
      res.json({
        message: 'CSV import complete',
        results
      });
      
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ message: error.message });
    }
  });
};
