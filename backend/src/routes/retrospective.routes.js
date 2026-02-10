import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as retrospectiveController from '../controllers/retrospective.controller.js';

const router = express.Router();

// Health check - is Ollama available?
router.get('/health', retrospectiveController.checkOllamaHealth);

// List available models
router.get('/models', retrospectiveController.listModels);

// Analyze a specific trade (requires auth)
router.post('/analyze/:tradeId', authMiddleware, retrospectiveController.analyzeTradeById);

// Get quick insight about a pattern
router.get('/pattern/:patternId/insight', retrospectiveController.getPatternInsight);

export default router;
