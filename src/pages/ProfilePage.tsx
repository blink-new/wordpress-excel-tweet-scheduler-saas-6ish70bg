import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import { useToast } from '../hooks/use-toast'
import { useLanguage } from '../hooks/useLanguage'
import { blink } from '../blink/client'
import { User } from '../types'
import { ensureUserExists } from '../utils/userManager'
import {
  User as UserIcon,
  Mail,
  Calendar,
  Twitter,
  Globe,
  MapPin,
  Edit3,
  Save,
  ArrowLeft,
  Crown,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Settings,
  CreditCard,
  Activity,
  Clock,
  TrendingUp
} from 'lucide-react'

interface ProfilePageProps {
  user: User
}

interface UserProfile {
  id: string
  user_id: string
  twitter_username?: string
  twitter_connected: number
  profile_image_url?: string
  bio?: string
  website?: string
  location?: string
  created_at: string
}

interface UserStats {
  totalTweets: number
  scheduledTweets: number
  publishedTweets: number
  failedTweets: number
  accountAge: number
  lastActivity: string
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isRTL } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRecord, setUserRecord] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats>({
    totalTweets: 0,
    scheduledTweets: 0,
    publishedTweets: 0,
    failedTweets: 0,
    accountAge: 0,
    lastActivity: ''
  })

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    website: '',
    location: '',
    twitterUsername: ''
  })

  // Load user profile and stats
  const loadProfileData = async () => {
    try {
      setLoading(true)
      
      // Get user record
      const userRec = await ensureUserExists()
      setUserRecord(userRec)
      
      // Get user profile
      const profiles = await blink.db.user_profiles.list({
        where: { user_id: userRec.id }
      })
      
      let userProfile = profiles[0]
      if (!userProfile) {
        // Create profile if doesn't exist
        userProfile = await blink.db.user_profiles.create({
          id: `profile_${userRec.id}`,
          user_id: userRec.id,
          twitter_connected: 0,
          created_at: new Date().toISOString()
        })
      }
      setProfile(userProfile)
      
      // Load user tweets for stats
      const userTweets = await blink.db.tweets.list({
        where: { user_id: userRec.id }
      })
      
      // Calculate stats
      const totalTweets = userTweets.length
      const scheduledTweets = userTweets.filter((t: any) => t.status === 'scheduled').length
      const publishedTweets = userTweets.filter((t: any) => t.status === 'published').length
      const failedTweets = userTweets.filter((t: any) => t.status === 'failed').length
      
      const accountCreated = new Date(userRec.created_at)
      const now = new Date()
      const accountAge = Math.floor((now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24))
      
      // Get last activity (most recent tweet)
      const lastTweet = userTweets.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      const lastActivity = lastTweet ? lastTweet.created_at : userRec.created_at
      
      setStats({
        totalTweets,
        scheduledTweets,
        publishedTweets,
        failedTweets,
        accountAge,
        lastActivity
      })
      
      // Set form data
      setFormData({
        displayName: userRec.display_name || '',
        bio: userProfile.bio || '',
        website: userProfile.website || '',
        location: userProfile.location || '',
        twitterUsername: userProfile.twitter_username || ''
      })
      
    } catch (error) {
      console.error('Failed to load profile data:', error)
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الملف الشخصي",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Save profile changes
  const saveProfile = async () => {
    try {
      setSaving(true)
      
      // Update user record
      await blink.db.users.update(userRecord.id, {
        display_name: formData.displayName
      })
      
      // Update profile
      if (profile) {
        await blink.db.user_profiles.update(profile.id, {
          bio: formData.bio,
          website: formData.website,
          location: formData.location,
          twitter_username: formData.twitterUsername
        })
      }
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ التغييرات بنجاح"
      })
      
      // Reload data
      await loadProfileData()
      
    } catch (error) {
      console.error('Failed to save profile:', error)
      toast({
        title: "خطأ",
        description: "فشل في حفظ التغييرات",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Remove Twitter username
  const removeTwitterUsername = async () => {
    if (!confirm('هل أنت متأكد من حذف اسم المستخدم على تويتر؟')) return
    
    try {
      if (profile) {
        await blink.db.user_profiles.update(profile.id, {
          twitter_username: null,
          twitter_connected: 0,
          twitter_access_token: null,
          twitter_refresh_token: null
        })
        
        setFormData(prev => ({ ...prev, twitterUsername: '' }))
        
        toast({
          title: "تم الحذف",
          description: "تم حذف ربط حساب تويتر بنجاح"
        })
        
        await loadProfileData()
      }
    } catch (error) {
      console.error('Failed to remove Twitter username:', error)
      toast({
        title: "خطأ",
        description: "فشل في حذف ربط تويتر",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadProfileData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                العودة للوحة التحكم
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-bold text-gray-900">الملف الشخصي</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {userRecord?.display_name || user.email?.split('@')[0] || 'المستخدم'}
                    </h2>
                    <p className="text-gray-600">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getTierColor(userRecord?.subscription_tier || 'trial')}`}>
                        {getTierIcon(userRecord?.subscription_tier || 'trial')}
                        <span className="ml-1">{(userRecord?.subscription_tier || 'trial').toUpperCase()}</span>
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 ml-1" />
                        انضم منذ {stats.accountAge} يوم
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Button onClick={saveProfile} disabled={saving} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5" />
                    تحرير الملف الشخصي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">الاسم المعروض</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="أدخل اسمك المعروض"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">نبذة شخصية</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="اكتب نبذة مختصرة عنك..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">الموقع الإلكتروني</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">الموقع</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="المدينة، البلد"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitterUsername">اسم المستخدم على تويتر</Label>
                    <div className="flex gap-2">
                      <Input
                        id="twitterUsername"
                        value={formData.twitterUsername}
                        onChange={(e) => setFormData(prev => ({ ...prev, twitterUsername: e.target.value }))}
                        placeholder="@username"
                      />
                      {formData.twitterUsername && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeTwitterUsername}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {formData.twitterUsername && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        مرتبط بحساب تويتر
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Account Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    إعدادات الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">البريد الإلكتروني</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">نوع الاشتراك</h4>
                      <p className="text-sm text-gray-600">
                        {userRecord?.subscription_tier === 'trial' ? 'تجريبي' :
                         userRecord?.subscription_tier === 'starter' ? 'المبتدئ' :
                         userRecord?.subscription_tier === 'pro' ? 'المحترف' :
                         userRecord?.subscription_tier === 'enterprise' ? 'المؤسسات' : 'غير محدد'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                        ترقية الباقة
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      لحذف حسابك نهائياً، يرجى التواصل مع الدعم الفني
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-6">
              {/* Usage Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    إحصائيات الاستخدام
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">إجمالي التغريدات</span>
                    <span className="font-bold text-blue-600">{stats.totalTweets}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">مجدولة</span>
                    <span className="font-bold text-orange-600">{stats.scheduledTweets}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">منشورة</span>
                    <span className="font-bold text-green-600">{stats.publishedTweets}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">فاشلة</span>
                    <span className="font-bold text-red-600">{stats.failedTweets}</span>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">الاستخدام الحالي</span>
                      <span className="font-bold">
                        {userRecord?.tweets_used || 0} / {userRecord?.tweets_limit || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(((userRecord?.tweets_used || 0) / (userRecord?.tweets_limit || 1)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    معلومات الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>انضم منذ {stats.accountAge} يوم</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span>آخر نشاط: {new Date(stats.lastActivity).toLocaleDateString('ar-SA')}</span>
                  </div>
                  
                  {formData.twitterUsername && (
                    <div className="flex items-center gap-2 text-sm">
                      <Twitter className="w-4 h-4 text-blue-400" />
                      <span>@{formData.twitterUsername}</span>
                    </div>
                  )}
                  
                  {formData.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a 
                        href={formData.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        الموقع الإلكتروني
                      </a>
                    </div>
                  )}
                  
                  {formData.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{formData.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}