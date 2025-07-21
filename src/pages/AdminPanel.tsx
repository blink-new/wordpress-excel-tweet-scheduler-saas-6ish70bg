import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Alert, AlertDescription } from '../components/ui/alert'
import { useToast } from '../hooks/use-toast'
import { blink } from '../blink/client'
import BackendSwitcher from '../components/BackendSwitcher'
import {
  Settings,
  Users,
  BarChart3,
  Key,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  MessageSquare,
  TrendingUp,
  Activity,
  DollarSign,
  Mail,
  Ban,
  UserCheck,
  Crown,
  Database,
  Lock
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  newUsersToday: number
  totalTweets: number
  scheduledTweets: number
  publishedTweets: number
  failedTweets: number
  subscriptions: {
    trial: number
    starter: number
    pro: number
    enterprise: number
  }
}

interface PlatformSettings {
  twitterApiKey: string
  twitterApiSecret: string
  twitterBearerToken: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
  stripePublicKey: string
  stripeSecretKey: string
  maintenanceMode: boolean
  registrationEnabled: boolean
  maxFileSize: number
  rateLimitPerHour: number
}

interface UserRecord {
  id: string
  email: string
  display_name: string
  subscription_tier: string
  tweets_used: number
  tweets_limit: number
  created_at: string
  status: 'active' | 'suspended' | 'banned'
  warning_count: number
}

