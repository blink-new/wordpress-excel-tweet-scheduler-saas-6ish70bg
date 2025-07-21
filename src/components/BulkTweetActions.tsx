import React, { useState } from 'react'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Alert, AlertDescription } from './ui/alert'
import { useToast } from '../hooks/use-toast'
import { blink } from '../blink/client'
import { Tweet } from '../types'
import {
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface BulkTweetActionsProps {
  tweets: Tweet[]
  onTweetsUpdated: () => void
  className?: string
}

export default function BulkTweetActions({ tweets, onTweetsUpdated, className = '' }: BulkTweetActionsProps) {
  const { toast } = useToast()
  const [selectedTweets, setSelectedTweets] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Toggle individual tweet selection
  const toggleTweetSelection = (tweetId: string) => {
    const newSelected = new Set(selectedTweets)
    if (newSelected.has(tweetId)) {
      newSelected.delete(tweetId)
    } else {
      newSelected.add(tweetId)
    }
    setSelectedTweets(newSelected)
  }

  // Toggle all tweets selection
  const toggleAllSelection = () => {
    if (selectedTweets.size === tweets.length) {
      setSelectedTweets(new Set())
    } else {
      setSelectedTweets(new Set(tweets.map(t => t.id)))
    }
  }

  // Bulk delete selected tweets
  const bulkDeleteTweets = async () => {
    if (selectedTweets.size === 0) {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار تغريدات للحذف",
        variant: "destructive"
      })
      return
    }

    const confirmMessage = `هل أنت متأكد من حذف ${selectedTweets.size} تغريدة؟ هذا الإجراء لا يمكن التراجع عنه.`
    if (!confirm(confirmMessage)) return

    try {
      setIsDeleting(true)
      
      // Delete tweets one by one
      const deletePromises = Array.from(selectedTweets).map(tweetId => 
        blink.db.tweets.delete(tweetId)
      )
      
      await Promise.all(deletePromises)
      
      toast({
        title: "تم الحذف",
        description: `تم حذف ${selectedTweets.size} تغريدة بنجاح`
      })
      
      // Clear selection and refresh
      setSelectedTweets(new Set())
      onTweetsUpdated()
      
    } catch (error) {
      console.error('Failed to bulk delete tweets:', error)
      toast({
        title: "خطأ",
        description: "فشل في حذف بعض التغريدات",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (tweets.length === 0) return null

  const allSelected = selectedTweets.size === tweets.length
  const someSelected = selectedTweets.size > 0 && selectedTweets.size < tweets.length

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bulk Actions Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onCheckedChange={toggleAllSelection}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-sm font-medium">
              {selectedTweets.size === 0 
                ? 'تحديد الكل' 
                : `تم تحديد ${selectedTweets.size} من ${tweets.length}`
              }
            </span>
          </div>
          
          {selectedTweets.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={bulkDeleteTweets}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              حذف المحدد ({selectedTweets.size})
            </Button>
          )}
        </div>

        {selectedTweets.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTweets(new Set())}
            className="text-gray-600"
          >
            إلغاء التحديد
          </Button>
        )}
      </div>

      {/* Warning for bulk actions */}
      {selectedTweets.size > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            تم تحديد {selectedTweets.size} تغريدة. تأكد من اختيارك قبل الحذف حيث لا يمكن التراجع عن هذا الإجراء.
          </AlertDescription>
        </Alert>
      )}

      {/* Individual Tweet Checkboxes */}
      <div className="space-y-2">
        {tweets.map((tweet) => (
          <div key={tweet.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
            <Checkbox
              checked={selectedTweets.has(tweet.id)}
              onCheckedChange={() => toggleTweetSelection(tweet.id)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                {tweet.content.substring(0, 100)}
                {tweet.content.length > 100 && '...'}
              </p>
              <p className="text-xs text-gray-500">
                مجدولة: {new Date(tweet.scheduledAt).toLocaleDateString('ar-SA')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                tweet.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                tweet.status === 'published' ? 'bg-green-100 text-green-800' :
                tweet.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {tweet.status === 'scheduled' ? 'مجدولة' :
                 tweet.status === 'published' ? 'منشورة' :
                 tweet.status === 'failed' ? 'فاشلة' : 'مسودة'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}