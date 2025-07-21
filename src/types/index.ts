export interface User {
  id: string
  email: string
  displayName?: string
  avatar?: string
  subscriptionTier: 'trial' | 'starter' | 'pro' | 'enterprise'
  tweetsUsed: number
  tweetsLimit: number
  trialEndsAt?: string
  subscriptionEndsAt?: string
  createdAt: string
  // Twitter integration
  twitterUsername?: string
  twitterConnected?: boolean
  twitterAccessToken?: string
  twitterRefreshToken?: string
}

export interface Tweet {
  id: string
  userId: string
  content: string
  scheduledAt: string
  status: 'scheduled' | 'published' | 'failed' | 'draft'
  platform: 'twitter'
  mediaUrls?: string[]
  hashtags?: string[]
  createdAt: string
  publishedAt?: string
  errorMessage?: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  nameAr: string
  price: number
  currency: 'SAR'
  duration: 'monthly'
  tweetsLimit: number
  features: string[]
  featuresAr: string[]
  popular?: boolean
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  tweets: ParsedTweet[]
  uploadedAt: string
}

export interface ParsedTweet {
  content: string
  scheduledAt: string
  hashtags?: string[]
  mediaUrls?: string[]
  row: number
  status?: 'pending' | 'scheduled' | 'error'
  error?: string
}

export interface MediaFile {
  id: string
  url: string
  type: 'image' | 'video'
  name: string
  size: number
  file?: File // For new uploads
}

export interface Language {
  code: 'en' | 'ar'
  name: string
  direction: 'ltr' | 'rtl'
}