import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // Optionally fetch user profile here
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token: newToken, user: userData } = response.data
    
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setToken(newToken)
    setUser(userData)
    
    return response.data
  }

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password })
    const { token: newToken, user: userData } = response.data
    
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    setToken(newToken)
    setUser(userData)
    
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
