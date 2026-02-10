/**
 * Migration: Fix symbol names that are display names instead of trading symbols
 * 
 * Maps known display names to their actual trading symbols
 * Run: node scripts/fix-symbols.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trade from '../src/models/Trade.model.js';
import * as positionService from '../src/services/position.service.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI not found in environment');
  process.exit(1);
}

// Known display name to symbol mappings
// Add more as needed
const SYMBOL_MAPPINGS = {
  'Mishtann Foods': 'MISHTANN',
  'mishtann foods': 'MISHTANN',
  // Add more mappings as you discover them
};

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!\n');

    let fixedCount = 0;

    for (const [displayName, tradingSymbol] of Object.entries(SYMBOL_MAPPINGS)) {
      const trades = await Trade.find({ symbol: displayName });
      
      if (trades.length > 0) {
        console.log(`Found ${trades.length} trades with "${displayName}" -> fixing to "${tradingSymbol}"`);
        
        await Trade.updateMany(
          { symbol: displayName },
          { $set: { symbol: tradingSymbol } }
        );
        
        fixedCount += trades.length;
      }
    }

    if (fixedCount > 0) {
      console.log(`\n✅ Fixed ${fixedCount} trades`);
      
      console.log('\nRecalculating P&L for all users...');
      const userIds = await Trade.distinct('userId');
      
      for (const userId of userIds) {
        console.log(`Recalculating for user: ${userId}`);
        await positionService.recalculatePositions(userId);
      }
      
      console.log('\n✅ P&L recalculation complete!');
    } else {
      console.log('No trades needed fixing');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

migrate();
