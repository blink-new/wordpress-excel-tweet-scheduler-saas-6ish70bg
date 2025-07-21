# TweetScheduler Pro - WordPress + React Hybrid Setup

This guide explains how to set up and deploy the WordPress + React hybrid version of TweetScheduler Pro, where WordPress serves as the backend API and content management system, while React handles the frontend user interface.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  WordPress API  │    │    Database     │
│                 │◄──►│                 │◄──►│                 │
│ - User Interface│    │ - REST API      │    │ - Users         │
│ - State Management│  │ - Authentication│    │ - Tweets        │
│ - File Upload   │    │ - File Processing│   │ - Analytics     │
│ - Tweet Scheduling│  │ - Cron Jobs     │    │ - Subscriptions │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
project-root/
├── src/                          # React Frontend
│   ├── components/
│   ├── pages/
│   ├── lib/
│   │   ├── wordpress-api.ts      # WordPress API client
│   │   └── hybrid-client.ts      # Unified client interface
│   └── ...
├── wordpress/                    # WordPress Backend
│   ├── wp-config.php
│   ├── wp-content/
│   │   └── themes/
│   │       └── tweetscheduler/
│   │           ├── functions.php
│   │           ├── index.php
│   │           └── includes/
│   │               ├── api-endpoints.php
│   │               ├── admin-functions.php
│   │               ├── user-management.php
│   │               ├── tweet-scheduler.php
│   │               ├── subscription-manager.php
│   │               └── payment-gateways.php
│   └── ...
└── README-WordPress-Hybrid.md
```

## 🚀 Setup Instructions

### 1. WordPress Backend Setup

#### Step 1: Install WordPress
```bash
# Download WordPress
wget https://wordpress.org/latest.tar.gz
tar -xzf latest.tar.gz
mv wordpress/* ./wordpress/
```

#### Step 2: Configure Database
1. Create a MySQL database for TweetScheduler Pro
2. Update `wordpress/wp-config.php` with your database credentials:

```php
define('DB_NAME', 'tweetscheduler_db');
define('DB_USER', 'your_db_user');
define('DB_PASSWORD', 'your_db_password');
define('DB_HOST', 'localhost');
```

#### Step 3: Install WordPress Theme
1. Copy the `tweetscheduler` theme to `wp-content/themes/`
2. Activate the theme from WordPress admin
3. The theme will automatically create the required database tables

#### Step 4: Configure API Settings
1. Go to WordPress Admin → TweetScheduler → Settings
2. Add your API keys:
   - Twitter API credentials
   - Payment gateway keys (STC Pay, Mada, HyperPay)

### 2. React Frontend Setup

#### Step 1: Configure Environment
Create a `.env.local` file in the React project root:

```env
# Backend Configuration
REACT_APP_BACKEND_TYPE=wordpress
REACT_APP_WORDPRESS_URL=http://localhost:8080
REACT_APP_WORDPRESS_NONCE=your_wp_nonce

# Production URLs
REACT_APP_PRODUCTION_WORDPRESS_URL=https://your-domain.com
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Update API Client
The hybrid client will automatically use WordPress API when `REACT_APP_BACKEND_TYPE=wordpress`.

### 3. Development Workflow

#### Start WordPress Development Server
```bash
cd wordpress
php -S localhost:8080
```

#### Start React Development Server
```bash
npm run dev
```

The React app will run on `http://localhost:3000` and communicate with WordPress on `http://localhost:8080`.

## 🔧 Configuration Options

### Backend Switching
You can switch between Blink SDK and WordPress backend by changing the environment variable:

```env
# Use Blink SDK (default)
REACT_APP_BACKEND_TYPE=blink

# Use WordPress API
REACT_APP_BACKEND_TYPE=wordpress
```

### WordPress API Endpoints

The WordPress backend provides these REST API endpoints:

```
GET    /wp-json/tweetscheduler/v1/user/profile
PUT    /wp-json/tweetscheduler/v1/user/profile
GET    /wp-json/tweetscheduler/v1/tweets
POST   /wp-json/tweetscheduler/v1/tweets
PUT    /wp-json/tweetscheduler/v1/tweets/{id}
DELETE /wp-json/tweetscheduler/v1/tweets/{id}
POST   /wp-json/tweetscheduler/v1/tweets/bulk
POST   /wp-json/tweetscheduler/v1/upload
GET    /wp-json/tweetscheduler/v1/subscription
POST   /wp-json/tweetscheduler/v1/subscription/upgrade
GET    /wp-json/tweetscheduler/v1/analytics/dashboard
POST   /wp-json/tweetscheduler/v1/twitter/connect
```

## 📊 WordPress Admin Dashboard

Access the admin dashboard at `/wp-admin` to manage:

### Dashboard Overview
- Total users and active subscriptions
- Tweet statistics (scheduled, published, failed)
- Recent user activity
- System health monitoring

### User Management
- View all registered users
- Manage subscription tiers
- Reset tweet counts
- Monitor usage limits

### Tweet Management
- View all scheduled tweets
- Manually publish tweets
- Delete problematic tweets
- Monitor tweet status

### Settings
- Configure Twitter API credentials
- Set up payment gateways
- Manage system settings
- Update subscription limits

## 🔐 Security Features

### Authentication
- WordPress user authentication
- JWT token management
- Session security
- CORS protection

### Data Protection
- SQL injection prevention
- XSS protection
- File upload validation
- Rate limiting

### API Security
- Nonce verification
- Permission checks
- Input sanitization
- Error handling

## 📱 Mobile Support

The React frontend is fully responsive and works on:
- Desktop browsers
- Mobile devices
- Tablets
- Progressive Web App (PWA) ready

## 🌍 Arabic RTL Support

Full Arabic language support including:
- RTL text direction
- Arabic fonts (Noto Sans Arabic)
- Localized date/time formats
- Arabic number formatting
- Cultural adaptations for Gulf region

## 💳 Payment Integration

Supports Gulf region payment methods:
- STC Pay
- Mada
- Apple Pay
- HyperPay
- Tabby / Tamara
- Visa / Mastercard

## 📈 Subscription Management

### Subscription Tiers
- **Trial**: 7 tweets, 3 days (SAR 0)
- **Starter**: 30 tweets/month (SAR 19)
- **Pro**: 120 tweets/month (SAR 39)
- **Enterprise**: Unlimited tweets (SAR 99)

### Features by Tier
- Automatic trial activation
- Usage tracking and limits
- Subscription renewal
- Payment processing
- Invoice generation

## 🔄 Tweet Scheduling

### Automated Processing
- Cron job runs every minute
- Processes scheduled tweets
- Handles Twitter API integration
- Error handling and retry logic
- Email notifications

### File Upload Support
- Excel (.xlsx) files
- CSV files
- File size validation (5MB max)
- Content parsing and validation
- Bulk tweet creation

## 📧 Email Notifications

Automated emails for:
- Welcome messages
- Subscription confirmations
- Tweet failure notifications
- Trial expiration warnings
- Payment receipts

## 🚀 Deployment

### Production Deployment

1. **WordPress Hosting**
   - Upload WordPress files to web server
   - Configure database connection
   - Set up SSL certificate
   - Configure cron jobs

2. **React Build**
   ```bash
   npm run build
   ```
   - Upload build files to WordPress theme
   - Update API URLs for production
   - Configure CDN if needed

3. **Domain Configuration**
   - Point domain to WordPress installation
   - Configure DNS settings
   - Set up email delivery
   - Configure payment webhooks

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check WordPress CORS headers
   - Verify allowed origins
   - Update .htaccess if needed

2. **API Authentication**
   - Verify WordPress nonce
   - Check user permissions
   - Validate JWT tokens

3. **File Upload Issues**
   - Check PHP upload limits
   - Verify file permissions
   - Validate file types

4. **Cron Job Problems**
   - Test WordPress cron
   - Check server cron configuration
   - Verify Twitter API credentials

## 📞 Support

For technical support:
- Check WordPress error logs
- Review React console errors
- Test API endpoints manually
- Contact development team

## 🔄 Migration from Blink SDK

To migrate existing data from Blink SDK to WordPress:

1. Export data from Blink
2. Create migration scripts
3. Import users and tweets
4. Update subscription data
5. Test functionality
6. Switch backend configuration

This hybrid approach gives you the flexibility to use either Blink SDK for rapid development or WordPress for full control and customization.