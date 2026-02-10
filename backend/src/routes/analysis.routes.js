import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as analysisController from '../controllers/analysis.controller.js';

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

// Analytics endpoints
router.get('/summary', analysisController.getSummary);
router.get('/performance', analysisController.getPerformance);

// LLM Analysis storage endpoints
router.post('/save', analysisController.saveAnalysis);
router.get('/saved/:symbol', analysisController.getSavedAnalyses);
router.delete('/saved/:id', analysisController.deleteSavedAnalysis);

// Generate AI analysis for a trade
router.post('/generate', analysisController.generateTradeAnalysis);

export default router;