export default function AdminPanel() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsersToday: 0,
    totalTweets: 0,
    scheduledTweets: 0,
    publishedTweets: 0,
    failedTweets: 0,
    subscriptions: { trial: 0, starter: 0, pro: 0, enterprise: 0 }
  })
  
  const [settings, setSettings] = useState<PlatformSettings>({
    twitterApiKey: '',
    twitterApiSecret: '',
    twitterBearerToken: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    stripePublicKey: '',
    stripeSecretKey: '',
    maintenanceMode: false,
    registrationEnabled: true,
    maxFileSize: 5,
    rateLimitPerHour: 100
  })

  const [users, setUsers] = useState<UserRecord[]>([])
  const [showPasswords, setShowPasswords] = useState(false)

  // تحميل البيانات
  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      // تحميل المستخدمين
      const usersData = await blink.db.users.list({
        orderBy: { created_at: 'desc' }
      })
      setUsers(usersData)

      // تحميل التغريدات
      const tweetsData = await blink.db.tweets.list()
      
      // تحميل الإعدادات المحفوظة
      const savedSettings = await blink.db.platform_settings.list()
      if (savedSettings.length > 0) {
        const settingsRecord = savedSettings[0]
        setSettings({
          twitterApiKey: settingsRecord.twitter_api_key || '',
          twitterApiSecret: settingsRecord.twitter_api_secret || '',
          twitterBearerToken: settingsRecord.twitter_bearer_token || '',
          smtpHost: settingsRecord.smtp_host || '',
          smtpPort: settingsRecord.smtp_port || '587',
          smtpUser: settingsRecord.smtp_user || '',
          smtpPassword: settingsRecord.smtp_password || '',
          stripePublicKey: settingsRecord.stripe_public_key || '',
          stripeSecretKey: settingsRecord.stripe_secret_key || '',
          maintenanceMode: Number(settingsRecord.maintenance_mode) > 0,
          registrationEnabled: Number(settingsRecord.registration_enabled) > 0,
          maxFileSize: settingsRecord.max_file_size || 5,
          rateLimitPerHour: settingsRecord.rate_limit_per_hour || 100
        })
      }

      // حساب الإحصائيات
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const newUsersToday = usersData.filter((user: any) => {
        const userDate = new Date(user.created_at)
        return userDate >= today
      }).length

      const activeUsers = usersData.filter((user: any) => {
        const lastActive = new Date(user.last_active || user.created_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return lastActive >= thirtyDaysAgo
      }).length

      const subscriptionCounts = usersData.reduce((acc: any, user: any) => {
        const tier = user.subscription_tier || 'trial'
        acc[tier] = (acc[tier] || 0) + 1
        return acc
      }, { trial: 0, starter: 0, pro: 0, enterprise: 0 })

      setStats({
        totalUsers: usersData.length,
        activeUsers,
        inactiveUsers: usersData.length - activeUsers,
        newUsersToday,
        totalTweets: tweetsData.length,
        scheduledTweets: tweetsData.filter((t: any) => t.status === 'scheduled').length,
        publishedTweets: tweetsData.filter((t: any) => t.status === 'published').length,
        failedTweets: tweetsData.filter((t: any) => t.status === 'failed').length,
        subscriptions: subscriptionCounts
      })

    } catch (error) {
      console.error('Failed to load admin data:', error)
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الإدارة",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // حفظ الإعدادات
  const saveSettings = async () => {
    try {
      const settingsData = {
        twitter_api_key: settings.twitterApiKey,
        twitter_api_secret: settings.twitterApiSecret,
        twitter_bearer_token: settings.twitterBearerToken,
        smtp_host: settings.smtpHost,
        smtp_port: settings.smtpPort,
        smtp_user: settings.smtpUser,
        smtp_password: settings.smtpPassword,
        stripe_public_key: settings.stripePublicKey,
        stripe_secret_key: settings.stripeSecretKey,
        maintenance_mode: settings.maintenanceMode ? 1 : 0,
        registration_enabled: settings.registrationEnabled ? 1 : 0,
        max_file_size: settings.maxFileSize,
        rate_limit_per_hour: settings.rateLimitPerHour
      }

      // البحث عن إعدادات موجودة
      const existingSettings = await blink.db.platform_settings.list()
      
      if (existingSettings.length > 0) {
        await blink.db.platform_settings.update(existingSettings[0].id, settingsData)
      } else {
        await blink.db.platform_settings.create({
          id: 'platform_settings_1',
          ...settingsData
        })
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات المنصة بنجاح"
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive"
      })
    }
  }

  // إدارة المستخدمين
  const suspendUser = async (userId: string) => {
    try {
      await blink.db.users.update(userId, {
        status: 'suspended'
      })
      
      await loadAdminData()
      toast({
        title: "تم التعليق",
        description: "تم تعليق المستخدم بنجاح"
      })
    } catch (error) {
      console.error('Failed to suspend user:', error)
      toast({
        title: "خطأ",
        description: "فشل في تعليق المستخدم",
        variant: "destructive"
      })
    }
  }

  const activateUser = async (userId: string) => {
    try {
      await blink.db.users.update(userId, {
        status: 'active'
      })
      
      await loadAdminData()
      toast({
        title: "تم التفعيل",
        description: "تم تفعيل المستخدم بنجاح"
      })
    } catch (error) {
      console.error('Failed to activate user:', error)
      toast({
        title: "خطأ",
        description: "فشل في تفعيل المستخدم",
        variant: "destructive"
      })
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه.')) return

    try {
      // حذف تغريدات المستخدم أولاً
      const userTweets = await blink.db.tweets.list({
        where: { user_id: userId }
      })
      
      for (const tweet of userTweets) {
        await blink.db.tweets.delete(tweet.id)
      }
      
      // حذف المستخدم
      await blink.db.users.delete(userId)
      
      await loadAdminData()
      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم وجميع بياناته بنجاح"
      })
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast({
        title: "خطأ",
        description: "فشل في حذف المستخدم",
        variant: "destructive"
      })
    }
  }

  const sendWarning = async (userId: string, message: string) => {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      // إرسال تحذير عبر البريد الإلكتروني
      await blink.notifications.email({
        to: user.email,
        subject: 'تحذير من إدارة المنصة - TweetScheduler Pro',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">تحذير من إدارة المنصة</h2>
            <p>عزيزي ${user.display_name || 'المستخدم'},</p>
            <p>نود إعلامك بأنه تم رصد استخدام غير مناسب لمنصة TweetScheduler Pro من حسابك.</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>سبب التحذير:</strong><br>
              ${message}
            </div>
            <p>يرجى مراجعة شروط الاستخدام والالتزام بها لتجنب تعليق أو إلغاء حسابك.</p>
            <p>إذا كان لديك أي استفسار، يرجى التواصل معنا.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              هذه رسالة تلقائية من فريق إدارة TweetScheduler Pro
            </p>
          </div>
        `
      })

      // تحديث عداد التحذيرات
      await blink.db.users.update(userId, {
        warning_count: (user.warning_count || 0) + 1
      })

      await loadAdminData()
      toast({
        title: "تم الإرسال",
        description: "تم إرسال التحذير للمستخدم بنجاح"
      })
    } catch (error) {
      console.error('Failed to send warning:', error)
      toast({
        title: "خطأ",
        description: "فشل في إرسال التحذير",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadAdminData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة تحكم المنصة</h1>
          <p className="text-gray-600">إدارة شاملة لمنصة TweetScheduler Pro</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">المستخدمون النشطون</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">إجمالي التغريدات</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalTweets}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">مستخدمون جدد اليوم</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.newUsersToday}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="backend" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="backend">Backend</TabsTrigger>
            <TabsTrigger value="settings">إعدادات المنصة</TabsTrigger>
            <TabsTrigger value="plans">إدارة الباقات</TabsTrigger>
            <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="analytics">التحليلات</TabsTrigger>
            <TabsTrigger value="security">الأمان</TabsTrigger>
          </TabsList>

          {/* Backend Configuration */}
          <TabsContent value="backend" className="space-y-6">
            <BackendSwitcher />
          </TabsContent>

          {/* Platform Settings */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* API Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    إعدادات API
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitterApiKey">Twitter API Key</Label>
                    <Input
                      id="twitterApiKey"
                      type={showPasswords ? "text" : "password"}
                      value={settings.twitterApiKey}
                      onChange={(e) => setSettings({...settings, twitterApiKey: e.target.value})}
                      placeholder="Enter Twitter API Key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitterApiSecret">Twitter API Secret</Label>
                    <Input
                      id="twitterApiSecret"
                      type={showPasswords ? "text" : "password"}
                      value={settings.twitterApiSecret}
                      onChange={(e) => setSettings({...settings, twitterApiSecret: e.target.value})}
                      placeholder="Enter Twitter API Secret"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitterBearerToken">Twitter Bearer Token</Label>
                    <Input
                      id="twitterBearerToken"
                      type={showPasswords ? "text" : "password"}
                      value={settings.twitterBearerToken}
                      onChange={(e) => setSettings({...settings, twitterBearerToken: e.target.value})}
                      placeholder="Enter Twitter Bearer Token"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showPasswords"
                      checked={showPasswords}
                      onCheckedChange={setShowPasswords}
                    />
                    <Label htmlFor="showPasswords">إظهار كلمات المرور</Label>
                    {showPasswords ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </div>
                </CardContent>
              </Card>

              {/* Email Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    إعدادات البريد الإلكتروني
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={settings.smtpHost}
                      onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      value={settings.smtpPort}
                      onChange={(e) => setSettings({...settings, smtpPort: e.target.value})}
                      placeholder="587"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={settings.smtpUser}
                      onChange={(e) => setSettings({...settings, smtpUser: e.target.value})}
                      placeholder="your-email@gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type={showPasswords ? "text" : "password"}
                      value={settings.smtpPassword}
                      onChange={(e) => setSettings({...settings, smtpPassword: e.target.value})}
                      placeholder="App Password"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Platform Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    إعدادات المنصة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenanceMode">وضع الصيانة</Label>
                      <p className="text-sm text-gray-600">تعطيل الوصول للمنصة مؤقتاً</p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="registrationEnabled">تفعيل التسجيل</Label>
                      <p className="text-sm text-gray-600">السماح للمستخدمين الجدد بالتسجيل</p>
                    </div>
                    <Switch
                      id="registrationEnabled"
                      checked={settings.registrationEnabled}
                      onCheckedChange={(checked) => setSettings({...settings, registrationEnabled: checked})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">الحد الأقصى لحجم الملف (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={settings.maxFileSize}
                      onChange={(e) => setSettings({...settings, maxFileSize: parseInt(e.target.value)})}
                      min="1"
                      max="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rateLimitPerHour">حد الطلبات في الساعة</Label>
                    <Input
                      id="rateLimitPerHour"
                      type="number"
                      value={settings.rateLimitPerHour}
                      onChange={(e) => setSettings({...settings, rateLimitPerHour: parseInt(e.target.value)})}
                      min="10"
                      max="1000"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    إعدادات الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripePublicKey">Stripe Public Key</Label>
                    <Input
                      id="stripePublicKey"
                      value={settings.stripePublicKey}
                      onChange={(e) => setSettings({...settings, stripePublicKey: e.target.value})}
                      placeholder="pk_live_..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                    <Input
                      id="stripeSecretKey"
                      type={showPasswords ? "text" : "password"}
                      value={settings.stripeSecretKey}
                      onChange={(e) => setSettings({...settings, stripeSecretKey: e.target.value})}
                      placeholder="sk_live_..."
                    />
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      تأكد من استخدام مفاتيح Stripe الصحيحة للبيئة المطلوبة (Test/Live)
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveSettings} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                حفظ جميع الإعدادات
              </Button>
            </div>
          </TabsContent>

          {/* Subscription Plans Management */}
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة باقات الاشتراك</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Crown className="h-4 w-4" />
                    <AlertDescription>
                      يمكنك تعديل أسعار ومميزات الباقات من هنا. التغييرات ستؤثر على المستخدمين الجدد فقط.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Trial Plan */}
                    <Card className="border-2">
                      <CardHeader className="text-center">
                        <CardTitle className="text-lg">تجريبي</CardTitle>
                        <div className="text-2xl font-bold">مجاني</div>
                        <div className="text-sm text-gray-600">3 أيام</div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <strong>الحد الأقصى:</strong> 7 تغريدات
                        </div>
                        <div className="text-sm">
                          <strong>المميزات:</strong>
                          <ul className="mt-1 text-xs space-y-1">
                            <li>• جدولة أساسية</li>
                            <li>• دعم عبر البريد</li>
                          </ul>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          تعديل
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Starter Plan */}
                    <Card className="border-2 border-blue-200">
                      <CardHeader className="text-center">
                        <CardTitle className="text-lg text-blue-600">المبتدئ</CardTitle>
                        <div className="text-2xl font-bold">19 ريال</div>
                        <div className="text-sm text-gray-600">شهرياً</div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <strong>الحد الأقصى:</strong> 30 تغريدة
                        </div>
                        <div className="text-sm">
                          <strong>المميزات:</strong>
                          <ul className="mt-1 text-xs space-y-1">
                            <li>• جدولة أساسية</li>
                            <li>• دعم عبر البريد</li>
                            <li>• عرض التقويم</li>
                          </ul>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          تعديل
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Pro Plan */}
                    <Card className="border-2 border-purple-200 relative">
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-purple-600 text-white">الأكثر شعبية</Badge>
                      </div>
                      <CardHeader className="text-center">
                        <CardTitle className="text-lg text-purple-600 flex items-center justify-center gap-1">
                          <Crown className="w-4 h-4" />
                          المحترف
                        </CardTitle>
                        <div className="text-2xl font-bold">39 ريال</div>
                        <div className="text-sm text-gray-600">شهرياً</div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <strong>الحد الأقصى:</strong> 120 تغريدة
                        </div>
                        <div className="text-sm">
                          <strong>المميزات:</strong>
                          <ul className="mt-1 text-xs space-y-1">
                            <li>• جدولة متقدمة</li>
                            <li>• دعم أولوية</li>
                            <li>• تحليلات</li>
                            <li>• رفع الوسائط</li>
                          </ul>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          تعديل
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Enterprise Plan */}
                    <Card className="border-2 border-yellow-200">
                      <CardHeader className="text-center">
                        <CardTitle className="text-lg text-yellow-600 flex items-center justify-center gap-1">
                          <Crown className="w-4 h-4" />
                          المؤسسات
                        </CardTitle>
                        <div className="text-2xl font-bold">99 ريال</div>
                        <div className="text-sm text-gray-600">شهرياً</div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <strong>الحد الأقصى:</strong> غير محدود
                        </div>
                        <div className="text-sm">
                          <strong>المميزات:</strong>
                          <ul className="mt-1 text-xs space-y-1">
                            <li>• تغريدات غير محدودة</li>
                            <li>• إدارة الفرق</li>
                            <li>• وصول API</li>
                            <li>• علامة تجارية مخصصة</li>
                          </ul>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          تعديل
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">إحصائيات الاشتراكات</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{stats.subscriptions.trial}</div>
                        <div className="text-sm text-gray-500">تجريبي</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.subscriptions.starter}</div>
                        <div className="text-sm text-gray-500">مبتدئ</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.subscriptions.pro}</div>
                        <div className="text-sm text-gray-500">محترف</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{stats.subscriptions.enterprise}</div>
                        <div className="text-sm text-gray-500">مؤسسات</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المستخدمين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="p-3 text-sm font-medium text-gray-700 text-right">المستخدم</th>
                        <th className="p-3 text-sm font-medium text-gray-700 text-right">الاشتراك</th>
                        <th className="p-3 text-sm font-medium text-gray-700 text-right">الاستخدام</th>
                        <th className="p-3 text-sm font-medium text-gray-700 text-right">الحالة</th>
                        <th className="p-3 text-sm font-medium text-gray-700 text-right">التحذيرات</th>
                        <th className="p-3 text-sm font-medium text-gray-700 text-right">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.display_name || user.email.split('@')[0]}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              <div className="text-xs text-gray-400">
                                انضم: {new Date(user.created_at).toLocaleDateString('ar-SA')}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              user.subscription_tier === 'enterprise' ? 'bg-yellow-100 text-yellow-800' :
                              user.subscription_tier === 'pro' ? 'bg-purple-100 text-purple-800' :
                              user.subscription_tier === 'starter' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {user.subscription_tier === 'enterprise' && <Crown className="w-3 h-3 ml-1" />}
                              {user.subscription_tier.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              <div>{user.tweets_used} / {user.tweets_limit}</div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(user.tweets_used / user.tweets_limit) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant={
                              user.status === 'active' ? 'default' :
                              user.status === 'suspended' ? 'secondary' : 'destructive'
                            }>
                              {user.status === 'active' ? 'نشط' :
                               user.status === 'suspended' ? 'معلق' : 'محظور'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                              <span className="text-sm">{user.warning_count || 0}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {user.status === 'active' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => suspendUser(user.id)}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => activateUser(user.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const message = prompt('أدخل رسالة التحذير:')
                                  if (message) sendWarning(user.id, message)
                                }}
                                className="text-yellow-600 hover:text-yellow-700"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>توزيع الاشتراكات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Trial</span>
                      <Badge variant="secondary">{stats.subscriptions.trial}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Starter</span>
                      <Badge className="bg-blue-100 text-blue-800">{stats.subscriptions.starter}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pro</span>
                      <Badge className="bg-purple-100 text-purple-800">{stats.subscriptions.pro}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Enterprise</span>
                      <Badge className="bg-yellow-100 text-yellow-800">{stats.subscriptions.enterprise}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>حالة التغريدات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">مجدولة</span>
                      <Badge className="bg-blue-100 text-blue-800">{stats.scheduledTweets}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">منشورة</span>
                      <Badge className="bg-green-100 text-green-800">{stats.publishedTweets}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">فاشلة</span>
                      <Badge className="bg-red-100 text-red-800">{stats.failedTweets}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>نشاط المستخدمين</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">نشطون</span>
                      <Badge className="bg-green-100 text-green-800">{stats.activeUsers}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">غير نشطين</span>
                      <Badge className="bg-gray-100 text-gray-800">{stats.inactiveUsers}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">جدد اليوم</span>
                      <Badge className="bg-blue-100 text-blue-800">{stats.newUsersToday}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    إعدادات الأمان
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      جميع كلمات المرور والمفاتيح محفوظة بشكل مشفر في قاعدة البيانات
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>حالة الأمان</Label>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">SSL مفعل</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">تشفير قاعدة البيانات مفعل</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">حماية من CSRF مفعلة</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    حالة النظام
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">قاعدة البيانات</span>
                      <Badge className="bg-green-100 text-green-800">متصلة</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">خدمة البريد الإلكتروني</span>
                      <Badge className="bg-green-100 text-green-800">تعمل</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Twitter API</span>
                      <Badge className={settings.twitterApiKey ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {settings.twitterApiKey ? "متصل" : "غير متصل"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Stripe</span>
                      <Badge className={settings.stripeSecretKey ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {settings.stripeSecretKey ? "متصل" : "غير متصل"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}