import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token from localStorage on init
const token = localStorage.getItem('token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if it's a 401 error
    if (error.response?.status === 401) {
      // If it's a broker-related endpoint, don't logout - just return the error
      // The broker reconnect flow should handle token refresh
      const url = error.config?.url || ''
      const isBrokerEndpoint = url.includes('/broker/')
      
      if (isBrokerEndpoint) {
        // Don't logout for broker token errors - let the component handle it
        console.log('Broker token expired:', error.response?.data)
        return Promise.reject(error)
      }
      
      // For other 401 errors (main app auth), redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
