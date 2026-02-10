/**
 * Retrospective Analysis Controller
 * 
 * API endpoints for LLM-powered trade analysis.
 */

import * as retrospectiveService from '../services/retrospective.service.js';
import * as ollamaService from '../services/ollama.service.js';

/**
 * POST /retrospective/analyze/:tradeId
 * 
 * Generate retrospective analysis for a trade
 * 
 * Body (optional):
 * {
 *   reflection: {
 *     entryReason: "Why I entered the trade",
 *     targetPrice: 1900,
 *     followedPlan: true
 *   }
 * }
 */
export const analyzeTradeById = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.userId;
    const { reflection } = req.body || {};

    const result = await retrospectiveService.analyzeTradeRetrospective(
      tradeId,
      userId,
      reflection
    );

    res.json({
      success: true,
      analysis: result.analysis,
      context: result.context,
      meta: {
        model: result.model,
        generationTimeNs: result.generationTime
      }
    });
  } catch (error) {
    if (error.message === 'Trade not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /retrospective/pattern/:patternId/insight
 * 
 * Get quick LLM insight about a pattern
 */
export const getPatternInsight = async (req, res) => {
  try {
    const { patternId } = req.params;

    const result = await retrospectiveService.getPatternInsight(patternId);

    res.json(result);
  } catch (error) {
    if (error.message === 'Pattern not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /retrospective/health
 * 
 * Check if Ollama is available
 */
export const checkOllamaHealth = async (req, res) => {
  try {
    const health = await ollamaService.healthCheck();
    
    res.json({
      ollama: health,
      ready: health.available
    });
  } catch (error) {
    res.status(500).json({ 
      ollama: { available: false, error: error.message },
      ready: false
    });
  }
};

/**
 * GET /retrospective/models
 * 
 * List available Ollama models
 */
export const listModels = async (req, res) => {
  try {
    const models = await ollamaService.listModels();
    
    res.json({
      models: models.map(m => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
