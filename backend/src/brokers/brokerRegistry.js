import { DhanAdapter } from './dhan/dhan.adapter.js';
import { AngelOneAdapter } from './angelone/angelone.adapter.js';

/**
 * Registry of supported broker adapters
 * Adding a new broker requires:
 * 1. Create adapter in brokers/<broker>/ folder
 * 2. Add to this registry
 */
const adapters = {
  DHAN: DhanAdapter,
  ANGELONE: AngelOneAdapter
};

/**
 * Factory function to get broker adapter instance
 * @param {string} broker - Broker name (e.g., 'DHAN')
 * @param {object} credentials - Broker-specific credentials
 * @returns {BaseBrokerAdapter} Adapter instance
 */
export const getBrokerAdapter = (broker, credentials) => {
  const AdapterClass = adapters[broker?.toUpperCase()];
  
  if (!AdapterClass) {
    throw new Error(`Unsupported broker: ${broker}. Supported: ${Object.keys(adapters).join(', ')}`);
  }
  
  return new AdapterClass(credentials);
};

/**
 * Get list of supported brokers
 */
export const getSupportedBrokers = () => Object.keys(adapters);
