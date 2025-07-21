import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  Lock, 
  Crown, 
  AlertTriangle, 
  Clock, 
  Zap,
  ArrowRight,
  CheckCircle,
  X
} from 'lucide-react'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'

interface FeatureGuardProps {
  children: React.ReactNode
  feature?: string
  showUpgradeCard?: boolean
  className?: string
}

export default function FeatureGuard({ 
  children, 
  feature = 'هذه الميزة',
  showUpgradeCard = true,
  className = ''
}: FeatureGuardProps) {
  const { canUseFeatures, isExpired, isTrialExpired, daysRemaining, hoursRemaining, user, needsUpgrade } = useSubscriptionStatus()

  // If user can use features, show the content
  if (canUseFeatures) {
    return <>{children}</>
  }

  // If features are blocked, show upgrade card
  if (!showUpgradeCard) {
    return null
  }

  const getExpiryMessage = () => {
    if (isTrialExpired) {
      return {
        title: 'انتهت فترة التجربة المجانية',
        message: 'لقد انتهت فترة التجربة المجانية الخاصة بك. قم بالترقية للمتابعة.',
        icon: <Clock className="w-6 h-6 text-orange-500" />,
        color: 'border-orange-200 bg-orange-50'
      }
    } else if (isExpired) {
      return {
        title: 'انتهى الاشتراك',
        message: 'لقد انتهى اشتراكك. قم بتجديد الاشتراك لاستعادة الوصول لجميع المميزات.',
        icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
        color: 'border-red-200 bg-red-50'
      }
    } else {
      return {
        title: 'الوصول محدود',
        message: 'تحتاج إلى ترقية اشتراكك للوصول لهذه الميزة.',
        icon: <Lock className="w-6 h-6 text-gray-500" />,
        color: 'border-gray-200 bg-gray-50'
      }
    }
  }

  const expiryInfo = getExpiryMessage()

  const subscriptionPlans = [
    {
      name: 'مبتدئ',
      nameEn: 'Starter',
      price: 19,
      tweetsLimit: 30,
      features: ['30 تغريدة شهرياً', 'جدولة أساسية', 'دعم فني'],
      popular: false
    },
    {
      name: 'محترف',
      nameEn: 'Pro', 
      price: 39,
      tweetsLimit: 120,
      features: ['120 تغريدة شهرياً', 'دعم متعدد المنصات', 'إحصائيات متقدمة'],
      popular: true
    },
    {
      name: 'مؤسسي',
      nameEn: 'Enterprise',
      price: 99,
      tweetsLimit: 'غير محدود',
      features: ['تغريدات غير محدودة', 'دعم أولوية', 'فرق وحسابات فرعية'],
      popular: false
    }
  ]

  return (
    <div className={`${className}`}>
      <Card className={`${expiryInfo.color} border-2`}>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            {expiryInfo.icon}
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            {expiryInfo.title}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {expiryInfo.message}
          </p>
          
          {user && (
            <div className="mt-3 flex justify-center">
              <Badge variant="outline" className="text-sm">
                الخطة الحالية: {user.subscription_tier === 'trial' ? 'تجريبي' : user.subscription_tier}
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Blocked Feature Info */}
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <X className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">الميزة محجوبة</h3>
                <p className="text-sm text-gray-600">
                  {feature} غير متاحة في خطتك الحالية
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Plans */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center text-gray-900 mb-4">
              اختر خطة الاشتراك المناسبة
            </h3>
            
            <div className="grid gap-4 md:grid-cols-3">
              {subscriptionPlans.map((plan, index) => (
                <div 
                  key={index}
                  className={`relative rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                    plan.popular 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white px-3 py-1">
                        <Crown className="w-3 h-3 ml-1" />
                        الأكثر شعبية
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <h4 className="font-bold text-lg text-gray-900">{plan.name}</h4>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600 text-sm mr-1">ريال/شهر</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {typeof plan.tweetsLimit === 'string' ? plan.tweetsLimit : `${plan.tweetsLimit} تغريدة`}
                    </p>
                  </div>
                  
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full mt-4 ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                    onClick={() => {
                      // TODO: Implement subscription upgrade
                      alert(`ترقية إلى خطة ${plan.name} - قريباً!`)
                    }}
                  >
                    <Zap className="w-4 h-4 ml-2" />
                    ترقية الآن
                    <ArrowRight className="w-4 h-4 mr-2" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Contact Support */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">
              هل تحتاج مساعدة في اختيار الخطة المناسبة؟
            </p>
            <Button variant="outline" size="sm">
              تواصل مع الدعم الفني
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}