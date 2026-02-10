import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as brokerSyncController from '../controllers/brokerSync.controller.js';
import * as dhanAuthController from '../controllers/dhanAuth.controller.js';
import * as angelOneAuthController from '../controllers/angelOneAuth.controller.js';

const router = express.Router();

// ============ Broker Info ============
// Get supported brokers (public)
router.get('/supported', brokerSyncController.getSupportedBrokersHandler);

// ============ Dhan OAuth ============
// Initiate Dhan OAuth (must be logged in first)
router.get('/dhan/connect', authMiddleware, dhanAuthController.redirectToDhan);

// OAuth callback from Dhan (must be logged in)
router.get('/dhan/callback', authMiddleware, dhanAuthController.handleDhanCallback);

// Check Dhan connection status
router.get('/dhan/status', authMiddleware, dhanAuthController.getDhanStatus);

// Disconnect Dhan account
router.post('/dhan/disconnect', authMiddleware, dhanAuthController.disconnectDhan);

// Manually set Dhan token (for direct tokens from developer console)
router.post('/dhan/token', authMiddleware, dhanAuthController.setManualToken);

// ============ Angel One SmartAPI ============
// Login with TOTP
router.post('/angelone/login', authMiddleware, angelOneAuthController.login);

// Manually set token
router.post('/angelone/token', authMiddleware, angelOneAuthController.setToken);

// Check connection status
router.get('/angelone/status', authMiddleware, angelOneAuthController.status);

// Disconnect
router.delete('/angelone/disconnect', authMiddleware, angelOneAuthController.disconnect);

// ============ Trade Sync ============
// Sync trades from broker (uses stored credentials)
router.post('/sync', authMiddleware, brokerSyncController.syncTrades);

// ============ Positions ============
// Get open positions
router.get('/positions', authMiddleware, brokerSyncController.getPositions);

// Recalculate all positions and PnL from trade history
router.post('/recalculate-pnl', authMiddleware, brokerSyncController.recalculatePnL);

export default router;

