import * as dhanOAuth from '../brokers/dhan/dhan.oauth.js';
import { validateToken, parseClientIdFromToken } from '../brokers/dhan/dhan.api.js';

/**
 * GET /auth/dhan - Redirect to Dhan OAuth login
 */
export const redirectToDhan = (req, res) => {
  try {
    const authUrl = dhanOAuth.getAuthorizationUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to initiate Dhan login',
      error: error.message 
    });
  }
};

/**
 * GET /auth/dhan/callback - Handle OAuth callback from Dhan
 */
export const handleDhanCallback = async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        message: 'Dhan authorization failed',
        error,
        description: error_description
      });
    }

    if (!code) {
      return res.status(400).json({ 
        message: 'Authorization code not received' 
      });
    }

    const tokenData = await dhanOAuth.exchangeCodeForToken(code);
    const credentials = await dhanOAuth.saveCredentials(
      req.user.userId,
      tokenData
    );

    res.json({
      message: 'Dhan account connected successfully',
      broker: 'DHAN',
      expiresAt: credentials.expiresAt,
    });

  } catch (error) {
    if (error.response) {
      return res.status(error.response.status || 400).json({
        message: 'Failed to exchange code for token',
        error: error.response.data
      });
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /auth/dhan/status - Check if Dhan is connected
 */
export const getDhanStatus = async (req, res) => {
  try {
    const credentials = await dhanOAuth.getCredentials(req.user.userId);

    if (!credentials) {
      return res.json({
        connected: false,
        message: 'Dhan account not connected or token expired'
      });
    }

    res.json({
      connected: true,
      broker: 'DHAN',
      expiresAt: credentials.expiresAt,
      lastUsedAt: credentials.lastUsedAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /auth/dhan/disconnect - Revoke Dhan connection
 */
export const disconnectDhan = async (req, res) => {
  try {
    await dhanOAuth.revokeCredentials(req.user.userId);

    res.json({
      message: 'Dhan account disconnected successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /broker/dhan/token - Manually set Dhan access token
 * 
 * For direct tokens (SELF type) from Dhan developer console.
 * VALIDATES the token before saving.
 */
export const setManualToken = async (req, res) => {
  try {
    const { accessToken, clientId } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'accessToken is required' });
    }

    // Try to extract clientId from token if not provided
    let finalClientId = clientId;
    if (!finalClientId) {
      finalClientId = parseClientIdFromToken(accessToken);
      console.log('Extracted clientId from token:', finalClientId);
    }

    if (!finalClientId) {
      return res.status(400).json({ 
        message: 'Client ID is required. Either provide it or ensure your token contains it.' 
      });
    }

    // Validate token with Dhan API before saving
    console.log('Validating Dhan token...');
    const validation = await validateToken(accessToken, finalClientId);
    
    if (!validation.valid) {
      console.log('Token validation failed:', validation.error);
      return res.status(400).json({ 
        message: `Token validation failed: ${validation.error}`,
        hint: 'Make sure you copied the complete access token and the correct client ID'
      });
    }

    console.log('Token validated successfully! Profile:', validation.profile?.data?.name);

    // Save the validated credentials (token valid for ~24 hours)
    const credentials = await dhanOAuth.setManualToken(
      req.user.userId,
      accessToken,
      finalClientId,
      1 // 1 day expiry
    );

    res.json({
      message: 'Dhan token validated and saved successfully',
      broker: 'DHAN',
      expiresAt: credentials.expiresAt,
      clientId: finalClientId
    });
  } catch (error) {
    console.error('setManualToken error:', error);
    res.status(500).json({ message: error.message });
  }
};
