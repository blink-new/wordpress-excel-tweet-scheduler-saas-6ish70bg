import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useLanguage } from '../hooks/useLanguage'
import { blink } from '../blink/client'
import AuthModal from '../components/AuthModal'
import { 
  Upload, 
  Calendar, 
  BarChart3, 
  Globe, 
  Shield, 
  Smartphone,
  CheckCircle,
  Star,
  Users,
  MessageSquare,
  Eye,
  Languages
} from 'lucide-react'

export default function LandingPage() {
  const { language, setLanguage, t } = useLanguage()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleLogin = () => {
    setShowAuthModal(true)
  }

  const toggleLanguage = () => {
    const newLang = language.code === 'en' ? 'ar' : 'en'
    setLanguage({ 
      code: newLang, 
      name: newLang === 'ar' ? 'العربية' : 'English', 
      direction: newLang === 'ar' ? 'rtl' : 'ltr' 
    })
  }

  const features = [
    { icon: Upload, key: 'upload' },
    { icon: Calendar, key: 'schedule' },
    { icon: BarChart3, key: 'track' },
    { icon: Globe, key: 'google_auth' },
    { icon: Shield, key: 'trial' },
    { icon: Languages, key: 'arabic' },
    { icon: Smartphone, key: 'dashboard' },
    { icon: CheckCircle, key: 'payments' },
    { icon: Eye, key: 'ui' },
    { icon: Users, key: 'gulf' }
  ]

  const stats = [
    { icon: Users, value: '10,000+', key: 'users' },
    { icon: MessageSquare, value: '240,000+', key: 'tweets' },
    { icon: Eye, value: '1.2M+', key: 'visits' },
    { icon: Star, value: '4.9/5', key: 'rating' }
  ]

  const plans = [
    {
      name: t('plans.trial'),
      price: 0,
      duration: '3 Days',
      tweets: 7,
      features: ['One-time access only'],
      popular: false
    },
    {
      name: t('plans.starter'),
      price: 19,
      duration: t('plans.monthly'),
      tweets: 30,
      features: ['Basic scheduling', 'Email support'],
      popular: false
    },
    {
      name: t('plans.pro'),
      price: 39,
      duration: t('plans.monthly'),
      tweets: 120,
      features: ['Multi-platform support', 'Priority support'],
      popular: true
    },
    {
      name: t('plans.enterprise'),
      price: 99,
      duration: t('plans.monthly'),
      tweets: 'Unlimited',
      features: ['Priority support', 'Teams/sub-accounts'],
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-white">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TweetScheduler Pro</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center space-x-2"
              >
                <Languages className="w-4 h-4" />
                <span>{language.name}</span>
              </Button>
              <Button onClick={handleLogin} className="bg-primary hover:bg-primary/90">
                {t('hero.cta')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-xl text-primary font-semibold mb-4">
            {t('hero.subtitle')}
          </p>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('hero.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-4"
            >
              {t('hero.cta')}
            </Button>
          </div>
          <p className="text-sm text-gray-500">{t('hero.no_card')}</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose TweetScheduler Pro?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <feature.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">
                    {t(`features.${feature.key}`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Trusted by Thousands
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3">
                  <stat.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">
                  {t(`stats.${stat.key}`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Free' : `SAR ${plan.price}`}
                    </span>
                    <span className="text-gray-600">/{plan.duration}</span>
                  </div>
                  <div className="mb-4">
                    <span className="text-lg font-semibold text-primary">
                      {plan.tweets} {t('plans.tweets')}
                    </span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={handleLogin}
                  >
                    {t('plans.select')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Schedule Your Success?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of content creators who trust TweetScheduler Pro
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-4"
          >
            {t('hero.cta')}
          </Button>
          <p className="text-blue-100 mt-4">{t('hero.no_card')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">T</span>
                </div>
                <span className="text-lg font-bold">TweetScheduler Pro</span>
              </div>
              <p className="text-gray-400 text-sm">
                The smart way to schedule your tweets from Excel files.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>API</li>
                <li>Documentation</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Status</li>
                <li>Community</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Privacy</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 TweetScheduler Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  )
}