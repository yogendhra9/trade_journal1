import axios from 'axios';
import BrokerCredentials from '../../models/BrokerCredentials.model.js';

const DHAN_AUTH_URL = 'https://api.dhan.co/oauth/authorize';
const DHAN_TOKEN_URL = 'https://api.dhan.co/oauth/token';

/**
 * Build the Dhan OAuth authorization URL
 */
export const getAuthorizationUrl = () => {
  const clientId = process.env.DHAN_CLIENT_ID;
  const redirectUri = process.env.DHAN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('DHAN_CLIENT_ID and DHAN_REDIRECT_URI must be set in environment');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code'
  });

  return `${DHAN_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (code) => {
  const clientId = process.env.DHAN_CLIENT_ID;
  const clientSecret = process.env.DHAN_CLIENT_SECRET;
  const redirectUri = process.env.DHAN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Dhan OAuth credentials not configured in environment');
  }

  const response = await axios.post(DHAN_TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};

/**
 * Save or update broker credentials for a user
 */
export const saveCredentials = async (userId, tokenData) => {
  const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

  const credentials = await BrokerCredentials.findOneAndUpdate(
    { userId, broker: 'DHAN' },
    {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt,
      clientId: process.env.DHAN_CLIENT_ID,
      isActive: true,
      lastUsedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return credentials;
};

/**
 * Get active credentials for a user
 */
export const getCredentials = async (userId) => {
  const credentials = await BrokerCredentials.findOne({
    userId,
    broker: 'DHAN',
    isActive: true
  });

  if (!credentials) {
    return null;
  }

  // Check if token is expired
  if (new Date() > credentials.expiresAt) {
    // Mark as inactive
    await BrokerCredentials.findByIdAndUpdate(credentials._id, { isActive: false });
    return null;
  }

  // Update last used
  await BrokerCredentials.findByIdAndUpdate(credentials._id, { lastUsedAt: new Date() });

  return credentials;
};

/**
 * Revoke/deactivate credentials
 */
export const revokeCredentials = async (userId) => {
  return await BrokerCredentials.findOneAndUpdate(
    { userId, broker: 'DHAN' },
    { isActive: false },
    { new: true }
  );
};

/**
 * Manually set access token (for direct tokens, not OAuth)
 * Used when Dhan provides a token directly (SELF type)
 * Dhan SELF tokens typically expire in 24 hours
 */
export const setManualToken = async (userId, accessToken, clientId, expiresInDays = 1) => {
  const expiresAt = new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000));

  const credentials = await BrokerCredentials.findOneAndUpdate(
    { userId, broker: 'DHAN' },
    {
      accessToken,
      tokenType: 'Bearer',
      expiresAt,
      clientId: clientId || 'MANUAL',
      isActive: true,
      lastUsedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return credentials;
};
