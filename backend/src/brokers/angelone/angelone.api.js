import axios from "axios";

const ANGELONE_BASE_URL = "https://apiconnect.angelone.in/rest";

/**
 * Angel One SmartAPI - Fetch Trade Book (today's executed trades)
 * 
 * Endpoint: GET /secure/angelbroking/order/v1/getTradeBook
 * Headers: Authorization, X-PrivateKey, X-ClientLocalIP, X-ClientPublicIP, X-MACAddress
 */
export const fetchTradeBook = async (jwtToken, apiKey) => {
  console.log('Angel One fetchTradeBook:', {
    url: `${ANGELONE_BASE_URL}/secure/angelbroking/order/v1/getTradeBook`,
    hasToken: !!jwtToken,
    hasApiKey: !!apiKey
  });

  try {
    const response = await axios.get(
      `${ANGELONE_BASE_URL}/secure/angelbroking/order/v1/getTradeBook`,
      {
        headers: {
          "Authorization": `Bearer ${jwtToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "127.0.0.1",
          "X-ClientPublicIP": "127.0.0.1",
          "X-MACAddress": "00:00:00:00:00:00",
          "X-PrivateKey": apiKey
        }
      }
    );

    console.log('Angel One Trade Book Response:', JSON.stringify(response.data, null, 2));
    return response.data?.data || [];
  } catch (error) {
    console.log('Angel One Trade Book Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

/**
 * Angel One SmartAPI - Login to get JWT token
 * 
 * Endpoint: POST /auth/angelbroking/user/v1/loginByPassword
 * 
 * Note: For production, use TOTP. For testing, PIN works.
 */
export const login = async (apiKey, clientId, pin, totp) => {
  console.log('Angel One Login Request:', {
    url: `${ANGELONE_BASE_URL}/auth/angelbroking/user/v1/loginByPassword`,
    body: { clientcode: clientId, password: pin, totp: totp },
    apiKey: apiKey.substring(0, 4) + '...' // partial for security
  });

  try {
    const response = await axios.post(
      `${ANGELONE_BASE_URL}/auth/angelbroking/user/v1/loginByPassword`,
      {
        clientcode: clientId,
        password: pin,
        totp: totp
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "127.0.0.1",
          "X-ClientPublicIP": "127.0.0.1",
          "X-MACAddress": "00:00:00:00:00:00",
          "X-PrivateKey": apiKey
        }
      }
    );

    // Debug: log the full response to see the structure
    console.log('Angel One Login Response Status:', response.status);
    console.log('Angel One Login Response Data:', JSON.stringify(response.data, null, 2));

    return response.data?.data;
  } catch (error) {
    console.log('Angel One Login Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

/**
 * Angel One SmartAPI - Get Order Book
 * 
 * Endpoint: GET /secure/angelbroking/order/v1/getOrderBook
 */
export const fetchOrderBook = async (jwtToken, apiKey) => {
  const response = await axios.get(
    `${ANGELONE_BASE_URL}/secure/angelbroking/order/v1/getOrderBook`,
    {
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-PrivateKey": apiKey
      }
    }
  );

  return response.data?.data || [];
};
