import React, { useState, useEffect } from 'react'
import { createClient } from '@blinkdotnew/sdk'
import { Check, Crown, Zap, Building, Star, CreditCard, AlertCircle } from 'lucide-react'

const blink = createClient({
  projectId: 'wordpress-excel-tweet-scheduler-saas-6ish70bg',
  authRequired: true
})

interface SubscriptionPlan {
  id: string
  name: string
  nameAr: string
  price: number
  duration: string
  tweetLimit: number
  features: string[]
  featuresAr: string[]
  popular?: boolean
  icon: React.ReactNode
  color: string
}

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  tweets_used: number
  created_at: string
}

const plans: SubscriptionPlan[] = [
  {
    id: 'trial',
    name: 'Free Trial',
    nameAr: 'تجربة مجانية',
    price: 0,
    duration: '3 Days',
    tweetLimit: 7,
    features: [
      'Upload Excel/CSV files',
      'Schedule 7 tweets',
      'Basic dashboard',
      'Email support'
    ],
    featuresAr: [
      'رفع ملفات Excel/CSV',
      'جدولة 7 تغريدات',
      'لوحة تحكم أساسية',
      'دعم عبر البريد الإلكتروني'
    ],
    icon: <Star className="w-6 h-6" />,
    color: 'from-gray-400 to-gray-600'
  },
  {
    id: 'starter',
    name: 'Starter',
    nameAr: 'المبتدئ',
    price: 19,
    duration: 'Monthly',
    tweetLimit: 30,
    features: [
      'Upload Excel/CSV files',
      'Schedule 30 tweets/month',
      'Tweet preview & editing',
      'Basic analytics',
      'Email support'
    ],
    featuresAr: [
      'رفع ملفات Excel/CSV',
      'جدولة 30 تغريدة شهرياً',
      'معاينة وتحرير التغريدات',
      'تحليلات أساسية',
      'دعم عبر البريد الإلكتروني'
    ],
    icon: <Zap className="w-6 h-6" />,
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'pro',
    name: 'Pro',
    nameAr: 'المحترف',
    price: 39,
    duration: 'Monthly',
    tweetLimit: 120,
    popular: true,
    features: [
      'Upload Excel/CSV files',
      'Schedule 120 tweets/month',
      'Advanced analytics',
      'Tweet templates',
      'Priority support',
      'Multi-platform support (coming soon)'
    ],
    featuresAr: [
      'رفع ملفات Excel/CSV',
      'جدولة 120 تغريدة شهرياً',
      'تحليلات متقدمة',
      'قوالب التغريدات',
      'دعم أولوية',
      'دعم منصات متعددة (قريباً)'
    ],
    icon: <Crown className="w-6 h-6" />,
    color: 'from-purple-400 to-purple-600'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    nameAr: 'المؤسسات',
    price: 99,
    duration: 'Monthly',
    tweetLimit: -1, // Unlimited
    features: [
      'Unlimited tweets',
      'Team collaboration',
      'Advanced analytics & reporting',
      'Custom integrations',
      'Dedicated account manager',
      'Priority support',
      'White-label options'
    ],
    featuresAr: [
      'تغريدات غير محدودة',
      'تعاون الفريق',
      'تحليلات وتقارير متقدمة',
      'تكاملات مخصصة',
      'مدير حساب مخصص',
      'دعم أولوية',
      'خيارات العلامة البيضاء'
    ],
    icon: <Building className="w-6 h-6" />,
    color: 'from-emerald-400 to-emerald-600'
  }
]

