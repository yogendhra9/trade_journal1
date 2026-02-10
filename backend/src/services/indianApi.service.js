/**
 * Indian Stock API Service
 * 
 * Fetches historical data from indianapi.in for pattern matching.
 * Docs: https://indianapi.in/documentation/indian-stock-market
 */

import axios from 'axios';

// IndianAPI base URL
const API_BASE_URL = 'https://stock.indianapi.in';

// Read API key at runtime (not module load time) to ensure dotenv is loaded
const getApiKey = () => process.env.INDIAN_API_KEY;

/**
 * Normalize stock symbol by removing exchange suffixes
 * e.g., "ALPHAETF-EQ" -> "ALPHAETF", "TCS-BE" -> "TCS"
 */
const normalizeSymbol = (symbol) => {
  if (!symbol) return symbol;
  // Common suffixes from Angel One and other brokers
  const suffixes = ['-EQ', '-BE', '-BL', '-BT', '-GC', '-IL', '-IV'];
  let normalized = symbol.toUpperCase();
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }
  return normalized;
};

/**
 * Fetch historical price data
 * 
 * @param {string} stockName - Stock symbol (e.g. "TCS" or "ALPHAETF-EQ")
 * @param {string} period - Time period: 1m, 6m, 1yr, 3yr, 5yr, 10yr, max
 */
export const getHistoricalData = async (stockName, period = '1m') => {
  try {
    const apiKey = getApiKey();
    const normalizedSymbol = normalizeSymbol(stockName);
    const url = `${API_BASE_URL}/historical_data`;
    const headers = { 'x-api-key': apiKey };
    const params = { stock_name: normalizedSymbol, period, filter: 'price' };
    
    console.log('IndianAPI Request:', { url, params, original: stockName, normalized: normalizedSymbol, keyPresent: !!apiKey });
    
    const response = await axios.get(url, { params, headers });

    // Parse response into usable format
    const datasets = response.data.datasets || [];
    const priceData = datasets.find(d => d.metric === 'Price');
    const volumeData = datasets.find(d => d.metric === 'Volume');
    const dma50 = datasets.find(d => d.metric === 'DMA50');
    const dma200 = datasets.find(d => d.metric === 'DMA200');

    const result = {
      symbol: stockName,
      period,
      data: []
    };

    if (priceData?.values) {
      for (let i = 0; i < priceData.values.length; i++) {
        const [date, price] = priceData.values[i];
        const volume = volumeData?.values?.[i]?.[1] || 0;

        result.data.push({
          date,
          close: parseFloat(price),
          volume: parseInt(volume) || 0,
          dma50: dma50?.values?.[i]?.[1] ? parseFloat(dma50.values[i][1]) : null,
          dma200: dma200?.values?.[i]?.[1] ? parseFloat(dma200.values[i][1]) : null
        });
      }
    }

    return result;
  } catch (error) {
    console.error('IndianAPI error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get stock info including current price
 */
export const getStockInfo = async (stockName) => {
  try {
    const apiKey = getApiKey();
    const response = await axios.get(`${API_BASE_URL}/stock`, {
      params: {
        name: stockName
      },
      headers: {
        'x-api-key': apiKey
      }
    });

    return response.data;
  } catch (error) {
    console.error('IndianAPI stock error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Calculate simple features from historical data for pattern matching
 * Returns 11 features to match centroid dimensions
 */
export const calculateFeatures = (historicalData) => {
  if (!historicalData?.data || historicalData.data.length < 20) {
    return null;
  }

  const data = historicalData.data;
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  
  // Calculate returns
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i-1]) / closes[i-1]);
  }
  
  // Different time windows
  const recentReturns = returns.slice(-5);  // Last 5 days
  const weekReturns = returns.slice(-10);   // Last 10 days
  const monthReturns = returns.slice(-20);  // Last 20 days
  
  const recentCloses = closes.slice(-10);
  const recentVolumes = volumes.slice(-10);
  const prevVolumes = volumes.slice(-20, -10);
  
  // Helper functions
  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = arr => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length);
  };
  
  // Volatility features (3 timeframes)
  const volatility5 = std(recentReturns) || 0;
  const volatility10 = std(weekReturns) || 0;
  const volatility20 = std(monthReturns) || 0;
  
  // Trend features
  const trend5 = (recentCloses[recentCloses.length - 1] - recentCloses[5]) / recentCloses[5] || 0;
  const trend10 = (recentCloses[recentCloses.length - 1] - recentCloses[0]) / recentCloses[0] || 0;
  
  // Volume features
  const avgVolume = mean(recentVolumes);
  const prevAvgVolume = mean(prevVolumes) || avgVolume;
  const volumeRatio = prevAvgVolume > 0 ? avgVolume / prevAvgVolume : 1;
  const volumeVolatility = std(recentVolumes) / avgVolume || 0;
  
  // Momentum features
  const momentum5 = mean(recentReturns) || 0;
  const momentum10 = mean(weekReturns) || 0;
  
  // Price range
  const maxPrice = Math.max(...recentCloses);
  const minPrice = Math.min(...recentCloses);
  const priceRange = (maxPrice - minPrice) / minPrice || 0;
  
  // Drawdown
  const currentPrice = recentCloses[recentCloses.length - 1];
  const drawdown = (currentPrice - maxPrice) / maxPrice;
  
  // Create 11-dim feature vector (matching centroid dimensions)
  const featureVector = [
    volatility5 * 100,      // Scale up for better matching
    volatility10 * 100,
    volatility20 * 100,
    trend5 * 100,
    trend10 * 100,
    volumeRatio - 1,        // Center around 0
    momentum5 * 100,
    momentum10 * 100,
    priceRange * 100,
    volumeVolatility,
    drawdown * 100
  ];
  
  return {
    volatility5,
    volatility10,
    volatility20,
    trend5,
    trend10,
    volumeRatio,
    momentum5,
    momentum10,
    priceRange,
    volumeVolatility,
    drawdown,
    featureVector,
    dataPoints: data.length
  };
};

