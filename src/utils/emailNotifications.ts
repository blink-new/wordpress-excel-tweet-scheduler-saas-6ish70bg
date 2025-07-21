import { blink } from '../blink/client'

export interface EmailNotificationData {
  userEmail: string
  userName: string
  tweetContent: string
  scheduledTime: string
  failureReason: string
  tweetId: string
}

/**
 * إرسال إشعار بالإيميل عند فشل إرسال تغريدة
 */
export async function sendTweetFailureNotification(data: EmailNotificationData): Promise<boolean> {
  try {
    const result = await blink.notifications.email({
      to: data.userEmail,
      from: 'notifications@tweetscheduler.com',
      subject: '⚠️ فشل في إرسال التغريدة المجدولة',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #dc3545; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 15px;">
                ⚠️
              </div>
              <h1 style="color: #dc3545; margin: 0; font-size: 24px;">فشل في إرسال التغريدة</h1>
            </div>

            <!-- Content -->
            <div style="margin-bottom: 25px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                مرحباً <strong>${data.userName}</strong>،
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                نأسف لإبلاغك أنه لم نتمكن من إرسال التغريدة المجدولة في الوقت المحدد.
              </p>

              <!-- Tweet Details -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h3 style="color: #dc3545; margin: 0 0 15px 0; font-size: 18px;">تفاصيل التغريدة:</h3>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #555;">المحتوى:</strong>
                  <div style="background-color: white; padding: 15px; border-radius: 5px; margin-top: 5px; border: 1px solid #e9ecef;">
                    <p style="margin: 0; color: #333; line-height: 1.5;">${data.tweetContent}</p>
                  </div>
                </div>

                <div style="margin-bottom: 15px;">
                  <strong style="color: #555;">الوقت المجدول:</strong>
                  <span style="color: #333; margin-right: 10px;">${new Date(data.scheduledTime).toLocaleString('ar-SA')}</span>
                </div>

                <div style="margin-bottom: 15px;">
                  <strong style="color: #555;">سبب الفشل:</strong>
                  <span style="color: #dc3545; margin-right: 10px;">${data.failureReason}</span>
                </div>

                <div>
                  <strong style="color: #555;">معرف التغريدة:</strong>
                  <span style="color: #6c757d; margin-right: 10px; font-family: monospace;">${data.tweetId}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tweetscheduler.com/dashboard" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                الذهاب إلى لوحة التحكم
              </a>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0066cc; margin: 0 0 15px 0; font-size: 16px;">ماذا يمكنك فعله الآن؟</h3>
              <ul style="color: #333; margin: 0; padding-right: 20px;">
                <li style="margin-bottom: 8px;">تحقق من اتصال حساب تويتر في لوحة التحكم</li>
                <li style="margin-bottom: 8px;">تأكد من صحة محتوى التغريدة وعدم انتهاكها لسياسات تويتر</li>
                <li style="margin-bottom: 8px;">أعد جدولة التغريدة لوقت لاحق</li>
                <li>تواصل مع الدعم الفني إذا استمرت المشكلة</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                هذا إشعار تلقائي من منصة TweetScheduler Pro
              </p>
              <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
                إذا كنت تواجه مشاكل، تواصل معنا على support@tweetscheduler.com
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        فشل في إرسال التغريدة المجدولة

        مرحباً ${data.userName}،

        نأسف لإبلاغك أنه لم نتمكن من إرسال التغريدة المجدولة في الوقت المحدد.

        تفاصيل التغريدة:
        - المحتوى: ${data.tweetContent}
        - الوقت المجدول: ${new Date(data.scheduledTime).toLocaleString('ar-SA')}
        - سبب الفشل: ${data.failureReason}
        - معرف التغريدة: ${data.tweetId}

        يمكنك الذهاب إلى لوحة التحكم لإعادة جدولة التغريدة:
        https://tweetscheduler.com/dashboard

        فريق TweetScheduler Pro
      `
    })

    console.log('Email notification sent successfully:', result.messageId)
    return result.success

  } catch (error) {
    console.error('Failed to send email notification:', error)
    return false
  }
}

/**
 * إرسال إشعار بالإيميل عند نجاح إرسال تغريدة
 */
export async function sendTweetSuccessNotification(data: Omit<EmailNotificationData, 'failureReason'>): Promise<boolean> {
  try {
    const result = await blink.notifications.email({
      to: data.userEmail,
      from: 'notifications@tweetscheduler.com',
      subject: '✅ تم إرسال التغريدة بنجاح',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #28a745; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 15px;">
                ✅
              </div>
              <h1 style="color: #28a745; margin: 0; font-size: 24px;">تم إرسال التغريدة بنجاح</h1>
            </div>

            <!-- Content -->
            <div style="margin-bottom: 25px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                مرحباً <strong>${data.userName}</strong>،
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                تم إرسال التغريدة المجدولة بنجاح في الوقت المحدد! 🎉
              </p>

              <!-- Tweet Details -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h3 style="color: #28a745; margin: 0 0 15px 0; font-size: 18px;">تفاصيل التغريدة:</h3>
                
                <div style="margin-bottom: 15px;">
                  <strong style="color: #555;">المحتوى:</strong>
                  <div style="background-color: white; padding: 15px; border-radius: 5px; margin-top: 5px; border: 1px solid #e9ecef;">
                    <p style="margin: 0; color: #333; line-height: 1.5;">${data.tweetContent}</p>
                  </div>
                </div>

                <div style="margin-bottom: 15px;">
                  <strong style="color: #555;">وقت الإرسال:</strong>
                  <span style="color: #333; margin-right: 10px;">${new Date(data.scheduledTime).toLocaleString('ar-SA')}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                شكراً لاستخدام منصة TweetScheduler Pro
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        تم إرسال التغريدة بنجاح

        مرحباً ${data.userName}،

        تم إرسال التغريدة المجدولة بنجاح في الوقت المحدد!

        تفاصيل التغريدة:
        - المحتوى: ${data.tweetContent}
        - وقت الإرسال: ${new Date(data.scheduledTime).toLocaleString('ar-SA')}

        شكراً لاستخدام TweetScheduler Pro
      `
    })

    return result.success

  } catch (error) {
    console.error('Failed to send success notification:', error)
    return false
  }
}