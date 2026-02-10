/**
 * Symbol Lookup Service
 * 
 * Resolves company display names to standardized NSE trading symbols
 * Uses Angel One's Search Scrip API and maintains a local cache
 */

// Node.js 18+ has native fetch, no import needed

// In-memory cache to avoid repeated API calls
const symbolCache = new Map();

// Common suffix patterns to strip from display names for better search
const CLEANUP_PATTERNS = [
  / LIMITED$/i,
  / LTD$/i,
  /-EQ$/i,
  /-BE$/i,
  /-ETF$/i,
  / INDUSTRIES$/i,
];

/**
 * Clean up a display name for better search results
 */
const cleanupDisplayName = (name) => {
  let cleaned = name.trim();
  for (const pattern of CLEANUP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned;
};

/**
 * Search for trading symbol using Angel One API
 * 
 * POST https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/searchScrip
 * Body: { exchange: "NSE", searchscrip: "Company Name" }
 */
export const searchScripAngel = async (displayName, accessToken, apiKey) => {
  try {
    const response = await fetch(
      'https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/searchScrip',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-PrivateKey': apiKey,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          exchange: 'NSE',
          searchscrip: cleanupDisplayName(displayName)
        })
      }
    );

    const data = await response.json();
    
    if (data.status && data.data && data.data.length > 0) {
      // Return the first match's trading symbol
      const match = data.data[0];
      console.log(`[SymbolLookup] ${displayName} -> ${match.tradingsymbol || match.symbol}`);
      return match.tradingsymbol || match.symbol || null;
    }
    
    return null;
  } catch (error) {
    console.error('[SymbolLookup] API error:', error.message);
    return null;
  }
};

/**
 * Normalize a symbol name using basic heuristics
 * Fallback when API is not available
 */
export const normalizeSymbol = (displayName) => {
  if (!displayName) return displayName;
  
  let symbol = displayName.toUpperCase().trim();
  
  // Remove common suffixes
  symbol = symbol
    .replace(/LIMITED$/i, '')
    .replace(/LTD$/i, '')
    .replace(/-EQ$/i, '')
    .replace(/-BE$/i, '')
    .replace(/ INDUSTRIES$/i, '')
    .replace(/ BANK$/i, 'BANK')
    .trim();
  
  // Remove spaces and special characters for certain patterns
  if (symbol.includes(' ')) {
    // "YES BANK" -> "YESBANK"
    symbol = symbol.replace(/\s+/g, '');
  }
  
  return symbol;
};

/**
 * Get standardized trading symbol for a display name
 * Uses cache -> API -> normalization fallback
 */
export const getStandardSymbol = async (displayName, accessToken = null, apiKey = null) => {
  if (!displayName) return displayName;
  
  const cacheKey = displayName.toUpperCase();
  
  // Check cache first
  if (symbolCache.has(cacheKey)) {
    return symbolCache.get(cacheKey);
  }
  
  let standardSymbol = null;
  
  // Try API if credentials available
  if (accessToken && apiKey) {
    standardSymbol = await searchScripAngel(displayName, accessToken, apiKey);
  }
  
  // Fallback to normalization
  if (!standardSymbol) {
    standardSymbol = normalizeSymbol(displayName);
  }
  
  // Cache the result
  symbolCache.set(cacheKey, standardSymbol);
  
  return standardSymbol;
};

/**
 * Pre-populate cache with known mappings
 * Call this on server startup
 */
export const initSymbolCache = () => {
  const knownMappings = {
    'YESBANKLIMITED': 'YESBANK',
    'YES BANK LIMITED': 'YESBANK',
    'MEAHEMC-ALPHAETF': 'ALPHAETF',
    'MISHTANN FOODS': 'MISHTANN',
    'Mishtann Foods': 'MISHTANN',
    // Add more as discovered
  };
  
  for (const [display, symbol] of Object.entries(knownMappings)) {
    symbolCache.set(display.toUpperCase(), symbol);
  }
  
  console.log(`[SymbolLookup] Initialized cache with ${Object.keys(knownMappings).length} mappings`);
};

// Export cache for debugging
export const getCache = () => Object.fromEntries(symbolCache);
