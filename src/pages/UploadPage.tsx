import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Calendar, Clock, CheckCircle, AlertCircle, X, AlertTriangle, Edit3, Image, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/hooks/useLanguage'
import { blink } from '@/blink/client'
import { Tweet } from '@/types'
import { parseFile, ParsedTweet, FileParseResult } from '@/utils/fileParser'
import { ensureUserExists, incrementUserTweetUsage, checkUserQuota } from '@/utils/userManager'
import TweetEditor from '@/components/TweetEditor'
import FeatureGuard from '@/components/FeatureGuard'
import { formatDateSafely, formatTimeSafely } from '@/utils/dateUtils'

export default function UploadPage() {
  const { t, isRTL } = useLanguage()
  const { toast } = useToast()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedTweets, setParsedTweets] = useState<ParsedTweet[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setUploadedFile(file)
    setIsProcessing(true)
    setUploadProgress(0)
    setParsedTweets([])
    setParseErrors([])

    try {
      // Simulate progress for UI feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval)
            return 80
          }
          return prev + 20
        })
      }, 300)

      // Parse the actual file
      const result: FileParseResult = await parseFile(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Set the parsed tweets and errors
      setParsedTweets(result.tweets)
      setParseErrors(result.errors)
      
      // Show success/error message
      if (result.tweets.length === 0 && result.errors.length > 0) {
        console.error('File parsing failed:', result.errors)
      } else if (result.errors.length > 0) {
        console.warn('File parsed with warnings:', result.errors)
      } else {
        console.log(`Successfully parsed ${result.tweets.length} tweets from file`)
      }
      
    } catch (error) {
      console.error('Error processing file:', error)
      setParseErrors([`خطأ في معالجة الملف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`])
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  })

  const scheduleAllTweets = async () => {
    setIsProcessing(true)
    
    try {
      // Ensure user record exists in database
      const userRecord = await ensureUserExists()
      
      // Check how many tweets user wants to schedule
      const tweetsToSchedule = parsedTweets.filter(t => t.status === 'pending')
      
      // Check user quota
      const quota = await checkUserQuota(userRecord.id)
      const remainingQuota = quota.limit - quota.used
      
      if (tweetsToSchedule.length > remainingQuota) {
        toast({
          title: "تجاوز الحد المسموح ⚠️",
          description: `يمكنك جدولة ${remainingQuota} تغريدة فقط من أصل ${tweetsToSchedule.length}. ترقية الاشتراك للمزيد.`,
          variant: "destructive"
        })
        setIsProcessing(false)
        return
      }
      
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < parsedTweets.length; i++) {
        const tweet = parsedTweets[i]
        
        // Skip if already scheduled
        if (tweet.status === 'scheduled') continue
        
        try {
          // Generate unique ID for the tweet
          const tweetId = `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // Create tweet record in database
          await blink.db.tweets.create({
            id: tweetId,
            user_id: userRecord.id,
            content: tweet.content,
            scheduled_at: tweet.scheduledAt,
            status: 'scheduled',
            platform: 'twitter',
            created_at: new Date().toISOString()
          })
          
          // Update the tweet status in UI
          setParsedTweets(prev => prev.map((t, index) => 
            index === i ? { ...t, status: 'scheduled' as const } : t
          ))
          
          successCount++
        } catch (error) {
          console.error(`Error scheduling tweet ${i + 1}:`, error)
          
          // Update the tweet status in UI with error
          setParsedTweets(prev => prev.map((t, index) => 
            index === i ? { 
              ...t, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'فشل في جدولة التغريدة' 
            } : t
          ))
          
          errorCount++
        }
        
        // Small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Update user's tweet usage count
      if (successCount > 0) {
        try {
          await incrementUserTweetUsage(userRecord.id, successCount)
        } catch (error) {
          console.warn('Failed to update user tweet usage:', error)
        }
      }
      
      // Show success/error summary
      if (successCount > 0) {
        toast({
          title: "تم بنجاح! ✅",
          description: `تم جدولة ${successCount} تغريدة بنجاح`,
          variant: "default"
        })
      }
      if (errorCount > 0) {
        toast({
          title: "تحذير ⚠️",
          description: `فشل في جدولة ${errorCount} تغريدة`,
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('Error in scheduleAllTweets:', error)
      // Show general error to user
      setParseErrors(prev => [...prev, `خطأ في جدولة التغريدات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`])
    } finally {
      setIsProcessing(false)
    }
  }

  const removeTweet = (index: number) => {
    setParsedTweets(prev => prev.filter((_, i) => i !== index))
  }

  const updateTweet = (index: number, updatedTweet: ParsedTweet) => {
    setParsedTweets(prev => prev.map((tweet, i) => 
      i === index ? updatedTweet : tweet
    ))
  }

  return (
    <FeatureGuard feature="رفع وجدولة التغريدات">
      <div className={`min-h-screen bg-gray-50 p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('upload.title')}
          </h1>
          <p className="text-gray-600">
            {t('upload.subtitle')}
          </p>
        </div>

        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('upload.dropzone.title')}
            </CardTitle>
            <CardDescription>
              {t('upload.dropzone.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              
              {isDragActive ? (
                <p className="text-primary font-medium">
                  {t('upload.dropzone.dragActive')}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600">
                    {t('upload.dropzone.dragInactive')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('upload.dropzone.formats')}
                  </p>
                </div>
              )}
            </div>

            {uploadedFile && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">{uploadedFile.name}</p>
                      <p className="text-sm text-blue-600">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {isProcessing && (
                    <div className="flex items-center gap-2">
                      <Progress value={uploadProgress} className="w-24" />
                      <span className="text-sm text-blue-600">{uploadProgress}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parse Errors */}
        {parseErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">تم العثور على أخطاء أثناء قراءة الملف:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {parseErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Parsed Tweets Table */}
        {parsedTweets.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t('upload.preview.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('upload.preview.description', { count: parsedTweets.length })}
                  </CardDescription>
                </div>
                <Button 
                  onClick={scheduleAllTweets}
                  disabled={isProcessing || parsedTweets.every(t => t.status === 'scheduled')}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isProcessing ? t('upload.scheduling') : t('upload.scheduleAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className={`p-3 text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        #
                      </th>
                      <th className={`p-3 text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('upload.table.content')}
                      </th>
                      <th className={`p-3 text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        الوسائط
                      </th>
                      <th className={`p-3 text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('upload.table.scheduledTime')}
                      </th>
                      <th className={`p-3 text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('upload.table.status')}
                      </th>
                      <th className={`p-3 text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('upload.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTweets.map((tweet, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-sm text-gray-600">
                          {index + 1}
                        </td>
                        <td className="p-3">
                          <div className="max-w-md">
                            <p className="text-sm text-gray-900 leading-relaxed line-clamp-3">
                              {tweet.content}
                            </p>
                            <div className="mt-1 text-xs text-gray-500">
                              {tweet.content.length} {t('upload.table.characters')}
                            </div>
                            {tweet.hashtags && tweet.hashtags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {tweet.hashtags.map((tag, tagIndex) => (
                                  <span key={tagIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {tweet.error && (
                              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                {tweet.error}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {tweet.mediaUrls && tweet.mediaUrls.length > 0 ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <Image className="h-4 w-4 text-blue-600" />
                                  <span className="text-xs text-gray-600">{tweet.mediaUrls.length}</span>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">لا توجد</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {formatDateSafely(tweet.scheduledAt, isRTL ? 'ar-SA' : 'en-US')}
                            </div>
                            <div className="text-gray-500">
                              {formatTimeSafely(tweet.scheduledAt, isRTL ? 'ar-SA' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={
                              tweet.status === 'scheduled' ? 'default' :
                              tweet.status === 'error' ? 'destructive' : 'secondary'
                            }
                            className="flex items-center gap-1 w-fit"
                          >
                            {tweet.status === 'scheduled' && <CheckCircle className="h-3 w-3" />}
                            {tweet.status === 'error' && <AlertCircle className="h-3 w-3" />}
                            {tweet.status === 'pending' && <Clock className="h-3 w-3" />}
                            {t(`upload.status.${tweet.status}`)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <TweetEditor
                              tweet={tweet}
                              index={index}
                              onSave={updateTweet}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTweet(index)}
                              className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                              title={t('upload.table.remove')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Summary Stats */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {parsedTweets.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('upload.stats.total')}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {parsedTweets.filter(t => t.status === 'pending').length}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('upload.stats.pending')}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {parsedTweets.filter(t => t.status === 'scheduled').length}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('upload.stats.scheduled')}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {parsedTweets.filter(t => t.status === 'error').length}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('upload.stats.errors')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('upload.instructions.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {t('upload.instructions.format.title')}
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {t('upload.instructions.format.column1')}</li>
                    <li>• {t('upload.instructions.format.column2')}</li>
                    <li>• {t('upload.instructions.format.column3')}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {t('upload.instructions.tips.title')}
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {t('upload.instructions.tips.tip1')}</li>
                    <li>• {t('upload.instructions.tips.tip2')}</li>
                    <li>• {t('upload.instructions.tips.tip3')}</li>
                  </ul>
                </div>
              </div>
              
              {/* Sample File Download */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">
                      ملف مثال للتجربة
                    </h4>
                    <p className="text-sm text-blue-700">
                      حمل ملف CSV مثال يحتوي على تغريدات جاهزة لتجربة النظام
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = '/sample-tweets.csv'
                      link.download = 'sample-tweets.csv'
                      link.click()
                    }}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    تحميل الملف المثال
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </FeatureGuard>
  )
}