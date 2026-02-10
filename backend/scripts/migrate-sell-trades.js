/**
 * Migration: Fix SELL trades to use exitPrice/exitTime
 * 
 * This script updates existing SELL trades that have data in entryPrice/entryTime
 * and moves it to exitPrice/exitTime where it belongs.
 * 
 * Run: node scripts/migrate-sell-trades.js
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

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!\n');

    // Find all SELL trades that have entryPrice but no exitPrice
    const sellTrades = await Trade.find({
      tradeType: 'SELL',
      entryPrice: { $ne: null },
      exitPrice: null
    });

    console.log(`Found ${sellTrades.length} SELL trades to fix\n`);

    for (const trade of sellTrades) {
      console.log(`Fixing: ${trade.symbol} (${trade.broker})`);
      
      // Move entry data to exit
      trade.exitPrice = trade.entryPrice;
      trade.exitTime = trade.entryTime;
      trade.entryPrice = null;
      trade.entryTime = null;
      trade.orderStatus = 'CLOSED';
      
      await trade.save();
      console.log(`  → exitPrice: ₹${trade.exitPrice}`);
    }

    console.log('\n✅ Migration complete!');
    console.log('\nNow recalculating P&L for all users...');

    // Get unique user IDs
    const userIds = await Trade.distinct('userId');
    
    for (const userId of userIds) {
      console.log(`\nRecalculating positions for user: ${userId}`);
      await positionService.recalculatePositions(userId);
    }

    console.log('\n✅ P&L recalculation complete!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

migrate();
