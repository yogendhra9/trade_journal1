import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as tradeController from '../controllers/trade.controllers.js';
import * as csvUploadController from '../controllers/csvUpload.controller.js';

const router = express.Router();

// All routes are protected by auth middleware
router.use(authMiddleware);

// Trade CRUD routes
router.post('/', tradeController.createTrade);
router.get('/', tradeController.getAllTrades);
router.get('/:id', tradeController.getTradeById);
router.put('/:id', tradeController.updateTrade);
router.delete('/:id', tradeController.deleteTrade);

// Reflection route
router.put('/:id/reflection', tradeController.updateReflection);

// Analysis routes
router.put('/:id/analysis', tradeController.saveAnalysis);
router.delete('/:id/analysis', tradeController.deleteAnalysis);

// CSV Upload route
router.post('/upload', csvUploadController.uploadTrades);

export default router;
