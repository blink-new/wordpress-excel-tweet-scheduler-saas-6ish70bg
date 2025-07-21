import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription } from './ui/alert'
import { Separator } from './ui/separator'
import { blink } from '../blink/client'
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 8
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!validateEmail(loginForm.email)) {
        throw new Error('يرجى إدخال بريد إلكتروني صحيح')
      }

      if (!loginForm.password) {
        throw new Error('يرجى إدخال كلمة المرور')
      }

      // محاولة تسجيل الدخول باستخدام Blink Auth
      // نظراً لأن Blink يدير المصادقة تلقائياً، سنحاول إنشاء مستخدم في قاعدة البيانات
      const existingUsers = await blink.db.users.list({
        where: { email: loginForm.email }
      })

      if (existingUsers.length === 0) {
        throw new Error('المستخدم غير موجود. يرجى التسجيل أولاً.')
      }

      // في التطبيق الحقيقي، ستتم المصادقة عبر Blink
      // هنا سنقوم بمحاكاة تسجيل الدخول
      setSuccess('تم تسجيل الدخول بنجاح!')
      setTimeout(() => {
        blink.auth.login()
        onClose()
      }, 1000)

    } catch (error: any) {
      setError(error.message || 'فشل في تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!registerForm.name.trim()) {
        throw new Error('يرجى إدخال الاسم')
      }

      if (!validateEmail(registerForm.email)) {
        throw new Error('يرجى إدخال بريد إلكتروني صحيح')
      }

      if (!validatePassword(registerForm.password)) {
        throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        throw new Error('كلمات المرور غير متطابقة')
      }

      // التحقق من عدم وجود المستخدم مسبقاً
      const existingUsers = await blink.db.users.list({
        where: { email: registerForm.email }
      })

      if (existingUsers.length > 0) {
        throw new Error('البريد الإلكتروني مستخدم مسبقاً')
      }

      // إنشاء مستخدم جديد في قاعدة البيانات
      const newUser = await blink.db.users.create({
        id: `user_${Date.now()}`,
        email: registerForm.email,
        display_name: registerForm.name,
        subscription_tier: 'trial',
        tweets_used: 0,
        tweets_limit: 7,
        trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 أيام
        created_at: new Date().toISOString(),
        status: 'active',
        warning_count: 0
      })

      setSuccess('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.')
      
      // إرسال بريد ترحيب
      try {
        await blink.notifications.email({
          to: registerForm.email,
          subject: 'مرحباً بك في TweetScheduler Pro! 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1DA1F2; margin-bottom: 10px;">مرحباً بك في TweetScheduler Pro!</h1>
                <p style="color: #666; font-size: 16px;">منصة جدولة التغريدات الذكية</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-bottom: 15px;">مرحباً ${registerForm.name}! 👋</h2>
                <p style="color: #666; line-height: 1.6;">
                  شكراً لانضمامك إلى TweetScheduler Pro. يمكنك الآن البدء في جدولة تغريداتك بسهولة من ملفات Excel.
                </p>
              </div>

              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #1976d2; margin-bottom: 15px;">🎁 فترتك التجريبية المجانية</h3>
                <ul style="color: #666; line-height: 1.8; padding-right: 20px;">
                  <li>3 أيام مجانية كاملة</li>
                  <li>7 تغريدات مجانية</li>
                  <li>جدولة تلقائية من Excel/CSV</li>
                  <li>دعم فني مجاني</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${window.location.origin}" 
                   style="background: #1DA1F2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  ابدأ الآن
                </a>
              </div>

              <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
                <p style="color: #999; font-size: 14px;">
                  إذا كان لديك أي استفسار، لا تتردد في التواصل معنا
                </p>
                <p style="color: #999; font-size: 12px;">
                  © 2024 TweetScheduler Pro. جميع الحقوق محفوظة.
                </p>
              </div>
            </div>
          `
        })
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError)
      }

      setTimeout(() => {
        setActiveTab('login')
        setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' })
        setSuccess('')
      }, 2000)

    } catch (error: any) {
      setError(error.message || 'فشل في إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    blink.auth.login()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            TweetScheduler Pro
          </CardTitle>
          <p className="text-gray-600">منصة جدولة التغريدات الذكية</p>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
            </TabsList>

            {/* تسجيل الدخول */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleLogin}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                تسجيل الدخول بـ Google
              </Button>
            </TabsContent>

            {/* إنشاء حساب */}
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="أحمد محمد"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">8 أحرف على الأقل</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    'إنشاء حساب جديد'
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleLogin}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                التسجيل بـ Google
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={onClose} className="text-sm">
              إغلاق
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}