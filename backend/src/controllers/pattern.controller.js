/**
 * Pattern Controller
 * 
 * API endpoints for pattern lookup and management.
 */

import * as patternMatchService from '../services/patternMatch.service.js';

/**
 * GET /patterns - Get all pattern definitions
 */
export const getAllPatterns = async (req, res) => {
  try {
    const patterns = await patternMatchService.getAllPatterns();
    
    res.json({
      count: patterns.length,
      patterns
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /patterns/:id - Get a specific pattern
 */
export const getPatternById = async (req, res) => {
  try {
    const pattern = await patternMatchService.getPatternById(req.params.id);
    
    if (!pattern) {
      return res.status(404).json({ message: 'Pattern not found' });
    }
    
    res.json(pattern);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /patterns/prompt - Get formatted patterns for LLM prompt
 */
export const getPatternsForPrompt = async (req, res) => {
  try {
    const prompt = await patternMatchService.formatPatternsForPrompt();
    
    res.json({
      prompt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /patterns/load - Load patterns from ML artifacts
 */
export const loadPatterns = async (req, res) => {
  try {
    await patternMatchService.loadArtifacts();
    const patterns = await patternMatchService.getAllPatterns();
    
    res.json({
      message: 'Patterns loaded successfully',
      count: patterns.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /patterns/batch-assign - Assign patterns to all trades without patterns
 */
export const batchAssignPatterns = async (req, res) => {
  try {
    const result = await patternMatchService.batchAssignPatterns(req.user.userId);
    
    res.json({
      message: 'Patterns assigned successfully',
      assigned: result.assigned,
      failed: result.failed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
