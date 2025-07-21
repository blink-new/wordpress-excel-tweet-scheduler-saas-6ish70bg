import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Edit3, Trash2, Eye, BarChart3, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/hooks/useLanguage'
import { blink } from '@/blink/client'
import { Tweet } from '@/types'
import FeatureGuard from '@/components/FeatureGuard'
import { safeParseDate, formatDateSafely, formatTimeSafely, createSafeDate, addDays, safeDateToISOString } from '@/utils/dateUtils'

interface CalendarDay {
  date: Date
  tweets: Tweet[]
  isCurrentMonth: boolean
  isToday: boolean
}

export default function CalendarPage() {
  const { t, isRTL } = useLanguage()
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadTweets = async () => {
    try {
      const user = await blink.auth.me()
      const tweetsData = await blink.db.tweets.list({
        where: { user_id: user.id },
        orderBy: { scheduled_at: 'asc' }
      })
      
      // Convert database format to frontend format with safe date parsing
      const formattedTweets: Tweet[] = tweetsData.map((tweet: any) => ({
        id: tweet.id,
        userId: tweet.user_id,
        content: tweet.content,
        scheduledAt: safeDateToISOString(tweet.scheduled_at) || new Date().toISOString(),
        status: tweet.status,
        platform: tweet.platform || 'twitter',
        mediaUrls: tweet.media_urls ? JSON.parse(tweet.media_urls) : [],
        hashtags: tweet.hashtags ? JSON.parse(tweet.hashtags) : [],
        createdAt: safeDateToISOString(tweet.created_at) || new Date().toISOString(),
        publishedAt: tweet.published_at ? safeDateToISOString(tweet.published_at) : undefined,
        errorMessage: tweet.error_message
      }))
      
      setTweets(formattedTweets)
    } catch (error) {
      console.error('Error loading tweets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTweets()
  }, [])

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = createSafeDate(year, month, 1)
    if (!firstDay) return []
    
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days: CalendarDay[] = []
    const today = new Date()
    
    for (let i = 0; i < 42; i++) {
      const date = addDays(startDate, i)
      if (!date) continue
      
      const dayTweets = tweets.filter(tweet => {
        const tweetDate = safeParseDate(tweet.scheduledAt)
        if (!tweetDate) return false
        return tweetDate.toDateString() === date.toDateString()
      })
      
      days.push({
        date,
        tweets: dayTweets,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString()
      })
    }
    
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTweets = tweets.filter(tweet => 
    filterStatus === 'all' || tweet.status === filterStatus
  )

  const selectedDateTweets = selectedDate 
    ? tweets.filter(tweet => {
        const tweetDate = safeParseDate(tweet.scheduledAt)
        if (!tweetDate) return false
        return tweetDate.toDateString() === selectedDate.toDateString()
      })
    : []

  const calendarDays = generateCalendarDays()
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <FeatureGuard feature="تقويم التغريدات المجدولة">
      <div className={`min-h-screen bg-gray-50 p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('calendar.title')}
            </h1>
            <p className="text-gray-600">
              {t('calendar.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('calendar.filter.all')}</SelectItem>
                <SelectItem value="scheduled">{t('calendar.filter.scheduled')}</SelectItem>
                <SelectItem value="published">{t('calendar.filter.published')}</SelectItem>
                <SelectItem value="failed">{t('calendar.filter.failed')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('calendar.analytics')}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                    >
                      ←
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      {t('calendar.today')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                    >
                      →
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`
                        p-2 min-h-[80px] border rounded-lg cursor-pointer transition-colors
                        ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
                        ${day.isToday ? 'ring-2 ring-primary' : ''}
                        ${selectedDate?.toDateString() === day.date.toDateString() ? 'bg-primary/10' : ''}
                      `}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <div className="text-sm font-medium mb-1">
                        {day.date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {day.tweets.slice(0, 2).map((tweet, tweetIndex) => (
                          <div
                            key={tweetIndex}
                            className={`
                              text-xs px-1 py-0.5 rounded truncate
                              ${getStatusColor(tweet.status)}
                            `}
                          >
                            {formatTimeSafely(tweet.scheduledAt, 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        ))}
                        {day.tweets.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{day.tweets.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Details */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardTitle>
                  <CardDescription>
                    {selectedDateTweets.length} {t('calendar.tweetsScheduled')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDateTweets.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        {t('calendar.noTweets')}
                      </p>
                    ) : (
                      selectedDateTweets.map((tweet) => (
                        <div key={tweet.id} className="border rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getStatusColor(tweet.status)}>
                              {t(`upload.status.${tweet.status}`)}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatTimeSafely(tweet.scheduledAt, 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <p className="text-sm text-gray-900 line-clamp-3">
                            {tweet.content}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('calendar.quickStats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('calendar.stats.total')}</span>
                    <span className="font-medium">{filteredTweets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('calendar.stats.scheduled')}</span>
                    <span className="font-medium text-blue-600">
                      {filteredTweets.filter(t => t.status === 'scheduled').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('calendar.stats.published')}</span>
                    <span className="font-medium text-green-600">
                      {filteredTweets.filter(t => t.status === 'published').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('calendar.stats.failed')}</span>
                    <span className="font-medium text-red-600">
                      {filteredTweets.filter(t => t.status === 'failed').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </FeatureGuard>
  )
}