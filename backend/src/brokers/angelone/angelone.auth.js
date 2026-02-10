import BrokerCredentials from '../../models/BrokerCredentials.model.js';
import { login as angelOneLogin } from './angelone.api.js';
import * as OTPAuth from 'otpauth';

/**
 * Generate TOTP code from secret
 */
const generateTOTP = (secret) => {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret.replace(/\s/g, '')),
    digits: 6,
    period: 30
  });
  return totp.generate();
};

/**
 * Login to Angel One and save credentials
 * 
 * @param {string} userId - User's MongoDB ID
 * @param {string} apiKey - Angel One API key
 * @param {string} clientId - Angel One Client ID
 * @param {string} pin - Trading PIN
 * @param {string} totp - TOTP code (expires in 30 seconds)
 * @param {string} totpSecret - Optional TOTP secret for auto re-auth
 */
export const login = async (userId, apiKey, clientId, pin, totp, totpSecret = null) => {
  // Call Angel One login API
  const loginResponse = await angelOneLogin(apiKey, clientId, pin, totp);

  if (!loginResponse || !loginResponse.jwtToken) {
    throw new Error('Login failed: No JWT token received');
  }

  // Save credentials (including totpSecret and pin for auto re-auth)
  const credentials = await saveCredentials(userId, {
    accessToken: loginResponse.jwtToken,
    refreshToken: loginResponse.refreshToken,
    apiKey,
    clientId,
    pin: totpSecret ? pin : null, // Only store PIN if TOTP secret provided
    totpSecret
  });

  return credentials;
};

/**
 * Save or update Angel One credentials for a user
 */
export const saveCredentials = async (userId, tokenData) => {
  // Angel One JWT expires in ~28 hours
  const expiresAt = new Date(Date.now() + (28 * 60 * 60 * 1000));

  const updateData = {
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    tokenType: 'Bearer',
    expiresAt,
    clientId: tokenData.clientId,
    apiKey: tokenData.apiKey,
    isActive: true,
    lastUsedAt: new Date()
  };

  // Only update pin/totpSecret if provided
  if (tokenData.pin) {
    updateData.pin = tokenData.pin;
  }
  if (tokenData.totpSecret) {
    updateData.totpSecret = tokenData.totpSecret;
  }

  const credentials = await BrokerCredentials.findOneAndUpdate(
    { userId, broker: 'ANGELONE' },
    updateData,
    { upsert: true, new: true }
  );

  return credentials;
};

/**
 * Get active credentials for a user, with auto re-auth if expired
 */
export const getCredentials = async (userId) => {
  const credentials = await BrokerCredentials.findOne({
    userId,
    broker: 'ANGELONE',
    isActive: true
  });

  if (!credentials) {
    return null;
  }

  // Check if token is expired
  if (new Date() > credentials.expiresAt) {
    // Try auto re-auth if we have TOTP secret and PIN
    if (credentials.totpSecret && credentials.pin && credentials.apiKey && credentials.clientId) {
      console.log('Angel One token expired, attempting auto re-auth...');
      try {
        const newCredentials = await autoReAuthenticate(userId, credentials);
        console.log('Auto re-auth successful!');
        return newCredentials;
      } catch (error) {
        console.log('Auto re-auth failed:', error.message);
        // Mark as inactive and return null
        await BrokerCredentials.findByIdAndUpdate(credentials._id, { isActive: false });
        return null;
      }
    }

    // No auto re-auth possible, mark as inactive
    await BrokerCredentials.findByIdAndUpdate(credentials._id, { isActive: false });
    return null;
  }

  // Update last used
  await BrokerCredentials.findByIdAndUpdate(credentials._id, { lastUsedAt: new Date() });

  return credentials;
};

/**
 * Auto re-authenticate using stored TOTP secret
 */
export const autoReAuthenticate = async (userId, existingCredentials) => {
  const { apiKey, clientId, pin, totpSecret } = existingCredentials;

  // Generate fresh TOTP from secret
  const totp = generateTOTP(totpSecret);
  console.log('Generated TOTP for auto re-auth');

  // Login with generated TOTP
  const loginResponse = await angelOneLogin(apiKey, clientId, pin, totp);

  if (!loginResponse || !loginResponse.jwtToken) {
    throw new Error('Auto re-auth failed: No JWT token received');
  }

  // Save new credentials
  const credentials = await saveCredentials(userId, {
    accessToken: loginResponse.jwtToken,
    refreshToken: loginResponse.refreshToken,
    apiKey,
    clientId,
    pin,
    totpSecret
  });

  return credentials;
};

/**
 * Revoke/deactivate credentials
 */
export const revokeCredentials = async (userId) => {
  return await BrokerCredentials.findOneAndUpdate(
    { userId, broker: 'ANGELONE' },
    { isActive: false },
    { new: true }
  );
};

/**
 * Set token manually (for when user provides JWT directly)
 */
export const setManualToken = async (userId, accessToken, apiKey, expiresInDays = 1) => {
  const expiresAt = new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000));

  const credentials = await BrokerCredentials.findOneAndUpdate(
    { userId, broker: 'ANGELONE' },
    {
      accessToken,
      tokenType: 'Bearer',
      expiresAt,
      apiKey,
      clientId: 'MANUAL',
      isActive: true,
      lastUsedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return credentials;
};
