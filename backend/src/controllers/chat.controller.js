/**
 * Chat Controller
 * 
 * API endpoints for chat with LLM.
 */

import * as chatService from '../services/chat.service.js';

/**
 * POST /chat
 * 
 * Send a message and get LLM response with tool calling.
 * 
 * Body:
 * {
 *   message: "Why did my RELIANCE trade fail?",
 *   history: [{ role: "user", content: "..."}, ...] // Optional
 * }
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const result = await chatService.chat(userId, message, history);

    res.json({
      success: true,
      response: result.response,
      toolsUsed: result.toolsUsed,
      model: result.model
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

/**
 * GET /chat/health
 * 
 * Check if Ollama is available
 */
export const healthCheck = async (req, res) => {
  try {
    const health = await chatService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
