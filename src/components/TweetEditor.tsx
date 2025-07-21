import React, { useState, useEffect } from 'react'
import { Edit3, Calendar, Image, Video, Hash, X, Save, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import MediaUploader from './MediaUploader'
import { ParsedTweet, MediaFile, Tweet } from '@/types'
import { formatForDateTimeInput, safeParseDate, formatDateTimeSafely } from '@/utils/dateUtils'
import { blink } from '@/blink/client'

interface TweetEditorProps {
  tweet?: ParsedTweet
  existingTweet?: Tweet
  index?: number
  onSave?: (index: number, updatedTweet: ParsedTweet) => void
  onSaveExisting?: (tweetId: string, updatedTweet: Partial<Tweet>) => void
  onCancel?: () => void
  mode?: 'create' | 'edit'
}

export default function TweetEditor({ 
  tweet, 
  existingTweet, 
  index, 
  onSave, 
  onSaveExisting, 
  onCancel, 
  mode = 'create' 
}: TweetEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editedTweet, setEditedTweet] = useState<ParsedTweet | Tweet>(() => {
    if (mode === 'edit' && existingTweet) {
      return {
        content: existingTweet.content,
        scheduledAt: existingTweet.scheduledAt,
        hashtags: existingTweet.hashtags || [],
        mediaUrls: existingTweet.mediaUrls || [],
        status: existingTweet.status,
        row: 0
      }
    }
    return tweet ? { ...tweet } : {
      content: '',
      scheduledAt: new Date().toISOString(),
      hashtags: [],
      mediaUrls: [],
      status: 'pending' as const,
      row: 0
    }
  })
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])

  // Initialize media files from existing tweet
  useEffect(() => {
    if (mode === 'edit' && existingTweet?.mediaUrls) {
      const existingMedia: MediaFile[] = existingTweet.mediaUrls.map((url, index) => ({
        id: `existing_${index}`,
        url,
        type: url.includes('.mp4') || url.includes('.mov') ? 'video' : 'image',
        name: `media_${index}`,
        size: 0
      }))
      setMediaFiles(existingMedia)
    }
  }, [mode, existingTweet])

  const handleSave = async () => {
    try {
      // رفع الملفات الجديدة إلى التخزين
      const uploadedMediaUrls = []
      for (const file of mediaFiles) {
        if (file.file) {
          // رفع ملف جديد
          const { publicUrl } = await blink.storage.upload(
            file.file,
            `tweets/${Date.now()}-${file.name}`,
            { upsert: true }
          )
          uploadedMediaUrls.push(publicUrl)
        } else if (file.url) {
          // ملف موجود مسبقاً
          uploadedMediaUrls.push(file.url)
        }
      }

      if (mode === 'edit' && existingTweet && onSaveExisting) {
        // Update existing tweet in database
        const updatedData = {
          content: editedTweet.content,
          scheduled_at: editedTweet.scheduledAt,
          hashtags: JSON.stringify(editedTweet.hashtags || []),
          media_urls: JSON.stringify(uploadedMediaUrls),
          has_media: uploadedMediaUrls.length > 0 ? 1 : 0
        }
        
        await blink.db.tweets.update(existingTweet.id, updatedData)
        onSaveExisting(existingTweet.id, {
          ...existingTweet,
          content: editedTweet.content,
          scheduledAt: editedTweet.scheduledAt,
          hashtags: editedTweet.hashtags,
          mediaUrls: uploadedMediaUrls
        })
      } else if (mode === 'create' && onSave && index !== undefined) {
        // Create new tweet
        const updatedTweet = {
          ...editedTweet,
          mediaUrls: uploadedMediaUrls
        } as ParsedTweet
        
        onSave(index, updatedTweet)
      }
      
      setIsOpen(false)
    } catch (error) {
      console.error('Error saving tweet:', error)
      alert('فشل في حفظ التغريدة')
    }
  }

  const handleCancel = () => {
    setEditedTweet({ ...tweet })
    setMediaFiles([])
    setIsOpen(false)
    onCancel?.()
  }

  const formatDateTime = (dateString: string) => {
    return formatForDateTimeInput(dateString)
  }

  const characterCount = editedTweet.content.length
  const isOverLimit = characterCount > 280

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {mode === 'edit' ? 'تحرير التغريدة' : `تحرير التغريدة #${(index || 0) + 1}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tweet Content */}
          <div className="space-y-2">
            <Label htmlFor="tweet-content">محتوى التغريدة</Label>
            <Textarea
              id="tweet-content"
              value={editedTweet.content}
              onChange={(e) => setEditedTweet(prev => ({ ...prev, content: e.target.value }))}
              placeholder="اكتب محتوى التغريدة هنا..."
              className="min-h-[120px] resize-none"
              dir="auto"
            />
            <div className="flex justify-between items-center text-sm">
              <span className={`${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                {characterCount}/280 حرف
              </span>
              {isOverLimit && (
                <Badge variant="destructive" className="text-xs">
                  تجاوز الحد المسموح
                </Badge>
              )}
            </div>
          </div>

          {/* Scheduled Time */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-time" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              وقت النشر المجدول
            </Label>
            <Input
              id="scheduled-time"
              type="datetime-local"
              value={formatDateTime(editedTweet.scheduledAt)}
              onChange={(e) => {
                const parsed = safeParseDate(e.target.value)
                if (parsed) {
                  setEditedTweet(prev => ({ 
                    ...prev, 
                    scheduledAt: parsed.toISOString() 
                  }))
                }
              }}
              className="w-full"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label htmlFor="hashtags" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              الهاشتاجات (اختيارية)
            </Label>
            <Input
              id="hashtags"
              type="text"
              value={editedTweet.hashtags?.join(', ') || ''}
              onChange={(e) => setEditedTweet(prev => ({ 
                ...prev, 
                hashtags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              }))}
              placeholder="#تسويق, #محتوى, #تويتر"
              dir="auto"
            />
            <p className="text-xs text-gray-500">
              افصل الهاشتاجات بفاصلة. سيتم إضافتها تلقائياً لمحتوى التغريدة.
            </p>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              الصور والفيديوهات
            </Label>
            <MediaUploader
              mediaFiles={mediaFiles}
              onMediaChange={setMediaFiles}
              maxFiles={4}
            />
            <p className="text-xs text-gray-500">
              يمكنك إضافة حتى 4 ملفات (صور أو فيديوهات) لكل تغريدة
            </p>
          </div>

          {/* Preview */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-700">معاينة التغريدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tweet Content Preview */}
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-sm leading-relaxed" dir="auto">
                  {editedTweet.content}
                  {editedTweet.hashtags && editedTweet.hashtags.length > 0 && (
                    <span className="text-blue-600 ml-2">
                      {editedTweet.hashtags.map(tag => `#${tag}`).join(' ')}
                    </span>
                  )}
                </p>
                
                {/* Media Preview */}
                {mediaFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {mediaFiles.slice(0, 4).map((file) => (
                      <div key={file.id} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        {file.type === 'image' ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-6 w-6 text-gray-400" />
                            <span className="text-xs text-gray-500 ml-1">فيديو</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduled Time Preview */}
              <div className="text-xs text-gray-500">
                📅 سيتم النشر في: {formatDateTimeSafely(editedTweet.scheduledAt, 'ar-SA')}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isOverLimit || !editedTweet.content.trim()}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              حفظ التغييرات
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}