import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { blink } from '../blink/client'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  UserPlus, 
  UserMinus, 
  MessageSquare,
  Calendar,
  RefreshCw,
  BarChart3,
  Activity,
  AlertCircle
} from 'lucide-react'

interface TwitterAnalyticsProps {
  userId: string
}

interface AnalyticsData {
  date: string
  followers_count: number
  following_count: number
  tweets_count: number
  followers_gained: number
  followers_lost: number
  net_followers_change: number
}

interface AccountStats {
  username: string
  display_name: string
  followers_count: number
  following_count: number
  tweets_count: number
  likes_count: number
  verified: number
  last_sync_at: string
}

export default function TwitterAnalytics({ userId }: TwitterAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d')

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load account stats with error handling
      try {
        const accountData = await blink.db.twitter_account_stats.list({
          where: { user_id: userId },
          limit: 1
        })
        
        if (accountData && accountData.length > 0) {
          const stats = accountData[0]
          // Ensure all numeric fields have valid values with proper null/undefined checks
          const safeStats = {
            ...stats,
            followers_count: Number(stats?.followers_count) || 0,
            following_count: Number(stats?.following_count) || 0,
            tweets_count: Number(stats?.tweets_count) || 0,
            likes_count: Number(stats?.likes_count) || 0,
            verified: Number(stats?.verified) || 0,
            last_sync_at: stats?.last_sync_at || new Date().toISOString()
          }
          setAccountStats(safeStats)
        }
      } catch (accountError) {
        console.warn('Failed to load account stats:', accountError)
        // Continue without account stats
      }

      // Load analytics data - use simple filtering to avoid SQL syntax issues
      try {
        // First get all analytics for the user
        const allAnalyticsData = await blink.db.twitter_analytics.list({
          where: { user_id: userId },
          orderBy: { date: 'desc' }
        })

        // Filter by period on the client side to avoid complex SQL
        let filteredData = allAnalyticsData
        if (period !== 'all') {
          const daysBack = period === '7d' ? 7 : 30
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - daysBack)
          const startDateStr = startDate.toISOString().split('T')[0]
          
          filteredData = allAnalyticsData.filter(item => item.date >= startDateStr)
        }

        // Apply limit after filtering
        const limitedData = filteredData.slice(0, period === 'all' ? 100 : (period === '30d' ? 30 : 7))
        
        // Ensure all numeric fields have valid values with proper null/undefined checks
        const analyticsData = limitedData.map(item => ({
          ...item,
          followers_count: Number(item?.followers_count) || 0,
          following_count: Number(item?.following_count) || 0,
          tweets_count: Number(item?.tweets_count) || 0,
          followers_gained: Number(item?.followers_gained) || 0,
          followers_lost: Number(item?.followers_lost) || 0,
          net_followers_change: Number(item?.net_followers_change) || 0,
          date: item?.date || new Date().toISOString().split('T')[0]
        }))

        setAnalytics(analyticsData)
      } catch (analyticsError) {
        console.error('Failed to load analytics data:', analyticsError)
        // Log the specific error details for debugging
        if (analyticsError instanceof Error) {
          console.error('Analytics error details:', {
            message: analyticsError.message,
            name: analyticsError.name,
            stack: analyticsError.stack
          })
        }
        // Set empty analytics array to show the empty state
        setAnalytics([])
      }
    } catch (error) {
      console.error('Failed to load Twitter analytics:', error)
      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error('Main analytics error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      // Ensure we always set empty state on error
      setAnalytics([])
      setAccountStats(null)
    } finally {
      setLoading(false)
    }
  }, [userId, period])

  const syncTwitterData = async () => {
    try {
      setSyncing(true)
      
      // In a real implementation, this would call Twitter API
      // For demo purposes, we'll simulate data
      const today = new Date().toISOString().split('T')[0]
      
      // Check if account stats already exist for this user
      const existingStats = await blink.db.twitter_account_stats.list({
        where: { user_id: userId },
        limit: 1
      })
      
      // Simulate account stats with guaranteed numeric values
      const mockAccountStats = {
        username: 'user_demo',
        display_name: 'Demo User',
        bio: 'Content creator using TweetScheduler Pro',
        followers_count: Math.floor(Math.random() * 10000) + 1000,
        following_count: Math.floor(Math.random() * 1000) + 100,
        tweets_count: Math.floor(Math.random() * 5000) + 500,
        likes_count: Math.floor(Math.random() * 50000) + 5000,
        verified: 0,
        last_sync_at: new Date().toISOString()
      }

      // Update or create account stats
      if (existingStats && existingStats.length > 0) {
        // Update existing record
        await blink.db.twitter_account_stats.update(existingStats[0].id, mockAccountStats)
      } else {
        // Create new record
        await blink.db.twitter_account_stats.create({
          user_id: userId,
          ...mockAccountStats,
          created_at: new Date().toISOString()
        })
      }

      // Check if analytics already exist for today
      const existingAnalytics = await blink.db.twitter_analytics.list({
        where: { 
          user_id: userId,
          date: today
        },
        limit: 1
      })
      
      // Simulate daily analytics
      const followersGained = Math.floor(Math.random() * 50) + 1
      const followersLost = Math.floor(Math.random() * 20)
      const mockAnalytics = {
        user_id: userId,
        date: today,
        followers_count: mockAccountStats.followers_count,
        following_count: mockAccountStats.following_count,
        tweets_count: mockAccountStats.tweets_count,
        followers_gained: followersGained,
        followers_lost: followersLost,
        net_followers_change: followersGained - followersLost
      }

      // Update or create today's analytics
      if (existingAnalytics && existingAnalytics.length > 0) {
        // Update existing analytics
        await blink.db.twitter_analytics.update(existingAnalytics[0].id, mockAnalytics)
      } else {
        // Create new analytics record
        await blink.db.twitter_analytics.create(mockAnalytics)
      }

      await loadAnalytics()
      
      alert('تم تحديث بيانات تويتر بنجاح! ✅')
    } catch (error) {
      console.error('Failed to sync Twitter data:', error)
      
      // Handle specific constraint violation errors
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate')) {
          alert('تم تحديث البيانات مسبقاً. جاري إعادة تحميل البيانات...')
          await loadAnalytics() // Reload data even if sync failed due to duplicates
        } else {
          alert(`فشل في تحديث بيانات تويتر: ${error.message}`)
        }
      } else {
        alert('فشل في تحديث بيانات تويتر')
      }
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const calculateTotals = () => {
    if (!analytics || analytics.length === 0) return { totalGained: 0, totalLost: 0, netChange: 0 }
    
    const totalGained = analytics.reduce((sum, day) => {
      const gained = Number(day?.followers_gained) || 0
      return sum + gained
    }, 0)
    
    const totalLost = analytics.reduce((sum, day) => {
      const lost = Number(day?.followers_lost) || 0
      return sum + lost
    }, 0)
    
    const netChange = totalGained - totalLost
    
    return { totalGained, totalLost, netChange }
  }

  const { totalGained, totalLost, netChange } = calculateTotals()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="mr-2">جاري تحميل التحليلات...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Safety check to prevent rendering errors
  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-gray-600 mb-4">
              حدث خطأ أثناء تحميل بيانات التحليلات
            </p>
            <Button onClick={() => loadAnalytics()}>
              <RefreshCw className="h-4 w-4 ml-2" />
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Stats Card */}
      {accountStats && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                إحصائيات الحساب
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={syncTwitterData}
                disabled={syncing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'جاري التحديث...' : 'تحديث البيانات'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {(Number(accountStats?.followers_count) || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">المتابعون</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <UserPlus className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {(Number(accountStats?.following_count) || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">يتابع</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {(Number(accountStats?.tweets_count) || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">التغريدات</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">
                  {(Number(accountStats?.likes_count) || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">الإعجابات</div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-500">
                آخر تحديث: {accountStats?.last_sync_at ? new Date(accountStats.last_sync_at).toLocaleDateString('ar-SA') : 'غير محدد'}
              </div>
              {Number(accountStats?.verified) === 1 && (
                <Badge className="mt-2 bg-blue-100 text-blue-800">
                  ✓ حساب موثق
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Period Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              تحليلات المتابعين
            </CardTitle>
            <div className="flex gap-2">
              {(['7d', '30d', 'all'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                >
                  {p === '7d' ? '7 أيام' : p === '30d' ? '30 يوم' : 'الكل'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analytics.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات تحليلية</h3>
              <p className="text-gray-600 mb-4">
                ابدأ بمزامنة بيانات تويتر لرؤية التحليلات
              </p>
              <Button onClick={syncTwitterData} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 ml-2 ${syncing ? 'animate-spin' : ''}`} />
                مزامنة البيانات
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <UserPlus className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">+{totalGained}</div>
                  <div className="text-sm text-gray-600">متابعون جدد</div>
                </div>
                
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <UserMinus className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">-{totalLost}</div>
                  <div className="text-sm text-gray-600">إلغاء متابعة</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  {netChange >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  )}
                  <div className={`text-2xl font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netChange >= 0 ? '+' : ''}{netChange}
                  </div>
                  <div className="text-sm text-gray-600">صافي التغيير</div>
                </div>
              </div>

              {/* Daily Analytics Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3 text-sm font-medium text-gray-700 text-right">التاريخ</th>
                      <th className="p-3 text-sm font-medium text-gray-700 text-right">المتابعون</th>
                      <th className="p-3 text-sm font-medium text-gray-700 text-right">جدد</th>
                      <th className="p-3 text-sm font-medium text-gray-700 text-right">إلغاء</th>
                      <th className="p-3 text-sm font-medium text-gray-700 text-right">صافي</th>
                      <th className="p-3 text-sm font-medium text-gray-700 text-right">معدل النمو</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((day, index) => {
                      const followersCount = Number(day?.followers_count) || 0
                      const followersGained = Number(day?.followers_gained) || 0
                      const followersLost = Number(day?.followers_lost) || 0
                      const netChange = Number(day?.net_followers_change) || 0
                      
                      const growthRate = followersCount > 0 
                        ? ((netChange / followersCount) * 100).toFixed(2)
                        : '0.00'
                      
                      return (
                        <tr key={day.date || index} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            {day?.date ? new Date(day.date).toLocaleDateString('ar-SA') : 'غير محدد'}
                          </td>
                          <td className="p-3 text-sm font-medium">
                            {followersCount.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-green-600">
                            +{followersGained}
                          </td>
                          <td className="p-3 text-sm text-red-600">
                            -{followersLost}
                          </td>
                          <td className={`p-3 text-sm font-medium ${
                            netChange >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {netChange >= 0 ? '+' : ''}{netChange}
                          </td>
                          <td className={`p-3 text-sm ${
                            parseFloat(growthRate) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {growthRate}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}