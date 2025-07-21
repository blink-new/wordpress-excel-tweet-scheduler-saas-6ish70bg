# TweetScheduler Pro WordPress Installation Guide

## 📋 Overview

This guide will help you install and configure the complete WordPress backend for TweetScheduler Pro, including all the necessary components for a fully functional SaaS platform.

## 🚀 Quick Start

### Prerequisites

- WordPress 5.8 or higher
- PHP 7.4 or higher
- MySQL 5.7 or higher
- SSL certificate (required for payment processing)
- cURL extension enabled
- GD extension enabled (for image processing)

### 1. WordPress Installation

1. **Download WordPress**
   ```bash
   wget https://wordpress.org/latest.zip
   unzip latest.zip
   ```

2. **Upload Files**
   - Upload the entire `wordpress` folder to your web server
   - Copy the TweetScheduler theme to `wp-content/themes/tweetscheduler/`

3. **Database Setup**
   - Create a new MySQL database
   - Create a database user with full privileges
   - Note down the database credentials

4. **WordPress Configuration**
   - Rename `wp-config-sample.php` to `wp-config.php`
   - Update database credentials in `wp-config.php`
   - Add security keys (use https://api.wordpress.org/secret-key/1.1/salt/)

### 2. Theme Activation

1. **Login to WordPress Admin**
   - Go to `yoursite.com/wp-admin`
   - Complete the WordPress installation wizard

2. **Activate TweetScheduler Theme**
   - Go to Appearance → Themes
   - Activate "TweetScheduler Pro" theme

3. **Verify Installation**
   - Check that custom database tables are created
   - Verify that the admin menu appears

## ⚙️ Configuration

### 3. Basic Settings

1. **Site Configuration**
   - Go to TweetScheduler → Settings
   - Configure site title and description
   - Set primary and accent colors
   - Enable RTL support if needed

2. **User Roles**
   - The theme automatically creates custom user roles:
     - `tweetscheduler_user` - Regular users
     - `tweetscheduler_admin` - Admin users

### 4. Twitter API Setup

1. **Create Twitter Developer Account**
   - Go to https://developer.twitter.com
   - Apply for a developer account
   - Create a new app

2. **Get API Credentials**
   - API Key
   - API Secret Key
   - Access Token
   - Access Token Secret

3. **Configure in WordPress**
   - Go to TweetScheduler → Settings
   - Enter your Twitter API credentials
   - Test the connection

### 5. Google OAuth Setup

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com
   - Create a new project
   - Enable Google+ API

2. **Create OAuth Credentials**
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Set authorized redirect URIs:
     - `https://yoursite.com/wp-admin/admin-ajax.php?action=tweetscheduler_google_auth`

3. **Configure in WordPress**
   - Go to TweetScheduler → Settings
   - Enter Client ID and Client Secret

### 6. Payment Gateway Setup

#### STC Pay
1. **Register with STC Pay**
   - Contact STC Pay for merchant account
   - Get API credentials

2. **Configure**
   - Go to TweetScheduler → Settings → Payment Gateways
   - Enter STC Pay API Key and Merchant ID
   - Set webhook URL: `yoursite.com/wp-admin/admin-ajax.php?action=tweetscheduler_stc_webhook`

#### HyperPay (for Mada and Credit Cards)
1. **Register with HyperPay**
   - Apply for HyperPay merchant account
   - Get test and live credentials

2. **Configure**
   - Enter User ID, Password, and Entity ID
   - Set webhook URL: `yoursite.com/wp-admin/admin-ajax.php?action=tweetscheduler_hyperpay_webhook`

#### Tabby (Buy Now, Pay Later)
1. **Register with Tabby**
   - Apply at https://tabby.ai/business
   - Get API credentials

2. **Configure**
   - Enter Public Key, Secret Key, and Merchant Code
   - Set webhook URL: `yoursite.com/wp-admin/admin-ajax.php?action=tweetscheduler_tabby_webhook`

### 7. Email Configuration

1. **SMTP Setup**
   - Install WP Mail SMTP plugin (recommended)
   - Configure with your email provider
   - Test email delivery

2. **Email Templates**
   - Welcome emails are automatically sent
   - Customize email templates in the theme files

## 🔧 Advanced Configuration

### 8. Cron Jobs

The theme uses WordPress cron for automated tasks:

- **Tweet Processing**: Every minute
- **Subscription Checks**: Daily
- **Failed Tweet Retry**: Hourly
- **Cleanup**: Weekly

For better reliability, set up server-side cron:

```bash
# Add to crontab
* * * * * wget -q -O - https://yoursite.com/wp-cron.php?doing_wp_cron >/dev/null 2>&1
```

### 9. Security Hardening

1. **SSL Certificate**
   - Install SSL certificate (required for payments)
   - Force HTTPS redirects

2. **Security Plugins**
   - Install Wordfence or similar security plugin
   - Enable two-factor authentication for admin users

3. **File Permissions**
   ```bash
   find /path/to/wordpress/ -type d -exec chmod 755 {} \;
   find /path/to/wordpress/ -type f -exec chmod 644 {} \;
   chmod 600 wp-config.php
   ```

### 10. Performance Optimization

1. **Caching**
   - Install WP Rocket or W3 Total Cache
   - Enable object caching (Redis/Memcached)

2. **CDN**
   - Set up CloudFlare or similar CDN
   - Configure image optimization

3. **Database Optimization**
   - Regular database cleanup
   - Optimize database tables

## 📊 Database Schema

The theme creates these custom tables:

- `wp_tweetscheduler_tweets` - Scheduled tweets
- `wp_tweetscheduler_subscriptions` - User subscriptions
- `wp_tweetscheduler_analytics` - Analytics data
- `wp_tweetscheduler_settings` - Theme settings
- `wp_tweetscheduler_payments` - Payment sessions
- `wp_tweetscheduler_invoices` - Invoice records

## 🔌 API Endpoints

The theme provides REST API endpoints:

### Authentication
- `POST /wp-json/tweetscheduler/v1/auth/login`
- `POST /wp-json/tweetscheduler/v1/auth/register`
- `GET /wp-json/tweetscheduler/v1/auth/me`

### Tweets
- `GET /wp-json/tweetscheduler/v1/tweets`
- `POST /wp-json/tweetscheduler/v1/tweets`
- `PUT /wp-json/tweetscheduler/v1/tweets/{id}`
- `DELETE /wp-json/tweetscheduler/v1/tweets/{id}`

### Subscriptions
- `GET /wp-json/tweetscheduler/v1/subscription`
- `POST /wp-json/tweetscheduler/v1/subscription`
- `GET /wp-json/tweetscheduler/v1/subscription/plans`

### File Upload
- `POST /wp-json/tweetscheduler/v1/upload`
- `POST /wp-json/tweetscheduler/v1/upload/process`

## 🎨 Customization

### Theme Customization

1. **Colors and Branding**
   - Go to Appearance → Customize
   - Modify colors, fonts, and branding
   - Changes apply site-wide

2. **Custom CSS**
   - Add custom CSS in Appearance → Customize → Additional CSS
   - Or modify theme files directly

### Language Support

1. **Arabic RTL Support**
   - Enable in TweetScheduler → Settings
   - Arabic fonts are automatically loaded

2. **Translation**
   - Use Loco Translate plugin for custom translations
   - Translation files are in `/languages/` folder

## 🚨 Troubleshooting

### Common Issues

1. **Database Tables Not Created**
   - Deactivate and reactivate the theme
   - Check file permissions
   - Verify database user privileges

2. **Cron Jobs Not Running**
   - Check if WP-Cron is disabled
   - Set up server-side cron jobs
   - Verify cron job schedules

3. **API Errors**
   - Check permalink structure (must be "Post name")
   - Verify .htaccess file
   - Test API endpoints manually

4. **Payment Issues**
   - Verify SSL certificate
   - Check payment gateway credentials
   - Test webhook URLs

5. **Email Not Sending**
   - Configure SMTP settings
   - Check email logs
   - Verify sender domain reputation

### Debug Mode

Enable WordPress debug mode for troubleshooting:

```php
// Add to wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Check debug logs in `/wp-content/debug.log`

## 📞 Support

### Admin Dashboard

Access the admin dashboard at:
- `yoursite.com/wp-admin/admin.php?page=tweetscheduler-dashboard`

Features:
- User management
- Tweet monitoring
- Analytics
- System status
- Settings configuration

### Monitoring

Monitor these metrics:
- Active users and subscriptions
- Tweet success/failure rates
- Payment processing
- System performance
- Error logs

## 🔄 Updates and Maintenance

### Regular Maintenance

1. **Weekly Tasks**
   - Check system status
   - Review error logs
   - Monitor performance
   - Update plugins

2. **Monthly Tasks**
   - Database optimization
   - Security audit
   - Backup verification
   - Performance review

3. **Quarterly Tasks**
   - Full security scan
   - Performance optimization
   - Feature updates
   - User feedback review

### Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Store offsite (AWS S3, Google Drive)
   - Test restore procedures

2. **File Backups**
   - Weekly full site backups
   - Include wp-content and theme files
   - Version control for custom code

## 🎯 Going Live

### Pre-Launch Checklist

- [ ] SSL certificate installed
- [ ] All API credentials configured
- [ ] Payment gateways tested
- [ ] Email delivery working
- [ ] Cron jobs running
- [ ] Security hardening complete
- [ ] Performance optimized
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Documentation updated

### Launch Day

1. **Final Testing**
   - Test all user flows
   - Verify payment processing
   - Check email notifications
   - Test mobile responsiveness

2. **Go Live**
   - Switch to live payment credentials
   - Update DNS if needed
   - Monitor for issues
   - Be ready for support

3. **Post-Launch**
   - Monitor system performance
   - Check error logs
   - Respond to user feedback
   - Plan feature updates

---

**Congratulations!** You now have a fully functional WordPress backend for TweetScheduler Pro. The system is ready to handle user registrations, tweet scheduling, payments, and all the features of a modern SaaS platform.

For additional support or custom development, please contact the development team.