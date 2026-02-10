import mongoose from 'mongoose';

/**
 * BrokerCredentials - Stores OAuth tokens for broker integrations
 * 
 * Separate collection to:
 * - Support multiple brokers per user
 * - Keep User model clean
 * - Enable broker-agnostic token management
 */
const BrokerCredentialsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    broker: {
      type: String,
      required: true,
      enum: ['DHAN', 'ANGELONE']
    },
    accessToken: {
      type: String,
      required: true
    },
    refreshToken: {
      type: String
    },
    tokenType: {
      type: String,
      default: 'Bearer'
    },
    expiresAt: {
      type: Date,
      required: true
    },
    // Client ID (Dhan/Angel One)
    clientId: {
      type: String
    },
    // API Key (Angel One specific)
    apiKey: {
      type: String
    },
    // Trading PIN (Angel One - for auto re-auth)
    pin: {
      type: String
    },
    // TOTP Secret (Angel One - for auto re-auth)
    totpSecret: {
      type: String
    },
    // Status tracking
    isActive: {
      type: Boolean,
      default: true
    },
    lastUsedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// One active credential per user per broker
BrokerCredentialsSchema.index({ userId: 1, broker: 1 }, { unique: true });

// Index for finding expired tokens
BrokerCredentialsSchema.index({ expiresAt: 1 });

const BrokerCredentials = mongoose.model('BrokerCredentials', BrokerCredentialsSchema);

export default BrokerCredentials;
