import axios from "axios";

const DHAN_BASE_URL = "https://api.dhan.co/v2";

/**
 * Validate Dhan token by calling profile endpoint
 */
export const validateToken = async (accessToken, clientId) => {
  try {
    const response = await axios.get(`${DHAN_BASE_URL}/profile`, {
      headers: {
        "access-token": accessToken,
        "client-id": clientId,
        "Content-Type": "application/json"
      }
    });
    
    return { 
      valid: true, 
      profile: response.data,
      clientIdFromProfile: response.data?.data?.dhanClientId 
    };
  } catch (error) {
    return { 
      valid: false, 
      error: error.response?.data?.errorMessage || error.message 
    };
  }
};

/**
 * Fetch today's trades from Dhan (Trade Book)
 * 
 * Official endpoint: GET https://api.dhan.co/v2/trades
 * Headers: 
 *   - access-token: JWT token  
 *   - client-id: Dhan Client ID
 */
export const fetchTodayTrades = async (accessToken, clientId) => {
  console.log('=== Dhan API: Fetching Trades ===');
  console.log('Client ID:', clientId);

  if (!clientId) {
    throw new Error('Dhan Client ID is required. Please reconnect your Dhan account.');
  }

  try {
    const response = await axios.get(`${DHAN_BASE_URL}/trades`, {
      headers: {
        "access-token": accessToken,
        "client-id": clientId,
        "Content-Type": "application/json"
      }
    });

    console.log('Dhan Trades Response:', response.status, '| Count:', Array.isArray(response.data) ? response.data.length : 'N/A');
    return response.data;
  } catch (error) {
    console.log('Dhan API Error:', {
      status: error.response?.status,
      errorCode: error.response?.data?.errorCode,
      message: error.response?.data?.errorMessage
    });
    throw error;
  }
};

/**
 * Fetch historical trades from Dhan for a date range
 * 
 * Official endpoint: GET https://api.dhan.co/v2/trades/{from-date}/{to-date}/{page}
 * - from-date, to-date: YYYY-MM-DD format
 * - page: starts from 0, paginated results
 */
export const fetchTradeHistory = async (accessToken, clientId, fromDate, toDate) => {
  console.log('=== Dhan API: Fetching Trade History ===');
  console.log('Client ID:', clientId);
  console.log('Date Range:', fromDate, 'to', toDate);

  if (!clientId) {
    throw new Error('Dhan Client ID is required. Please reconnect your Dhan account.');
  }

  const allTrades = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${DHAN_BASE_URL}/trades/${fromDate}/${toDate}/${page}`;
      console.log('Fetching page', page, ':', url);

      const response = await axios.get(url, {
        headers: {
          "access-token": accessToken,
          "client-id": clientId,
          "Accept": "application/json"
        }
      });

      const trades = response.data || [];
      console.log('Page', page, 'returned', trades.length, 'trades');

      if (Array.isArray(trades) && trades.length > 0) {
        allTrades.push(...trades);
        page++;
        // Dhan typically returns 100 trades per page
        // If less, we've reached the end
        if (trades.length < 100) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.log('Dhan Trade History Error:', {
        status: error.response?.status,
        errorCode: error.response?.data?.errorCode,
        message: error.response?.data?.errorMessage
      });
      // If it's the first page and we get an error, throw
      if (page === 0) {
        throw error;
      }
      // Otherwise, we've reached the end of pagination
      hasMore = false;
    }
  }

  console.log('Total trades fetched:', allTrades.length);
  return allTrades;
};

/**
 * Parse client ID from Dhan JWT token
 */
export const parseClientIdFromToken = (accessToken) => {
  try {
    const payload = accessToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded.dhanClientId;
  } catch (error) {
    return null;
  }
};
