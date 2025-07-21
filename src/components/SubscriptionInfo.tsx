import React from 'react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Crown, Clock, AlertTriangle, CheckCircle, Lock } from 'lucide-react'
import { User } from '../types'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'

interface SubscriptionInfoProps {
  user: User
  className?: string
}

export default function SubscriptionInfo({ user, className = '' }: SubscriptionInfoProps) {
  const { canUseFeatures, isExpired, needsUpgrade } = useSubscriptionStatus()
  
  const getTimeRemaining = () => {
    const now = new Date()
    let expiryDate: Date | null = null

    if (user.subscriptionTier === 'trial' && user.trialEndsAt) {
      expiryDate = new Date(user.trialEndsAt)
    } else if (user.subscriptionEndsAt) {
      expiryDate = new Date(user.subscriptionEndsAt)
    }

    if (!expiryDate) return null

    const timeDiff = expiryDate.getTime() - now.getTime()
    
    if (timeDiff <= 0) {
      return { expired: true, text: 'منتهي الصلاحية' }
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) {
      return { 
        expired: false, 
        text: `${days} يوم متبقي`,
        urgent: days <= 3
      }
    } else if (hours > 0) {
      return { 
        expired: false, 
        text: `${hours} ساعة متبقية`,
        urgent: true
      }
    } else {
      return { 
        expired: false, 
        text: 'أقل من ساعة متبقية',
        urgent: true
      }
    }
  }

  const timeRemaining = getTimeRemaining()
  
  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'trial':
        return {
          name: 'تجريبي',
          color: 'bg-gray-100 text-gray-800',
          icon: <Clock className="w-3 h-3" />
        }
      case 'starter':
        return {
          name: 'مبتدئ',
          color: 'bg-blue-100 text-blue-800',
          icon: <CheckCircle className="w-3 h-3" />
        }
      case 'pro':
        return {
          name: 'محترف',
          color: 'bg-purple-100 text-purple-800',
          icon: <Crown className="w-3 h-3" />
        }
      case 'enterprise':
        return {
          name: 'مؤسسي',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Crown className="w-3 h-3" />
        }
      default:
        return {
          name: 'غير محدد',
          color: 'bg-gray-100 text-gray-800',
          icon: null
        }
    }
  }

  const tierInfo = getTierInfo(user.subscriptionTier)

  return (
    <Card className={`${className} ${isExpired ? 'border-red-300 bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={`text-xs ${tierInfo.color} flex items-center gap-1`}>
              {tierInfo.icon}
              {tierInfo.name}
            </Badge>
            
            {isExpired && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <Lock className="w-3 h-3" />
                <span className="font-medium">الاشتراك منتهي - الميزات محجوبة</span>
              </div>
            )}
            
            {!isExpired && timeRemaining && (
              <div className={`flex items-center gap-1 text-xs ${
                timeRemaining.expired 
                  ? 'text-red-600' 
                  : timeRemaining.urgent 
                    ? 'text-orange-600' 
                    : 'text-gray-600'
              }`}>
                {timeRemaining.expired ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                <span>{timeRemaining.text}</span>
              </div>
            )}
          </div>

          {(isExpired || timeRemaining?.expired || timeRemaining?.urgent) && (
            <Button size="sm" variant={isExpired ? "default" : "outline"} className="text-xs">
              {isExpired ? 'تجديد الاشتراك' : 'ترقية الاشتراك'}
            </Button>
          )}
        </div>

        {/* Usage Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>التغريدات المستخدمة</span>
            <span>{user.tweetsUsed} / {user.tweetsLimit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                (user.tweetsUsed / user.tweetsLimit) > 0.8 
                  ? 'bg-red-500' 
                  : (user.tweetsUsed / user.tweetsLimit) > 0.6 
                    ? 'bg-orange-500' 
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((user.tweetsUsed / user.tweetsLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}