export default function SubscriptionPlans() {
  const [isArabic, setIsArabic] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState(false)

  const loadCurrentSubscription = async (userId: string) => {
    try {
      setLoading(true)
      const subscriptions = await blink.db.user_subscriptions.list({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        limit: 1
      })

      if (subscriptions.length > 0) {
        setCurrentSubscription(subscriptions[0])
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadCurrentSubscription(state.user.id)
      }
    })
    return unsubscribe
  }, [])

  const handleUpgrade = async (planId: string) => {
    if (!user) return

    setSelectedPlan(planId)
    setUpgrading(true)

    try {
      // For now, simulate the upgrade process
      // In a real implementation, this would integrate with Stripe or local payment gateways
      
      const plan = plans.find(p => p.id === planId)
      if (!plan) return

      // Create or update subscription record
      const subscriptionData = {
        id: `sub_${user.id}_${planId}_${Date.now()}`,
        user_id: user.id,
        plan_id: planId,
        status: planId === 'trial' ? 'trialing' : 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (planId === 'trial' ? 3 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)).toISOString(),
        tweets_used: 0,
        created_at: new Date().toISOString()
      }

      await blink.db.user_subscriptions.create(subscriptionData)
      
      // Update user's subscription status
      await blink.db.users.update(user.id, {
        subscription_plan: planId,
        subscription_status: subscriptionData.status
      })

      setCurrentSubscription(subscriptionData)
      
      // Show success message
      alert(isArabic ? 'تم تفعيل الاشتراك بنجاح!' : 'Subscription activated successfully!')
      
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert(isArabic ? 'حدث خطأ في تفعيل الاشتراك' : 'Error activating subscription')
    } finally {
      setUpgrading(false)
      setSelectedPlan(null)
    }
  }

  const getCurrentPlan = () => {
    if (!currentSubscription) return plans[0] // Default to trial
    return plans.find(p => p.id === currentSubscription.plan_id) || plans[0]
  }

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_id === planId
  }

  const canUpgrade = (planId: string) => {
    const currentPlan = getCurrentPlan()
    const targetPlan = plans.find(p => p.id === planId)
    if (!targetPlan) return false
    
    const currentIndex = plans.findIndex(p => p.id === currentPlan.id)
    const targetIndex = plans.findIndex(p => p.id === planId)
    
    return targetIndex > currentIndex
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{isArabic ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${isArabic ? 'rtl' : 'ltr'}`}>
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIsArabic(!isArabic)}
          className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
        >
          {isArabic ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {isArabic ? 'خطط الاشتراك' : 'Subscription Plans'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {isArabic 
              ? 'اختر الخطة المناسبة لك وابدأ في جدولة تغريداتك بسهولة'
              : 'Choose the perfect plan for your needs and start scheduling your tweets effortlessly'
            }
          </p>
          
          {currentSubscription && (
            <div className="mt-6 inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" />
              <span className="font-medium">
                {isArabic 
                  ? `الخطة الحالية: ${getCurrentPlan().nameAr}`
                  : `Current Plan: ${getCurrentPlan().name}`
                }
              </span>
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 ${
                plan.popular ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-2 text-sm font-semibold">
                  {isArabic ? 'الأكثر شعبية' : 'Most Popular'}
                </div>
              )}

              <div className={`p-8 ${plan.popular ? 'pt-12' : ''}`}>
                {/* Plan Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${plan.color} text-white mb-4`}>
                  {plan.icon}
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {isArabic ? plan.nameAr : plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? (isArabic ? 'مجاني' : 'Free') : `${plan.price} ر.س`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-500">
                        /{isArabic ? 'شهر' : 'month'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {plan.tweetLimit === -1 
                      ? (isArabic ? 'تغريدات غير محدودة' : 'Unlimited tweets')
                      : `${plan.tweetLimit} ${isArabic ? 'تغريدة' : 'tweets'} / ${isArabic ? 'شهر' : 'month'}`
                    }
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {(isArabic ? plan.featuresAr : plan.features).map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrentPlan(plan.id) || upgrading || (selectedPlan === plan.id)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                    isCurrentPlan(plan.id)
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : canUpgrade(plan.id) || plan.id === 'trial'
                      ? `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg transform hover:-translate-y-0.5`
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {upgrading && selectedPlan === plan.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isArabic ? 'جاري التفعيل...' : 'Activating...'}
                    </div>
                  ) : isCurrentPlan(plan.id) ? (
                    isArabic ? 'الخطة الحالية' : 'Current Plan'
                  ) : canUpgrade(plan.id) || plan.id === 'trial' ? (
                    <>
                      <CreditCard className="w-4 h-4 inline mr-2" />
                      {plan.id === 'trial' 
                        ? (isArabic ? 'ابدأ التجربة المجانية' : 'Start Free Trial')
                        : (isArabic ? 'ترقية الآن' : 'Upgrade Now')
                      }
                    </>
                  ) : (
                    isArabic ? 'غير متاح' : 'Not Available'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Current Usage */}
        {currentSubscription && (
          <div className="mt-12 max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {isArabic ? 'الاستخدام الحالي' : 'Current Usage'}
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  {isArabic ? 'التغريدات المستخدمة' : 'Tweets Used'}
                </span>
                <span className="font-semibold">
                  {currentSubscription.tweets_used} / {getCurrentPlan().tweetLimit === -1 ? '∞' : getCurrentPlan().tweetLimit}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: getCurrentPlan().tweetLimit === -1 
                      ? '20%' 
                      : `${Math.min((currentSubscription.tweets_used / getCurrentPlan().tweetLimit) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  {isArabic ? 'تاريخ التجديد' : 'Renewal Date'}
                </span>
                <span>
                  {new Date(currentSubscription.current_period_end).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            {isArabic ? 'طرق الدفع المتاحة:' : 'Available Payment Methods:'}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span className="bg-white px-3 py-1 rounded-full shadow">STC Pay</span>
            <span className="bg-white px-3 py-1 rounded-full shadow">Mada</span>
            <span className="bg-white px-3 py-1 rounded-full shadow">Apple Pay</span>
            <span className="bg-white px-3 py-1 rounded-full shadow">Visa</span>
            <span className="bg-white px-3 py-1 rounded-full shadow">Mastercard</span>
            <span className="bg-white px-3 py-1 rounded-full shadow">Tabby</span>
            <span className="bg-white px-3 py-1 rounded-full shadow">Tamara</span>
          </div>
        </div>
      </div>
    </div>
  )
}