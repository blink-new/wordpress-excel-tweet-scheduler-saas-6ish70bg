import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { UserRecord } from '../utils/userManager'

export interface SubscriptionStatus {
  isActive: boolean
  isExpired: boolean
  isTrialExpired: boolean
  daysRemaining: number
  hoursRemaining: number
  canUseFeatures: boolean
  needsUpgrade: boolean
  user: UserRecord | null
}

export function useSubscriptionStatus() {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isActive: false,
    isExpired: false,
    isTrialExpired: false,
    daysRemaining: 0,
    hoursRemaining: 0,
    canUseFeatures: false,
    needsUpgrade: false,
    user: null
  })
  const [loading, setLoading] = useState(true)

  const checkSubscriptionStatus = async () => {
    try {
      // First check if user is authenticated with timeout
      let authUser
      try {
        // Add timeout to auth check
        const authPromise = blink.auth.me()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        )
        
        authUser = await Promise.race([authPromise, timeoutPromise])
      } catch (authError) {
        console.warn('Authentication check failed:', authError)
        
        // Check if it's a network error
        if (authError.message?.includes('Network') || authError.message?.includes('fetch')) {
          console.warn('Network error detected, using offline mode')
          // In offline mode, allow limited functionality
          setStatus({
            isActive: true, // Allow offline usage
            isExpired: false,
            isTrialExpired: false,
            daysRemaining: 1, // Show 1 day remaining in offline mode
            hoursRemaining: 0,
            canUseFeatures: true, // Allow features in offline mode
            needsUpgrade: false,
            user: null
          })
          return
        }
        
        // Set default state for unauthenticated user
        setStatus({
          isActive: false,
          isExpired: true,
          isTrialExpired: true,
          daysRemaining: 0,
          hoursRemaining: 0,
          canUseFeatures: false,
          needsUpgrade: true,
          user: null
        })
        return
      }

      if (!authUser || !authUser.id) {
        console.warn('No authenticated user found')
        setStatus(prev => ({ 
          ...prev, 
          canUseFeatures: false, 
          needsUpgrade: true,
          isExpired: true,
          user: null
        }))
        return
      }
      
      // Get user record from database with improved retry logic
      let users = []
      let retryCount = 0
      const maxRetries = 2 // Reduced retries to avoid long delays
      
      while (retryCount < maxRetries) {
        try {
          // Add timeout to database query
          const dbPromise = blink.db.users.list({
            where: { id: authUser.id },
            limit: 1
          })
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), 8000)
          )
          
          users = await Promise.race([dbPromise, timeoutPromise])
          break // Success, exit retry loop
        } catch (dbError) {
          retryCount++
          console.warn(`Database query attempt ${retryCount} failed:`, dbError)
          
          // Check if it's a network error
          if (dbError.message?.includes('Network') || dbError.message?.includes('fetch') || dbError.message?.includes('timeout')) {
            console.warn('Database network error, using fallback mode')
            
            // Create fallback user record for offline mode
            const fallbackUser = {
              id: authUser.id,
              email: authUser.email || 'user@example.com',
              display_name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
              subscription_tier: 'trial',
              tweets_used: 0,
              tweets_limit: 7,
              trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
              created_at: new Date().toISOString()
            }
            
            setStatus({
              isActive: true,
              isExpired: false,
              isTrialExpired: false,
              daysRemaining: 1,
              hoursRemaining: 0,
              canUseFeatures: true,
              needsUpgrade: false,
              user: fallbackUser
            })
            return
          }
          
          if (retryCount >= maxRetries) {
            throw dbError // Re-throw after max retries
          }
          
          // Wait before retry (shorter backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }

      if (users.length === 0) {
        console.warn('User record not found in database')
        // Try to create user record using ensureUserExists
        try {
          const { ensureUserExists } = await import('../utils/userManager')
          const newUser = await ensureUserExists()
          
          setStatus({
            isActive: true,
            isExpired: false,
            isTrialExpired: false,
            daysRemaining: 3, // New trial user gets 3 days
            hoursRemaining: 0,
            canUseFeatures: true,
            needsUpgrade: false,
            user: newUser
          })
          return
        } catch (createError) {
          console.error('Failed to create user record:', createError)
          setStatus(prev => ({ 
            ...prev, 
            needsUpgrade: true, 
            canUseFeatures: false,
            isExpired: true,
            user: null
          }))
          return
        }
      }

      const user = users[0] as UserRecord
      const now = new Date()
      
      let expiryDate: Date | null = null
      let isTrialExpired = false
      let isExpired = false

      // Check trial expiry
      if (user.subscription_tier === 'trial' && user.trial_ends_at) {
        try {
          expiryDate = new Date(user.trial_ends_at)
          isTrialExpired = now > expiryDate
        } catch (dateError) {
          console.warn('Invalid trial_ends_at date:', user.trial_ends_at)
          isTrialExpired = true // Assume expired if date is invalid
        }
      }
      
      // Check subscription expiry for paid plans
      if (user.subscription_tier !== 'trial' && user.subscription_ends_at) {
        try {
          expiryDate = new Date(user.subscription_ends_at)
          isExpired = now > expiryDate
        } catch (dateError) {
          console.warn('Invalid subscription_ends_at date:', user.subscription_ends_at)
          isExpired = true // Assume expired if date is invalid
        }
      }

      // Calculate remaining time
      let daysRemaining = 0
      let hoursRemaining = 0
      
      if (expiryDate && now <= expiryDate) {
        const timeDiff = expiryDate.getTime() - now.getTime()
        daysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        hoursRemaining = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      }

      // Determine if user can use features
      const canUseFeatures = !isTrialExpired && !isExpired
      const needsUpgrade = isTrialExpired || isExpired || (user.subscription_tier === 'trial' && daysRemaining <= 1)

      setStatus({
        isActive: canUseFeatures,
        isExpired: isExpired || isTrialExpired,
        isTrialExpired,
        daysRemaining,
        hoursRemaining,
        canUseFeatures,
        needsUpgrade,
        user
      })

    } catch (error) {
      console.error('Error checking subscription status:', error)
      
      // Provide more specific error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
        console.warn('Network error detected, enabling offline mode')
        // In network error case, allow limited offline functionality
        setStatus({
          isActive: true, // Allow offline usage
          isExpired: false,
          isTrialExpired: false,
          daysRemaining: 1, // Show 1 day remaining in offline mode
          hoursRemaining: 0,
          canUseFeatures: true, // Allow features in offline mode
          needsUpgrade: false,
          user: {
            id: 'offline-user',
            email: 'offline@example.com',
            display_name: 'Offline User',
            subscription_tier: 'trial',
            tweets_used: 0,
            tweets_limit: 7,
            trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          }
        })
      } else {
        // Other errors - be more restrictive
        setStatus({
          isActive: false,
          isExpired: true,
          isTrialExpired: true,
          daysRemaining: 0,
          hoursRemaining: 0,
          canUseFeatures: false,
          needsUpgrade: true,
          user: null
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSubscriptionStatus()
    
    // Check every 5 minutes instead of every minute to reduce network load
    const interval = setInterval(checkSubscriptionStatus, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return {
    ...status,
    loading,
    refresh: checkSubscriptionStatus
  }
}