import { blink } from '@/blink/client'

export interface UserRecord {
  id: string
  email: string
  display_name?: string
  avatar?: string
  subscription_tier: 'trial' | 'starter' | 'pro' | 'enterprise'
  tweets_used: number
  tweets_limit: number
  trial_ends_at?: string
  subscription_ends_at?: string
  created_at: string
  // Twitter integration
  twitter_username?: string
  twitter_connected?: number // SQLite boolean as integer
  twitter_access_token?: string
  twitter_refresh_token?: string
}

/**
 * Ensures a user record exists in the database
 * Creates one if it doesn't exist
 */
export async function ensureUserExists(): Promise<UserRecord> {
  try {
    // Get current authenticated user from Blink with timeout
    let authUser
    try {
      const authPromise = blink.auth.me()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      )
      authUser = await Promise.race([authPromise, timeoutPromise])
    } catch (authError) {
      console.warn('Auth failed in ensureUserExists:', authError)
      
      // Return fallback user for offline mode
      if (authError.message?.includes('Network') || authError.message?.includes('fetch') || authError.message?.includes('timeout')) {
        return {
          id: 'offline-user',
          email: 'offline@example.com',
          display_name: 'Offline User',
          subscription_tier: 'trial',
          tweets_used: 0,
          tweets_limit: 7,
          trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      }
      throw authError
    }
    
    // Check if user already exists in our database with timeout
    let existingUsers
    try {
      const dbPromise = blink.db.users.list({
        where: { id: authUser.id },
        limit: 1
      })
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 8000)
      )
      existingUsers = await Promise.race([dbPromise, timeoutPromise])
    } catch (dbError) {
      console.warn('Database query failed in ensureUserExists:', dbError)
      
      // Return fallback user for network errors
      if (dbError.message?.includes('Network') || dbError.message?.includes('fetch') || dbError.message?.includes('timeout')) {
        return {
          id: authUser.id,
          email: authUser.email || `user-${authUser.id}@example.com`,
          display_name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
          subscription_tier: 'trial',
          tweets_used: 0,
          tweets_limit: 7,
          trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      }
      throw dbError
    }
    
    if (existingUsers.length > 0) {
      // User exists, return the record
      return existingUsers[0] as UserRecord
    }
    
    // User doesn't exist, create new record
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 3) // 3-day trial
    
    const newUser: Omit<UserRecord, 'created_at'> = {
      id: authUser.id,
      email: authUser.email || `user-${authUser.id}@example.com`,
      display_name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
      avatar: authUser.avatar,
      subscription_tier: 'trial',
      tweets_used: 0,
      tweets_limit: 7, // Trial limit
      trial_ends_at: trialEndsAt.toISOString(),
      created_at: new Date().toISOString()
    }
    
    // Create the user record with timeout
    let createdUser
    try {
      const createPromise = blink.db.users.create(newUser)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Create timeout')), 10000)
      )
      createdUser = await Promise.race([createPromise, timeoutPromise])
    } catch (createError) {
      console.warn('Failed to create user in database:', createError)
      
      // Return the user data even if creation failed (offline mode)
      if (createError.message?.includes('Network') || createError.message?.includes('fetch') || createError.message?.includes('timeout')) {
        return {
          ...newUser,
          created_at: new Date().toISOString()
        }
      }
      throw createError
    }
    
    console.log('Created new user record:', createdUser)
    return createdUser as UserRecord
    
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    
    // Provide fallback for any remaining errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      console.warn('Returning fallback user due to network error')
      return {
        id: 'fallback-user',
        email: 'fallback@example.com',
        display_name: 'Fallback User',
        subscription_tier: 'trial',
        tweets_used: 0,
        tweets_limit: 7,
        trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }
    }
    
    throw new Error(`Failed to create or retrieve user record: ${errorMessage}`)
  }
}

/**
 * Updates user's tweet usage count
 */
export async function incrementUserTweetUsage(userId: string, count: number = 1): Promise<void> {
  try {
    const user = await blink.db.users.list({
      where: { id: userId },
      limit: 1
    })
    
    if (user.length === 0) {
      throw new Error('User not found')
    }
    
    const currentUser = user[0] as UserRecord
    const newUsage = currentUser.tweets_used + count
    
    await blink.db.users.update(userId, {
      tweets_used: newUsage
    })
    
    console.log(`Updated user ${userId} tweet usage: ${currentUser.tweets_used} -> ${newUsage}`)
    
  } catch (error) {
    console.error('Error updating user tweet usage:', error)
    throw error
  }
}

/**
 * Checks if user has remaining tweet quota
 */
export async function checkUserQuota(userId: string): Promise<{ hasQuota: boolean; used: number; limit: number }> {
  try {
    const users = await blink.db.users.list({
      where: { id: userId },
      limit: 1
    })
    
    if (users.length === 0) {
      throw new Error('User not found')
    }
    
    const user = users[0] as UserRecord
    const hasQuota = user.tweets_used < user.tweets_limit
    
    return {
      hasQuota,
      used: user.tweets_used,
      limit: user.tweets_limit
    }
    
  } catch (error) {
    console.error('Error checking user quota:', error)
    throw error
  }
}