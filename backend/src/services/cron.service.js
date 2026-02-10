/**
 * Cron Service - Scheduled Auto-Sync
 * 
 * Runs daily at 6:00 PM IST to sync trades from all connected brokers.
 * This ensures Angel One trades are captured before they become inaccessible.
 */

import cron from 'node-cron';
import BrokerCredentials from '../models/BrokerCredentials.model.js';
import { getBrokerAdapter } from '../brokers/brokerRegistry.js';
import * as tradeService from './trade.service.js';
import * as positionService from './position.service.js';
import * as patternAssignment from './patternAssignment.service.js';
import Trade from '../models/Trade.model.js';

/**
 * Sync trades for a single user and broker
 */
const syncBrokerForUser = async (userId, broker, credentials) => {
  const results = { synced: 0, skipped: 0, errors: [] };
  
  try {
    const adapter = getBrokerAdapter(broker, credentials);
    const rawTrades = await adapter.fetchTrades();
    
    console.log(`[CRON] ${broker}: Fetched ${rawTrades.length} trades`);
    
    for (const rawTrade of rawTrades) {
      try {
        const normalizedTrade = adapter.normalizeTrade(rawTrade, userId);
        const { trade, created } = await tradeService.upsertTrade(normalizedTrade);
        
        if (created) {
          results.synced++;
          
          // Process for P&L
          const { pnl } = await positionService.processTradeForPnL(trade);
          if (pnl !== null) {
            await Trade.findByIdAndUpdate(trade._id, { pnl, orderStatus: 'CLOSED' });
          }
          
          // Assign pattern (async)
          patternAssignment.assignPatternToTrade(trade._id).catch(() => {});
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push(error.message);
      }
    }
  } catch (error) {
    results.errors.push(`Fetch failed: ${error.message}`);
  }
  
  return results;
};

/**
 * Main sync job - syncs all connected brokers for all users
 */
const runSyncJob = async () => {
  console.log('\n=== [CRON] Starting scheduled trade sync ===');
  console.log(`Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  
  try {
    // Get all active broker credentials
    const allCredentials = await BrokerCredentials.find({ isActive: true });
    
    console.log(`[CRON] Found ${allCredentials.length} active broker connections`);
    
    const summary = {};
    
    for (const cred of allCredentials) {
      const key = `${cred.userId}_${cred.broker}`;
      console.log(`[CRON] Syncing ${cred.broker} for user ${cred.userId}...`);
      
      const result = await syncBrokerForUser(
        cred.userId.toString(),
        cred.broker,
        {
          accessToken: cred.accessToken,
          clientId: cred.clientId,
          apiKey: cred.apiKey
        }
      );
      
      summary[key] = result;
      console.log(`[CRON] ${cred.broker}: ${result.synced} new, ${result.skipped} skipped`);
    }
    
    console.log('\n=== [CRON] Sync complete ===');
    console.log('Summary:', JSON.stringify(summary, null, 2));
    
  } catch (error) {
    console.error('[CRON] Sync job failed:', error);
  }
};

/**
 * Start the cron scheduler
 * 
 * Schedule: Every day at 6:00 PM IST
 * Cron expression: '0 18 * * *' (minute 0, hour 18, every day)
 */
export const startCronJobs = () => {
  // 6:00 PM IST daily
  cron.schedule('0 18 * * *', () => {
    runSyncJob();
  }, {
    timezone: 'Asia/Kolkata'
  });
  
  console.log('✅ Cron job scheduled: Daily trade sync at 6:00 PM IST');
};

/**
 * Manual trigger for testing
 */
export const triggerManualSync = async () => {
  await runSyncJob();
};