// Load patterns from JSON
let patternsCache = null;
const loadPatterns = async () => {
  if (patternsCache) return patternsCache;
  try {
    const fs = await import('fs');
    const path = await import('path');
    const patternsPath = path.join(process.cwd(), 'ml', 'artifacts', 'patterns.json');
    const data = fs.readFileSync(patternsPath, 'utf-8');
    patternsCache = JSON.parse(data);
    return patternsCache;
  } catch (error) {
    console.error('Failed to load patterns:', error.message);
    return {};
  }
};

/**
 * Calculate euclidean distance between two vectors
 */
const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
};

/**
 * Match features to closest pattern using euclidean distance to centroids
 */
export const matchToPattern = async (features) => {
  if (!features || !features.featureVector) return 'P1';
  
  const patterns = await loadPatterns();
  if (!patterns || Object.keys(patterns).length === 0) {
    console.log('No patterns loaded, using fallback');
    return matchToPatternFallback(features);
  }
  
  let bestPattern = 'P1';
  let bestDistance = Infinity;
  
  for (const [patternId, patternData] of Object.entries(patterns)) {
    if (!patternData.centroid) continue;
    
    const distance = euclideanDistance(features.featureVector, patternData.centroid);
    console.log(`  ${patternId}: distance=${distance.toFixed(2)}`);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPattern = patternId;
    }
  }
  
  // If best distance is too large, use fallback
  if (bestDistance > 5) {
    console.log(`Pattern centroid too far (${bestDistance.toFixed(2)}), using rule-based fallback`);
    return matchToPatternFallback(features);
  }
  
  console.log(`Pattern match: ${bestPattern} (distance: ${bestDistance.toFixed(2)})`);
  return bestPattern;
};

/**
 * Fallback rule-based pattern matching with improved thresholds
 */
const matchToPatternFallback = (features) => {
  const { volatility10, trend10, volumeRatio, momentum10, priceRange, drawdown } = features;
  
  console.log('Pattern matching features:', { volatility10, trend10, volumeRatio, momentum10 });
  
  // P5: High Volatility Whipsaw - most distinctive
  if (volatility10 > 0.025) {
    console.log('Matched P5: High volatility');
    return 'P5';
  }
  
  // P7: Exhaustion / Blow-Off - high volume spike with big move
  if (volumeRatio > 1.8 && Math.abs(momentum10) > 0.02) {
    console.log('Matched P7: Volume spike with momentum');
    return 'P7';
  }
  
  // P3: Trending Up - positive trend
  if (trend10 > 0.015 && momentum10 > 0.01) {
    console.log('Matched P3: Uptrend');
    return 'P3';
  }
  
  // P4: Trending Down - negative trend
  if (trend10 < -0.015 && momentum10 < -0.01) {
    console.log('Matched P4: Downtrend');
    return 'P4';
  }
  
  // P2: Volatility Expansion - increasing volume with moderate volatility
  if (volumeRatio > 1.3 && volatility10 > 0.012) {
    console.log('Matched P2: Vol expansion');
    return 'P2';
  }
  
  // P9: Illiquid - very low volume
  if (volumeRatio < 0.6) {
    console.log('Matched P9: Low volume');
    return 'P9';
  }
  
  // P6: Compression - low volatility with declining volume
  if (volatility10 < 0.008 && volumeRatio < 0.9) {
    console.log('Matched P6: Low vol compression');
    return 'P6';
  }
  
  // P8: Mean-Reversion - moderate volatility, no clear trend
  if (volatility10 > 0.008 && volatility10 < 0.018 && Math.abs(trend10) < 0.008) {
    console.log('Matched P8: Mean reversion');
    return 'P8';
  }
  
  // P1: Low Volatility Range-Bound (default for stable, low-activity conditions)
  console.log('Matched P1: Range-bound (default)');
  return 'P1';
};
