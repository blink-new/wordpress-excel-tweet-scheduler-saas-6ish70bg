import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Clock, AlertTriangle, Crown, Zap } from 'lucide-react'
import { User } from '../types'

interface SubscriptionCountdownProps {
  user: User
  className?: string
}

export default function SubscriptionCountdown({ user, className = '' }: SubscriptionCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    expired: boolean
    urgent: boolean
  } | null>(null)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      let expiryDate: Date | null = null

      if (user.subscriptionTier === 'trial' && user.trialEndsAt) {
        expiryDate = new Date(user.trialEndsAt)
      } else if (user.subscriptionEndsAt) {
        expiryDate = new Date(user.subscriptionEndsAt)
      }

      if (!expiryDate) {
        setTimeRemaining(null)
        return
      }

      const timeDiff = expiryDate.getTime() - now.getTime()
      
      if (timeDiff <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
          urgent: true
        })
        return
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        expired: false,
        urgent: days <= 1 // عاجل إذا كان أقل من يوم
      })
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [user.trialEndsAt, user.subscriptionEndsAt, user.subscriptionTier])

  if (!timeRemaining) return null

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'trial':
        return {
          name: 'الفترة التجريبية',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <Clock className="w-4 h-4" />
        }
      case 'starter':
        return {
          name: 'خطة المبتدئ',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Zap className="w-4 h-4" />
        }
      case 'pro':
        return {
          name: 'خطة المحترف',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <Crown className="w-4 h-4" />
        }
      case 'enterprise':
        return {
          name: 'خطة المؤسسات',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Crown className="w-4 h-4" />
        }
      default:
        return {
          name: 'غير محدد',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Clock className="w-4 h-4" />
        }
    }
  }

  const tierInfo = getTierInfo(user.subscriptionTier)

  if (timeRemaining.expired) {
    return (
      <Card className={`${className} border-red-300 bg-red-50 shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold text-lg">انتهت صلاحية الاشتراك!</span>
              </div>
              <Badge className="bg-red-100 text-red-800 border-red-200">
                {tierInfo.icon}
                <span className="mr-1">{tierInfo.name}</span>
              </Badge>
            </div>
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              تجديد الاشتراك الآن
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} ${
      timeRemaining.urgent 
        ? 'border-orange-300 bg-orange-50 shadow-lg' 
        : 'border-blue-300 bg-blue-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {timeRemaining.urgent ? (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              ) : (
                <Clock className="w-5 h-5 text-blue-600" />
              )}
              <span className={`font-semibold ${
                timeRemaining.urgent ? 'text-orange-800' : 'text-blue-800'
              }`}>
                {timeRemaining.urgent ? 'ينتهي قريباً!' : 'وقت متبقي:'}
              </span>
            </div>
            
            <Badge className={tierInfo.color}>
              {tierInfo.icon}
              <span className="mr-1">{tierInfo.name}</span>
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* العداد التنازلي */}
            <div className="flex items-center gap-2 text-lg font-mono">
              {timeRemaining.days > 0 && (
                <div className="flex flex-col items-center">
                  <span className={`font-bold ${
                    timeRemaining.urgent ? 'text-orange-700' : 'text-blue-700'
                  }`}>
                    {timeRemaining.days}
                  </span>
                  <span className="text-xs text-gray-600">يوم</span>
                </div>
              )}
              
              {(timeRemaining.days > 0 || timeRemaining.hours > 0) && (
                <>
                  {timeRemaining.days > 0 && <span className="text-gray-400">:</span>}
                  <div className="flex flex-col items-center">
                    <span className={`font-bold ${
                      timeRemaining.urgent ? 'text-orange-700' : 'text-blue-700'
                    }`}>
                      {timeRemaining.hours.toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs text-gray-600">ساعة</span>
                  </div>
                </>
              )}
              
              <span className="text-gray-400">:</span>
              <div className="flex flex-col items-center">
                <span className={`font-bold ${
                  timeRemaining.urgent ? 'text-orange-700' : 'text-blue-700'
                }`}>
                  {timeRemaining.minutes.toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-gray-600">دقيقة</span>
              </div>
              
              <span className="text-gray-400">:</span>
              <div className="flex flex-col items-center">
                <span className={`font-bold ${
                  timeRemaining.urgent ? 'text-orange-700' : 'text-blue-700'
                }`}>
                  {timeRemaining.seconds.toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-gray-600">ثانية</span>
              </div>
            </div>

            {timeRemaining.urgent && (
              <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                ترقية الاشتراك
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}