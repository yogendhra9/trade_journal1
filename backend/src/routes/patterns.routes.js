import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as patternController from '../controllers/pattern.controller.js';
import * as patternAssignmentController from '../controllers/patternAssignment.controller.js';

const router = express.Router();

// Get all patterns (public - for reference)
router.get('/', patternController.getAllPatterns);

// Get formatted patterns for LLM prompt
router.get('/prompt', patternController.getPatternsForPrompt);

// Load patterns from ML artifacts (admin action)
router.post('/load', authMiddleware, patternController.loadPatterns);

// Pattern assignment endpoints
router.post('/assign/:tradeId', authMiddleware, patternAssignmentController.assignToTrade);
router.post('/assign-all', authMiddleware, patternAssignmentController.assignToAllTrades);
router.get('/current/:symbol', patternAssignmentController.getCurrentPattern);

// Get specific pattern (must be last due to :id param)
router.get('/:id', patternController.getPatternById);

export default router;

