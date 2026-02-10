/**
 * Angel One Authentication Controller
 * 
 * Handles login and token management for Angel One SmartAPI
 */

import * as angelOneAuth from '../brokers/angelone/angelone.auth.js';

/**
 * POST /broker/angelone/login
 * Login to Angel One with TOTP
 * 
 * Body: { apiKey, clientId, pin, totp, totpSecret? }
 * totpSecret is optional - if provided, enables automatic re-auth when token expires
 */
export const login = async (req, res) => {
  try {
    const { apiKey, clientId, pin, totp, totpSecret } = req.body;

    if (!apiKey || !clientId || !pin || !totp) {
      return res.status(400).json({
        message: 'apiKey, clientId, pin, and totp are required'
      });
    }

    const credentials = await angelOneAuth.login(
      req.user.userId,
      apiKey,
      clientId,
      pin,
      totp,
      totpSecret // Optional - for auto re-auth
    );

    res.json({
      message: totpSecret 
        ? 'Angel One connected with auto-refresh enabled' 
        : 'Angel One connected successfully',
      expiresAt: credentials.expiresAt,
      autoRefreshEnabled: !!totpSecret
    });
  } catch (error) {
    // Handle Angel One API errors
    if (error.response) {
      return res.status(error.response.status || 400).json({
        message: 'Angel One login failed',
        details: error.response.data?.message || error.message
      });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /broker/angelone/token
 * Manually set access token (for users who generate token externally)
 * 
 * Body: { accessToken, apiKey }
 */
export const setToken = async (req, res) => {
  try {
    const { accessToken, apiKey } = req.body;

    if (!accessToken || !apiKey) {
      return res.status(400).json({
        message: 'accessToken and apiKey are required'
      });
    }

    const credentials = await angelOneAuth.setManualToken(
      req.user.userId,
      accessToken,
      apiKey
    );

    res.json({
      message: 'Angel One token saved',
      expiresAt: credentials.expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /broker/angelone/status
 * Check if Angel One is connected
 */
export const status = async (req, res) => {
  try {
    const credentials = await angelOneAuth.getCredentials(req.user.userId);

    if (credentials) {
      res.json({
        connected: true,
        expiresAt: credentials.expiresAt,
        lastUsedAt: credentials.lastUsedAt
      });
    } else {
      res.json({
        connected: false,
        message: 'Angel One not connected or token expired'
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /broker/angelone/disconnect
 * Disconnect Angel One
 */
export const disconnect = async (req, res) => {
  try {
    await angelOneAuth.revokeCredentials(req.user.userId);
    res.json({ message: 'Angel One disconnected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
