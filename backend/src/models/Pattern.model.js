import mongoose from 'mongoose';

/**
 * Pattern - Stores learned market behavior patterns
 * 
 * Loaded from ML artifacts (patterns.json) at startup.
 * Used for runtime pattern matching and LLM context.
 */
const PatternSchema = new mongoose.Schema(
  {
    patternId: {
      type: String,
      required: true,
      unique: true,
      enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9']
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    characteristics: [{
      type: String
    }],
    risks: [{
      type: String
    }],
    // Cluster centroid from K-Means (for runtime matching)
    centroid: [{
      type: Number
    }],
    // Historical statistics
    stats: {
      sampleCount: Number,
      percentage: Number,
      historicalWinRate: Number
    }
  },
  { timestamps: true }
);

const Pattern = mongoose.model('Pattern', PatternSchema);

export default Pattern;
