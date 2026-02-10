/**
 * Debug: Check current state of trades  
 * Run: node scripts/check-trades.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trade from '../src/models/Trade.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected!\n');

    const sells = await Trade.find({ tradeType: 'SELL' }).lean();
    
    console.log('SELL Trades:');
    for (const t of sells) {
      console.log(`${t.symbol}: entryTime=${t.entryTime}, exitTime=${t.exitTime}, entryPrice=${t.entryPrice}, exitPrice=${t.exitPrice}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
