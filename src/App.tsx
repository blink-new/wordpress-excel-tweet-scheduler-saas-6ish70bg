import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { blink } from './blink/client'
import { Toaster } from './components/ui/toaster'
import { tweetMonitor } from './utils/tweetMonitor'

// Pages
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import CalendarPage from './pages/CalendarPage'
import AdminPanel from './pages/AdminPanel'
import ProfilePage from './pages/ProfilePage'
import SubscriptionPlans from './components/SubscriptionPlans'
import LoadingScreen from './components/LoadingScreen'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      
      // بدء مراقبة التغريدات عند تسجيل الدخول
      if (state.user && !state.isLoading) {
        tweetMonitor.start(2) // فحص كل دقيقتين
      } else if (!state.user) {
        tweetMonitor.stop()
      }
    })
    
    return () => {
      unsubscribe()
      tweetMonitor.stop()
    }
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/" 
                element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} 
              />
              
              {/* Protected Routes */}
              {user ? (
                <>
                  <Route path="/dashboard" element={<Dashboard user={user} />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/profile" element={<ProfilePage user={user} />} />
                  <Route path="/subscription" element={<SubscriptionPlans />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              ) : (
                <Route path="*" element={<Navigate to="/" replace />} />
              )}
            </Routes>
            <Toaster />
          </div>
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  )
}

export default App