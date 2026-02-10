/**
 * Pattern Matching Service
 * 
 * Matches trades to learned market patterns for retrospective analysis.
 * Uses pre-computed cluster centroids from ML pipeline.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Pattern from '../models/Pattern.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for artifacts
let centroids = null;
let scaler = null;
let featureCols = null;
let patternsLoaded = false;

/**
 * Load ML artifacts from disk
 */
export const loadArtifacts = async () => {
  const artifactsDir = path.join(__dirname, '../../ml/artifacts');
  
  try {
    // Load patterns.json
    const patternsPath = path.join(artifactsDir, 'patterns.json');
    if (fs.existsSync(patternsPath)) {
      const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
      
      // Load into MongoDB
      for (const [patternId, pattern] of Object.entries(patternsData)) {
        await Pattern.findOneAndUpdate(
          { patternId },
          {
            patternId,
            name: pattern.name,
            description: pattern.description,
            characteristics: pattern.characteristics,
            risks: pattern.risks,
            centroid: pattern.centroid,
            stats: pattern.stats
          },
          { upsert: true, new: true }
        );
      }
      
      patternsLoaded = true;
      console.log('✓ Patterns loaded from artifacts');
    } else {
      console.warn('⚠ patterns.json not found. Run ML pipeline first.');
    }
    
    // Load feature columns
    const featureColsPath = path.join(artifactsDir, 'feature_cols.json');
    if (fs.existsSync(featureColsPath)) {
      featureCols = JSON.parse(fs.readFileSync(featureColsPath, 'utf-8'));
    }
    
  } catch (error) {
    console.error('Error loading artifacts:', error.message);
  }
};

/**
 * Get all pattern definitions (for LLM system prompt)
 */
export const getAllPatterns = async () => {
  return await Pattern.find({}).lean();
};

/**
 * Get a specific pattern by ID
 */
export const getPatternById = async (patternId) => {
  return await Pattern.findOne({ patternId }).lean();
};

/**
 * Format patterns for LLM system prompt
 */
export const formatPatternsForPrompt = async () => {
  const patterns = await getAllPatterns();
  
  if (patterns.length === 0) {
    return 'No patterns loaded. Please run the ML pipeline first.';
  }
  
  let prompt = 'You understand these market behavior patterns:\n\n';
  
  for (const p of patterns) {
    prompt += `${p.patternId} - ${p.name}:\n`;
    prompt += `  Description: ${p.description}\n`;
    prompt += `  Characteristics: ${p.characteristics.join(', ')}\n`;
    prompt += `  Risks: ${p.risks.join(', ')}\n`;
    if (p.stats?.percentage) {
      prompt += `  Frequency: ${p.stats.percentage}% of historical samples\n`;
    }
    prompt += '\n';
  }
  
  return prompt;
};

/**
 * Calculate Euclidean distance between two vectors
 */
const euclideanDistance = (a, b) => {
  if (a.length !== b.length) {
    throw new Error('Vector length mismatch');
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
};

/**
 * Match feature vector to closest pattern
 * 
 * @param {number[]} features - Normalized feature vector
 * @returns {Promise<{patternId: string, distance: number, pattern: object}>}
 */
export const matchToPattern = async (features) => {
  const patterns = await getAllPatterns();
  
  if (patterns.length === 0) {
    throw new Error('No patterns loaded');
  }
  
  let bestMatch = null;
  let minDistance = Infinity;
  
  for (const pattern of patterns) {
    if (!pattern.centroid || pattern.centroid.length === 0) continue;
    
    const distance = euclideanDistance(features, pattern.centroid);
    
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = pattern;
    }
  }
  
  return {
    patternId: bestMatch.patternId,
    name: bestMatch.name,
    distance: minDistance,
    pattern: bestMatch
  };
};

/**
 * Get user's historical performance per pattern
 */
export const getUserPatternStats = async (userId, TradeModel) => {
  // Aggregate trades by pattern
  const trades = await TradeModel.find({ 
    userId,
    orderStatus: 'CLOSED',
    pnl: { $ne: null },
    patternId: { $exists: true }
  }).lean();
  
  const stats = {};
  
  for (const trade of trades) {
    const pid = trade.patternId;
    if (!stats[pid]) {
      stats[pid] = { trades: 0, wins: 0, totalPnl: 0 };
    }
    stats[pid].trades++;
    if (trade.pnl > 0) stats[pid].wins++;
    stats[pid].totalPnl += trade.pnl;
  }
  
  // Calculate win rates
  for (const pid of Object.keys(stats)) {
    stats[pid].winRate = stats[pid].trades > 0 
      ? Math.round((stats[pid].wins / stats[pid].trades) * 100) 
      : 0;
  }
  
  return stats;
};
