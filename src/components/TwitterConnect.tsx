import React, { useState } from 'react'
import { Twitter, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { blink } from '@/blink/client'

interface TwitterConnectProps {
  user: any
  onConnectionUpdate?: () => void
}

export default function TwitterConnect({ user, onConnectionUpdate }: TwitterConnectProps) {
  const { toast } = useToast()
  const [twitterUsername, setTwitterUsername] = useState(user?.twitterUsername || '')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'pending'>('disconnected')

  const handleConnectTwitter = async () => {
    if (!twitterUsername.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المستخدم على تويتر",
        variant: "destructive"
      })
      return
    }

    setIsConnecting(true)
    
    try {
      // Clean username (remove @ if present)
      const cleanUsername = twitterUsername.replace('@', '').trim()
      
      // Update user record with Twitter username
      await blink.db.users.update(user.id, {
        twitter_username: cleanUsername,
        twitter_connected: 1 // SQLite boolean as integer
      })

      setConnectionStatus('connected')
      
      toast({
        title: "تم الربط بنجاح! ✅",
        description: `تم ربط حساب @${cleanUsername} بنجاح`,
        variant: "default"
      })

      onConnectionUpdate?.()
      
    } catch (error) {
      console.error('Error connecting Twitter:', error)
      toast({
        title: "فشل في الربط",
        description: "حدث خطأ أثناء ربط حساب تويتر. حاول مرة أخرى.",
        variant: "destructive"
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectTwitter = async () => {
    setIsConnecting(true)
    
    try {
      await blink.db.users.update(user.id, {
        twitter_username: null,
        twitter_connected: 0,
        twitter_access_token: null,
        twitter_refresh_token: null
      })

      setConnectionStatus('disconnected')
      setTwitterUsername('')
      
      toast({
        title: "تم قطع الاتصال",
        description: "تم قطع الاتصال مع تويتر بنجاح",
        variant: "default"
      })

      onConnectionUpdate?.()
      
    } catch (error) {
      console.error('Error disconnecting Twitter:', error)
      toast({
        title: "خطأ",
        description: "فشل في قطع الاتصال مع تويتر",
        variant: "destructive"
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const isConnected = user?.twitterConnected || connectionStatus === 'connected'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Twitter className="h-5 w-5 text-blue-500" />
          ربط حساب تويتر
        </CardTitle>
        <CardDescription>
          اربط حساب تويتر الخاص بك لتمكين الجدولة التلقائية والنشر المباشر
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            {/* Connected Status */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  متصل بحساب <strong>@{user?.twitterUsername || twitterUsername}</strong>
                </span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  متصل
                </Badge>
              </AlertDescription>
            </Alert>

            {/* Connection Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                ✅ الميزات المتاحة الآن:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• جدولة التغريدات تلقائياً</li>
                <li>• نشر الصور والفيديوهات</li>
                <li>• تتبع حالة النشر</li>
                <li>• إحصائيات التفاعل</li>
              </ul>
            </div>

            {/* Disconnect Button */}
            <Button
              variant="outline"
              onClick={handleDisconnectTwitter}
              disabled={isConnecting}
              className="w-full border-red-300 text-red-700 hover:bg-red-50"
            >
              {isConnecting ? 'جاري قطع الاتصال...' : 'قطع الاتصال مع تويتر'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Form */}
            <div className="space-y-2">
              <Label htmlFor="twitter-username">اسم المستخدم على تويتر</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  @
                </span>
                <Input
                  id="twitter-username"
                  type="text"
                  placeholder="username"
                  value={twitterUsername}
                  onChange={(e) => setTwitterUsername(e.target.value)}
                  className="pl-8"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-gray-500">
                مثال: إذا كان رابط حسابك https://twitter.com/username فأدخل: username
              </p>
            </div>

            {/* Security Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">🔒 أمان وخصوصية:</p>
                  <ul className="text-sm space-y-1">
                    <li>• نحن لا نحفظ كلمة مرور تويتر</li>
                    <li>• الربط يتم عبر API آمن</li>
                    <li>• يمكنك قطع الاتصال في أي وقت</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Connect Button */}
            <Button
              onClick={handleConnectTwitter}
              disabled={isConnecting || !twitterUsername.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              <Twitter className="h-4 w-4 mr-2" />
              {isConnecting ? 'جاري الربط...' : 'ربط حساب تويتر'}
            </Button>

            {/* Help Link */}
            <div className="text-center">
              <Button variant="link" size="sm" className="text-blue-600">
                <ExternalLink className="h-3 w-3 mr-1" />
                كيفية الحصول على صلاحيات API
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}