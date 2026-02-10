import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as chatController from '../controllers/chat.controller.js';

const router = express.Router();

// Health check - is Ollama available?
router.get('/health', chatController.healthCheck);

// Send a chat message (requires auth)
router.post('/', authMiddleware, chatController.sendMessage);

export default router;
