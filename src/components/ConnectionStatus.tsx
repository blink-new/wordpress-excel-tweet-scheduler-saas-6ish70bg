import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from './ui/alert'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { blink } from '../blink/client'

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [blinkConnected, setBlinkConnected] = useState(true)
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    // Check Blink connection periodically
    const checkBlinkConnection = async () => {
      try {
        await blink.auth.me()
        setBlinkConnected(true)
        if (isOnline) {
          setShowStatus(false)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
          setBlinkConnected(false)
          setShowStatus(true)
        }
      }
    }

    const handleOnline = () => {
      setIsOnline(true)
      checkBlinkConnection()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setBlinkConnected(false)
      setShowStatus(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    checkBlinkConnection()

    // Check every 30 seconds
    const interval = setInterval(checkBlinkConnection, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [isOnline])

  if (!showStatus) return null

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        title: 'غير متصل بالإنترنت',
        description: 'يمكنك الاستمرار في استخدام التطبيق بوضع محدود',
        variant: 'destructive' as const
      }
    }
    
    if (!blinkConnected) {
      return {
        icon: AlertTriangle,
        title: 'مشكلة في الاتصال',
        description: 'التطبيق يعمل في الوضع المحدود. بعض الميزات قد لا تعمل',
        variant: 'default' as const
      }
    }

    return {
      icon: Wifi,
      title: 'متصل',
      description: 'جميع الميزات متاحة',
      variant: 'default' as const
    }
  }

  const status = getStatusInfo()
  const Icon = status.icon

  return (
    <Alert variant={status.variant} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertDescription>
        <strong>{status.title}:</strong> {status.description}
      </AlertDescription>
    </Alert>
  )
}