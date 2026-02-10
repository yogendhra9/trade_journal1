import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import * as userSettingsController from '../controllers/userSettings.controller.js';

const router = express.Router();

// Get user settings
router.get('/settings', authMiddleware, userSettingsController.getSettings);

// Update user settings (experience level)
router.put('/settings', authMiddleware, userSettingsController.updateSettings);

export default router;
