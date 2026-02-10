/**
 * Test Pattern Matching for Multiple Stocks
 * Run: node test-patterns.js
 */

import * as api from './src/services/indianApi.service.js';

const testStocks = [
  'RELIANCE',   // Large cap, stable
  'TCS',        // IT, trending
  'TATASTEEL',  // Cyclical, volatile
  'INFY',       // IT  
  'SBIN',       // PSU Bank
  'ITC',        // FMCG, range-bound
  'HDFCBANK',   // Private Bank
  'ADANIENT',   // High volatility
  'SUNPHARMA',  // Pharma
  'BAJFINANCE'  // NBFC
];

async function runTest() {
  console.log('\n=== PATTERN MATCHING TEST ===\n');
  console.log('Testing pattern assignment for various stocks...\n');
  
  const results = {};
  
  for (const stock of testStocks) {
    try {
      console.log(`\nFetching data for ${stock}...`);
      const data = await api.getHistoricalData(stock, '1m');
      const features = api.calculateFeatures(data);
      
      if (features) {
        const pattern = await api.matchToPattern(features);
        results[stock] = pattern;
        console.log(`✅ ${stock}: ${pattern}`);
      } else {
        results[stock] = 'NO_DATA';
        console.log(`⚠️ ${stock}: Insufficient data`);
      }
    } catch (e) {
      results[stock] = 'ERROR';
      console.log(`❌ ${stock}: ${e.message}`);
    }
    
    // Rate limit delay
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Summary
  console.log('\n\n=== PATTERN DISTRIBUTION ===\n');
  const patternCounts = {};
  for (const [stock, pattern] of Object.entries(results)) {
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  }
  
  for (const [pattern, count] of Object.entries(patternCounts).sort()) {
    console.log(`${pattern}: ${count} stocks`);
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

runTest().catch(console.error);
