import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Trades from './pages/Trades'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import BrokerConnect from './pages/BrokerConnect'
import Brokers from './pages/Brokers'
import ProtectedRoute from './components/ProtectedRoute'

// Root route that shows Landing for guests, redirects to dashboard for logged in users
const RootRoute = () => {
  const { token, loading } = useAuth()
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a1a',
        color: '#fff'
      }}>
        Loading...
      </div>
    )
  }
  
  // If user has a token, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />
  }
  
  // Otherwise show Landing page
  return <Landing />
}

// AppRoutes component - must be inside AuthProvider to use useAuth
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />
      <Route path="/broker/:brokerId/connect" element={
        <ProtectedRoute><BrokerConnect /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/trades" element={
        <ProtectedRoute><Trades /></ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute><Chat /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><Settings /></ProtectedRoute>
      } />
      <Route path="/brokers" element={
        <ProtectedRoute><Brokers /></ProtectedRoute>
      } />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
