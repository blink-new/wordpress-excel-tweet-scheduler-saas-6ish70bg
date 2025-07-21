import { blink } from '../blink/client'
import { sendTweetFailureNotification } from './emailNotifications'

/**
 * مراقب التغريدات - يتحقق من التغريدات المجدولة ويرسل إشعارات الفشل
 */
export class TweetMonitor {
  private static instance: TweetMonitor
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {}

  static getInstance(): TweetMonitor {
    if (!TweetMonitor.instance) {
      TweetMonitor.instance = new TweetMonitor()
    }
    return TweetMonitor.instance
  }

  /**
   * بدء مراقبة التغريدات
   */
  start(intervalMinutes: number = 5) {
    if (this.isRunning) {
      console.log('Tweet monitor is already running')
      return
    }

    this.isRunning = true
    console.log(`Starting tweet monitor with ${intervalMinutes} minute intervals`)

    // تشغيل فوري
    this.checkFailedTweets()

    // تشغيل دوري
    this.intervalId = setInterval(() => {
      this.checkFailedTweets()
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * إيقاف مراقبة التغريدات
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Tweet monitor stopped')
  }

  /**
   * التحقق من التغريدات الفاشلة وإرسال الإشعارات
   */
  private async checkFailedTweets() {
    try {
      console.log('Checking for failed tweets...')

      // البحث عن التغريدات المجدولة التي تجاوزت وقتها ولم يتم إرسالها
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

      // الحصول على جميع التغريدات المجدولة
      const scheduledTweets = await blink.db.tweets.list({
        where: { status: 'scheduled' }
      })

      const failedTweets = scheduledTweets.filter((tweet: any) => {
        const scheduledTime = new Date(tweet.scheduled_at)
        return scheduledTime <= fiveMinutesAgo
      })

      console.log(`Found ${failedTweets.length} potentially failed tweets`)

      for (const tweet of failedTweets) {
        await this.handleFailedTweet(tweet)
      }

    } catch (error) {
      console.error('Error checking failed tweets:', error)
    }
  }

  /**
   * التعامل مع تغريدة فاشلة
   */
  private async handleFailedTweet(tweet: any) {
    try {
      // تحديث حالة التغريدة إلى فاشلة
      await blink.db.tweets.update(tweet.id, {
        status: 'failed',
        error_message: 'فشل في الإرسال في الوقت المحدد - قد يكون هناك مشكلة في الاتصال بتويتر',
        failure_reason: 'Scheduled time passed without successful posting'
      })

      // التحقق من إرسال الإشعار مسبقاً
      if (Number(tweet.email_notification_sent) > 0) {
        console.log(`Email notification already sent for tweet ${tweet.id}`)
        return
      }

      // الحصول على بيانات المستخدم
      const users = await blink.db.users.list({
        where: { id: tweet.user_id },
        limit: 1
      })

      if (users.length === 0) {
        console.error(`User not found for tweet ${tweet.id}`)
        return
      }

      const user = users[0]

      // إرسال إشعار بالإيميل
      const emailSent = await sendTweetFailureNotification({
        userEmail: user.email,
        userName: user.display_name || user.email.split('@')[0],
        tweetContent: tweet.content,
        scheduledTime: tweet.scheduled_at,
        failureReason: 'فشل في الإرسال في الوقت المحدد',
        tweetId: tweet.id
      })

      if (emailSent) {
        // تحديث حالة إرسال الإشعار
        await blink.db.tweets.update(tweet.id, {
          email_notification_sent: 1
        })
        console.log(`Failure notification sent for tweet ${tweet.id}`)
      } else {
        console.error(`Failed to send notification for tweet ${tweet.id}`)
      }

    } catch (error) {
      console.error(`Error handling failed tweet ${tweet.id}:`, error)
    }
  }

  /**
   * محاكاة إرسال تغريدة ناجحة (للاختبار)
   */
  async simulateSuccessfulTweet(tweetId: string) {
    try {
      await blink.db.tweets.update(tweetId, {
        status: 'published',
        published_at: new Date().toISOString()
      })
      console.log(`Tweet ${tweetId} marked as published`)
    } catch (error) {
      console.error(`Error simulating successful tweet ${tweetId}:`, error)
    }
  }

  /**
   * محاكاة فشل تغريدة (للاختبار)
   */
  async simulateFailedTweet(tweetId: string, reason: string = 'Test failure') {
    try {
      await blink.db.tweets.update(tweetId, {
        status: 'failed',
        error_message: reason,
        failure_reason: reason
      })
      
      // إرسال إشعار فوري
      await this.handleFailedTweet({ 
        id: tweetId, 
        user_id: 'test-user',
        content: 'Test tweet content',
        scheduled_at: new Date().toISOString(),
        email_notification_sent: 0
      })
      
      console.log(`Tweet ${tweetId} marked as failed with reason: ${reason}`)
    } catch (error) {
      console.error(`Error simulating failed tweet ${tweetId}:`, error)
    }
  }

  /**
   * الحصول على حالة المراقب
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null
    }
  }
}

// تصدير مثيل واحد
export const tweetMonitor = TweetMonitor.getInstance()