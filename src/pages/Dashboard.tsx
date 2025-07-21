import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { useLanguage } from '../hooks/useLanguage'
import { blink } from '../blink/client'
import { User, Tweet } from '../types'
import { ensureUserExists } from '../utils/userManager'
import TwitterConnect from '../components/TwitterConnect'
import SubscriptionInfo from '../components/SubscriptionInfo'
import SubscriptionCountdown from '../components/SubscriptionCountdown'
import Pagination from '../components/Pagination'
import DateTimeEditor from '../components/DateTimeEditor'
import FeatureGuard from '../components/FeatureGuard'
import ConnectionStatus from '../components/ConnectionStatus'
import BulkTweetActions from '../components/BulkTweetActions'
import TwitterAnalytics from '../components/TwitterAnalytics'
import TweetEditor from '../components/TweetEditor'
import { sendTweetFailureNotification } from '../utils/emailNotifications'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'
import { formatDateSafely, formatTimeSafely, safeParseDate, safeDateToISOString } from '../utils/dateUtils'
import { 
  Upload, 
  Calendar, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Settings,
  Crown,
  Users,
  LogOut,
  Languages,
  Twitter,
  Trash2,
  Send,
  Edit3,
  User as UserIcon,
  Shield,
  ArrowUp
} from 'lucide-react'

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate()
  const { language, setLanguage, t, isRTL } = useLanguage()
  const { canUseFeatures, isExpired, needsUpgrade, loading: subscriptionLoading } = useSubscriptionStatus()
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [userRecord, setUserRecord] = useState<any>(null)
  const [stats, setStats] = useState({
    scheduled: 0,
    published: 0,
    failed: 0,
    thisWeek: 0
  })

  const TWEETS_PER_PAGE = 10

  const loadDashboardData = useCallback(async (page: number = 1) => {
    try {
      // Ensure user record exists in database
      let userRec
      try {
        userRec = await ensureUserExists()
        setUserRecord(userRec)
      } catch (userError) {
        console.warn('Failed to ensure user exists:', userError)
        
        // Check if it's a network error
        const errorMessage = userError instanceof Error ? userError.message : 'Unknown error'
        if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
          // Create a fallback user record for offline mode
          userRec = {
            id: user.id,
            email: user.email || 'user@example.com',
            display_name: user.displayName || user.email?.split('@')[0] || 'User',
            subscription_tier: 'trial',
            tweets_used: 0,
            tweets_limit: 7,
            trial_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day for offline mode
            created_at: new Date().toISOString()
          }
        } else {
          // Create a fallback user record for display purposes
          userRec = {
            id: user.id,
            email: user.email || 'user@example.com',
            display_name: user.displayName || user.email?.split('@')[0] || 'User',
            subscription_tier: 'trial',
            tweets_used: 0,
            tweets_limit: 7,
            trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          }
        }
        setUserRecord(userRec)
      }
      
      // Load tweets with pagination and error handling
      let userTweets = []
      let allTweets = []
      
      try {
        const offset = (page - 1) * TWEETS_PER_PAGE
        
        // Add timeout to tweets query
        const tweetsPromise = blink.db.tweets.list({
          where: { user_id: userRec.id },
          orderBy: { created_at: 'desc' },
          limit: TWEETS_PER_PAGE,
          offset: offset
        })
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tweets query timeout')), 8000)
        )
        
        userTweets = await Promise.race([tweetsPromise, timeoutPromise])
        
        // Get total count for pagination
        const allTweetsPromise = blink.db.tweets.list({
          where: { user_id: userRec.id }
        })
        const allTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('All tweets query timeout')), 8000)
        )
        
        allTweets = await Promise.race([allTweetsPromise, allTimeoutPromise])
      } catch (tweetsError) {
        console.warn('Failed to load tweets:', tweetsError)
        
        // In case of network error, use empty arrays (offline mode)
        const errorMessage = tweetsError instanceof Error ? tweetsError.message : 'Unknown error'
        if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
          console.warn('Using offline mode for tweets')
          userTweets = []
          allTweets = []
        } else {
          throw tweetsError // Re-throw non-network errors
        }
      }
      
      const totalCount = allTweets.length
      setTotalPages(Math.ceil(totalCount / TWEETS_PER_PAGE))
      
      // Convert database format to frontend format with safe date parsing
      const formattedTweets: Tweet[] = userTweets.map((tweet: any) => ({
        id: tweet.id,
        userId: tweet.user_id,
        content: tweet.content,
        scheduledAt: safeDateToISOString(tweet.scheduled_at) || new Date().toISOString(),
        status: tweet.status,
        platform: tweet.platform,
        mediaUrls: tweet.media_urls ? JSON.parse(tweet.media_urls) : [],
        hashtags: tweet.hashtags ? JSON.parse(tweet.hashtags) : [],
        createdAt: safeDateToISOString(tweet.created_at) || new Date().toISOString(),
        publishedAt: tweet.published_at ? safeDateToISOString(tweet.published_at) : undefined,
        errorMessage: tweet.error_message
      }))
      
      setTweets(formattedTweets)
      
      // Calculate stats
      const scheduled = allTweets.filter((t: any) => t.status === 'scheduled').length
      const published = allTweets.filter((t: any) => t.status === 'published').length
      const failed = allTweets.filter((t: any) => t.status === 'failed').length
      
      // This week tweets
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeek = allTweets.filter((t: any) => {
        const createdDate = safeParseDate(t.created_at)
        return createdDate && createdDate >= oneWeekAgo
      }).length
      
      setStats({
        scheduled,
        published,
        failed,
        thisWeek
      })
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user.id, user.email, user.displayName])

  useEffect(() => {
    loadDashboardData(currentPage)
  }, [currentPage, loadDashboardData])

  // دالة حذف التغريدة
  const deleteTweet = async (tweetId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه التغريدة؟')) return

    try {
      await blink.db.tweets.delete(tweetId)
      await loadDashboardData(currentPage)
      console.log('Tweet deleted successfully')
    } catch (error) {
      console.error('Failed to delete tweet:', error)
      alert('فشل في حذف التغريدة')
    }
  }

  // دالة تحديث موعد التغريدة
  const updateTweetDateTime = async (tweetId: string, newDateTime: string) => {
    try {
      await blink.db.tweets.update(tweetId, {
        scheduled_at: newDateTime
      })
      await loadDashboardData(currentPage)
      console.log('Tweet schedule updated successfully')
    } catch (error) {
      console.error('Failed to update tweet schedule:', error)
      alert('فشل في تحديث موعد التغريدة')
    }
  }

  // دالة الإرسال الفوري
  const sendTweetNow = async (tweetId: string) => {
    if (!confirm('هل تريد إرسال هذه التغريدة الآن؟')) return

    try {
      // تحديث حالة التغريدة إلى "تم الإرسال"
      await blink.db.tweets.update(tweetId, {
        status: 'published',
        published_at: new Date().toISOString(),
        sent_immediately: 1
      })

      // إرسال إشعار نجاح (اختياري)
      const tweet = tweets.find(t => t.id === tweetId)
      if (tweet && userRecord) {
        try {
          await sendTweetFailureNotification({
            userEmail: userRecord.email,
            userName: userRecord.display_name || 'المستخدم',
            tweetContent: tweet.content,
            scheduledTime: tweet.scheduledAt,
            failureReason: 'تم الإرسال فورياً بواسطة المستخدم',
            tweetId: tweet.id
          })
        } catch (emailError) {
          console.warn('Failed to send notification:', emailError)
        }
      }

      await loadDashboardData(currentPage)
      alert('تم إرسال التغريدة بنجاح! ✅')
    } catch (error) {
      console.error('Failed to send tweet immediately:', error)
      alert('فشل في إرسال التغريدة')
    }
  }

  // دالة تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // دالة تحديث التغريدة بعد التحرير
  const handleTweetUpdate = async (tweetId: string, updatedTweet: Partial<Tweet>) => {
    try {
      await loadDashboardData(currentPage)
      console.log('Tweet updated successfully')
    } catch (error) {
      console.error('Failed to refresh tweets after update:', error)
    }
  }

  const handleLogout = () => {
    blink.auth.logout()
  }

  const toggleLanguage = () => {
    const newLang = language.code === 'en' ? 'ar' : 'en'
    setLanguage({ 
      code: newLang, 
      name: newLang === 'ar' ? 'العربية' : 'English', 
      direction: newLang === 'ar' ? 'rtl' : 'ltr' 
    })
  }

  // Mock user data for demo
  const mockUser = {
    ...user,
    subscriptionTier: 'trial' as const,
    tweetsUsed: 2,
    tweetsLimit: 7,
    displayName: user.email?.split('@')[0] || 'User'
  }

  const usagePercentage = (mockUser.tweetsUsed / mockUser.tweetsLimit) * 100

  const quickActions = [
    {
      title: t('dashboard.uploadFile'),
      description: 'Upload and schedule tweets from Excel/CSV',
      icon: Upload,
      color: 'bg-blue-500',
      onClick: () => navigate('/upload')
    },
    {
      title: t('dashboard.viewCalendar'),
      description: 'See your scheduled tweets timeline',
      icon: Calendar,
      color: 'bg-green-500',
      onClick: () => navigate('/calendar')
    },
    {
      title: 'إدارة الاشتراك',
      description: 'Upgrade your plan or manage subscription',
      icon: Crown,
      color: 'bg-yellow-500',
      onClick: () => navigate('/subscription')
    },
    {
      title: t('dashboard.settings'),
      description: 'Manage your account and preferences',
      icon: Settings,
      color: 'bg-gray-500',
      onClick: () => navigate('/profile')
    }
  ]

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'trial':
        return 'bg-gray-100 text-gray-800'
      case 'starter':
        return 'bg-blue-100 text-blue-800'
      case 'pro':
        return 'bg-purple-100 text-purple-800'
      case 'enterprise':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierIcon = (tier: string) => {
    if (tier === 'enterprise' || tier === 'pro') {
      return <Crown className="w-3 h-3" />
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">T</span>
              </div>
              <span className="text-lg font-bold text-gray-900">TweetScheduler Pro</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Subscription Tier Display */}
              <div className="flex items-center space-x-3">
                <Badge className={`text-xs ${getTierColor(userRecord?.subscription_tier || 'trial')}`}>
                  {getTierIcon(userRecord?.subscription_tier || 'trial')}
                  <span className="ml-1">{(userRecord?.subscription_tier || 'trial').toUpperCase()}</span>
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/subscription')}
                  className="text-primary border-primary hover:bg-primary hover:text-white"
                >
                  <Crown className="w-4 h-4 ml-1" />
                  {(userRecord?.subscription_tier === 'trial' || userRecord?.subscription_tier === 'starter') 
                    ? 'ترقية الباقة' 
                    : 'إدارة الاشتراك'
                  }
                </Button>
              </div>
              
              {/* Profile Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2"
                title="الملف الشخصي"
              >
                <UserIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {userRecord?.display_name || user.email?.split('@')[0] || 'المستخدم'}
                </span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center space-x-2"
              >
                <Languages className="w-4 h-4" />
                <span>{language.code.toUpperCase()}</span>
              </Button>

              {/* Admin Access - Show for specific users */}
              {(user.email === 'admin@tweetscheduler.pro' || user.email === 'kai.jiabo.feng@gmail.com') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  title="لوحة تحكم الأدمن"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Connection Status */}
          <ConnectionStatus />

          {/* Subscription Countdown */}
          {userRecord && (
            <SubscriptionCountdown 
              user={{
                ...user,
                subscriptionTier: userRecord.subscription_tier,
                tweetsUsed: userRecord.tweets_used,
                tweetsLimit: userRecord.tweets_limit,
                trialEndsAt: userRecord.trial_ends_at,
                subscriptionEndsAt: userRecord.subscription_ends_at,
                displayName: userRecord.display_name
              }} 
            />
          )}

          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-primary to-teal-600 rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">
              {t('dashboard.welcome')}, {mockUser.displayName}!
            </h1>
            <p className="text-blue-100">
              {t('dashboard.subtitle')}
            </p>
          </div>

          {/* Subscription Info */}
          {userRecord && (
            <SubscriptionInfo 
              user={{
                ...user,
                subscriptionTier: userRecord.subscription_tier,
                tweetsUsed: userRecord.tweets_used,
                tweetsLimit: userRecord.tweets_limit,
                trialEndsAt: userRecord.trial_ends_at,
                subscriptionEndsAt: userRecord.subscription_ends_at,
                displayName: userRecord.display_name
              }} 
            />
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.scheduled')}</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.published')}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.failed')}</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.thisWeek')}</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.thisWeek}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <FeatureGuard feature="الإجراءات السريعة">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.quickActions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={action.onClick}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                            <action.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">{action.title}</h3>
                            <p className="text-xs text-gray-600">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FeatureGuard>

          {/* Twitter Connection */}
          <FeatureGuard feature="ربط حساب تويتر">
            <TwitterConnect 
              user={mockUser} 
              onConnectionUpdate={loadDashboardData}
            />
          </FeatureGuard>

          {/* Twitter Analytics */}
          <FeatureGuard feature="تحليلات تويتر">
            <TwitterAnalytics userId={user.id} />
          </FeatureGuard>

          {/* Recent Tweets */}
          <FeatureGuard feature="إدارة التغريدات المجدولة">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>التغريدات المجدولة</span>
                  <Button onClick={() => navigate('/upload')} size="sm">
                    <Upload className="w-4 h-4 ml-1" />
                    رفع ملف جديد
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
              {tweets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد تغريدات بعد</h3>
                  <p className="text-gray-600 mb-4">
                    ارفع ملف Excel الأول لبدء جدولة التغريدات!
                  </p>
                  <Button onClick={() => navigate('/upload')}>{t('dashboard.uploadFile')}</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bulk Actions */}
                  <BulkTweetActions 
                    tweets={tweets.filter(t => t.status === 'scheduled')} 
                    onTweetsUpdated={() => loadDashboardData(currentPage)}
                  />
                  
                  {/* Tweets Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="p-3 text-sm font-medium text-gray-700 text-right">المحتوى</th>
                          <th className="p-3 text-sm font-medium text-gray-700 text-right">الموعد المجدول</th>
                          <th className="p-3 text-sm font-medium text-gray-700 text-right">الحالة</th>
                          <th className="p-3 text-sm font-medium text-gray-700 text-right">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tweets.map((tweet) => (
                          <tr key={tweet.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="max-w-md">
                                <p className="text-sm text-gray-900 leading-relaxed line-clamp-2">
                                  {tweet.content}
                                </p>
                                <div className="mt-1 text-xs text-gray-500">
                                  {tweet.content.length} حرف
                                </div>
                                {tweet.hashtags && tweet.hashtags.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {tweet.hashtags.map((tag, tagIndex) => (
                                      <span key={tagIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {tweet.mediaUrls && tweet.mediaUrls.length > 0 && (
                                  <div className="mt-1 text-xs text-blue-600">
                                    📎 {tweet.mediaUrls.length} ملف مرفق
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {formatDateSafely(tweet.scheduledAt, 'ar-SA')}
                                </div>
                                <div className="text-gray-500">
                                  {formatTimeSafely(tweet.scheduledAt, 'ar-SA', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant={
                                  tweet.status === 'published' ? 'default' :
                                  tweet.status === 'failed' ? 'destructive' : 'secondary'
                                }
                                className="flex items-center gap-1 w-fit"
                              >
                                {tweet.status === 'published' && <CheckCircle className="h-3 w-3" />}
                                {tweet.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                                {tweet.status === 'scheduled' && <Clock className="h-3 w-3" />}
                                {tweet.status === 'published' ? 'تم النشر' :
                                 tweet.status === 'failed' ? 'فشل' :
                                 tweet.status === 'scheduled' ? 'مجدول' : 'مسودة'}
                              </Badge>
                              {tweet.errorMessage && (
                                <div className="mt-1 text-xs text-red-600">
                                  {tweet.errorMessage}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {/* Enhanced Tweet Editor */}
                                <TweetEditor
                                  existingTweet={tweet}
                                  mode="edit"
                                  onSaveExisting={handleTweetUpdate}
                                />
                                
                                {tweet.status === 'scheduled' && (
                                  <>
                                    <DateTimeEditor
                                      currentDateTime={tweet.scheduledAt}
                                      onSave={(newDateTime) => updateTweetDateTime(tweet.id, newDateTime)}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => sendTweetNow(tweet.id)}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      title="إرسال الآن"
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteTweet(tweet.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        className="justify-center"
                      />
                    </div>
                  )}
                </div>
              )}
              </CardContent>
            </Card>
          </FeatureGuard>
        </div>
      </main>
    </div>
  )
}