<?php
/**
 * TweetScheduler API Endpoints
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register REST API Routes
 */
function tweetscheduler_register_api_routes() {
    $namespace = 'tweetscheduler/v1';
    
    // Authentication endpoints
    register_rest_route($namespace, '/auth/login', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_login',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route($namespace, '/auth/register', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_register',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route($namespace, '/auth/me', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_me',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/auth/logout', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_logout',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    // User management endpoints
    register_rest_route($namespace, '/users', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_users',
        'permission_callback' => 'tweetscheduler_check_admin',
    ));
    
    register_rest_route($namespace, '/users/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_user',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/users/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'tweetscheduler_api_update_user',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/users/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'tweetscheduler_api_delete_user',
        'permission_callback' => 'tweetscheduler_check_admin',
    ));
    
    // Tweet management endpoints
    register_rest_route($namespace, '/tweets', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_tweets',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/tweets', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_create_tweet',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/tweets/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_tweet',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/tweets/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'tweetscheduler_api_update_tweet',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/tweets/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'tweetscheduler_api_delete_tweet',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/tweets/bulk', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_bulk_create_tweets',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    // File upload endpoints
    register_rest_route($namespace, '/upload', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_upload_file',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/upload/process', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_process_file',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    // Subscription endpoints
    register_rest_route($namespace, '/subscription', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_subscription',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/subscription', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_update_subscription',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    register_rest_route($namespace, '/subscription/plans', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_plans',
        'permission_callback' => '__return_true',
    ));
    
    // Analytics endpoints
    register_rest_route($namespace, '/analytics/dashboard', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_dashboard_analytics',
        'permission_callback' => 'tweetscheduler_check_admin',
    ));
    
    register_rest_route($namespace, '/analytics/user/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_user_analytics',
        'permission_callback' => 'tweetscheduler_check_auth',
    ));
    
    // Settings endpoints
    register_rest_route($namespace, '/settings', array(
        'methods' => 'GET',
        'callback' => 'tweetscheduler_api_get_settings',
        'permission_callback' => 'tweetscheduler_check_admin',
    ));
    
    register_rest_route($namespace, '/settings', array(
        'methods' => 'POST',
        'callback' => 'tweetscheduler_api_update_settings',
        'permission_callback' => 'tweetscheduler_check_admin',
    ));
}
add_action('rest_api_init', 'tweetscheduler_register_api_routes');

/**
 * Permission Callbacks
 */
function tweetscheduler_check_auth($request) {
    return is_user_logged_in();
}

function tweetscheduler_check_admin($request) {
    return current_user_can('manage_tweetscheduler');
}

/**
 * Authentication Endpoints
 */
function tweetscheduler_api_login($request) {
    $email = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');
    
    if (empty($email) || empty($password)) {
        return new WP_Error('missing_credentials', 'Email and password are required.', array('status' => 400));
    }
    
    $user = wp_authenticate($email, $password);
    
    if (is_wp_error($user)) {
        return new WP_Error('invalid_credentials', 'Invalid email or password.', array('status' => 401));
    }
    
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID);
    
    // Log analytics
    tweetscheduler_log_analytics($user->ID, 'login');
    
    return array(
        'success' => true,
        'user' => array(
            'id' => $user->ID,
            'email' => $user->user_email,
            'display_name' => $user->display_name,
            'roles' => $user->roles,
        ),
        'token' => wp_create_nonce('wp_rest'),
    );
}

function tweetscheduler_api_register($request) {
    $email = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');
    $display_name = sanitize_text_field($request->get_param('display_name'));
    
    if (empty($email) || empty($password)) {
        return new WP_Error('missing_credentials', 'Email and password are required.', array('status' => 400));
    }
    
    if (email_exists($email)) {
        return new WP_Error('email_exists', 'Email already exists.', array('status' => 400));
    }
    
    $user_id = wp_create_user($email, $password, $email);
    
    if (is_wp_error($user_id)) {
        return $user_id;
    }
    
    // Update user meta
    wp_update_user(array(
        'ID' => $user_id,
        'display_name' => $display_name ?: $email,
        'role' => 'tweetscheduler_user',
    ));
    
    // Create trial subscription
    tweetscheduler_create_trial_subscription($user_id);
    
    // Log analytics
    tweetscheduler_log_analytics($user_id, 'register');
    
    return array(
        'success' => true,
        'user_id' => $user_id,
        'message' => 'Account created successfully. Please log in.',
    );
}

function tweetscheduler_api_me($request) {
    $user = wp_get_current_user();
    $subscription = tweetscheduler_get_user_subscription($user->ID);
    
    return array(
        'id' => $user->ID,
        'email' => $user->user_email,
        'display_name' => $user->display_name,
        'roles' => $user->roles,
        'subscription' => $subscription,
        'avatar_url' => get_avatar_url($user->ID),
    );
}

function tweetscheduler_api_logout($request) {
    wp_logout();
    return array('success' => true, 'message' => 'Logged out successfully.');
}

/**
 * Tweet Management Endpoints
 */
function tweetscheduler_api_get_tweets($request) {
    global $wpdb;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    
    $user_id = get_current_user_id();
    $page = max(1, intval($request->get_param('page')));
    $per_page = min(100, max(1, intval($request->get_param('per_page')) ?: 20));
    $status = sanitize_text_field($request->get_param('status'));
    $offset = ($page - 1) * $per_page;
    
    $where_clause = "WHERE user_id = %d";
    $params = array($user_id);
    
    if ($status) {
        $where_clause .= " AND status = %s";
        $params[] = $status;
    }
    
    $tweets = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $tweets_table $where_clause ORDER BY scheduled_time DESC LIMIT %d OFFSET %d",
        array_merge($params, array($per_page, $offset))
    ));
    
    $total = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $tweets_table $where_clause",
        $params
    ));
    
    return array(
        'tweets' => $tweets,
        'total' => intval($total),
        'page' => $page,
        'per_page' => $per_page,
        'total_pages' => ceil($total / $per_page),
    );
}

function tweetscheduler_api_create_tweet($request) {
    global $wpdb;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    
    $user_id = get_current_user_id();
    $content = sanitize_textarea_field($request->get_param('content'));
    $scheduled_time = sanitize_text_field($request->get_param('scheduled_time'));
    $media_urls = $request->get_param('media_urls');
    $hashtags = $request->get_param('hashtags');
    
    if (empty($content) || empty($scheduled_time)) {
        return new WP_Error('missing_data', 'Content and scheduled time are required.', array('status' => 400));
    }
    
    // Check subscription limits
    if (!tweetscheduler_check_tweet_limit($user_id)) {
        return new WP_Error('limit_exceeded', 'Tweet limit exceeded for your subscription.', array('status' => 403));
    }
    
    $result = $wpdb->insert(
        $tweets_table,
        array(
            'user_id' => $user_id,
            'content' => $content,
            'scheduled_time' => $scheduled_time,
            'media_urls' => is_array($media_urls) ? json_encode($media_urls) : $media_urls,
            'hashtags' => is_array($hashtags) ? json_encode($hashtags) : $hashtags,
            'status' => 'scheduled',
        ),
        array('%d', '%s', '%s', '%s', '%s', '%s')
    );
    
    if ($result === false) {
        return new WP_Error('database_error', 'Failed to create tweet.', array('status' => 500));
    }
    
    $tweet_id = $wpdb->insert_id;
    
    // Update subscription usage
    tweetscheduler_increment_tweet_usage($user_id);
    
    // Log analytics
    tweetscheduler_log_analytics($user_id, 'tweet_created', array('tweet_id' => $tweet_id));
    
    return array(
        'success' => true,
        'tweet_id' => $tweet_id,
        'message' => 'Tweet scheduled successfully.',
    );
}

function tweetscheduler_api_bulk_create_tweets($request) {
    $tweets = $request->get_param('tweets');
    
    if (!is_array($tweets) || empty($tweets)) {
        return new WP_Error('invalid_data', 'Tweets array is required.', array('status' => 400));
    }
    
    $user_id = get_current_user_id();
    $created_tweets = array();
    $errors = array();
    
    foreach ($tweets as $index => $tweet_data) {
        $tweet_request = new WP_REST_Request('POST', '/tweetscheduler/v1/tweets');
        $tweet_request->set_param('content', $tweet_data['content']);
        $tweet_request->set_param('scheduled_time', $tweet_data['scheduled_time']);
        $tweet_request->set_param('media_urls', $tweet_data['media_urls'] ?? null);
        $tweet_request->set_param('hashtags', $tweet_data['hashtags'] ?? null);
        
        $result = tweetscheduler_api_create_tweet($tweet_request);
        
        if (is_wp_error($result)) {
            $errors[] = array(
                'index' => $index,
                'error' => $result->get_error_message(),
            );
        } else {
            $created_tweets[] = $result;
        }
    }
    
    return array(
        'success' => true,
        'created' => count($created_tweets),
        'errors' => count($errors),
        'tweets' => $created_tweets,
        'error_details' => $errors,
    );
}

/**
 * Subscription Management
 */
function tweetscheduler_api_get_subscription($request) {
    $user_id = get_current_user_id();
    $subscription = tweetscheduler_get_user_subscription($user_id);
    
    return $subscription;
}

function tweetscheduler_api_get_plans($request) {
    return array(
        'trial' => array(
            'name' => 'Trial',
            'price' => 0,
            'currency' => 'SAR',
            'duration' => '3 days',
            'tweet_limit' => 7,
            'features' => array('Basic scheduling', 'Email support'),
        ),
        'starter' => array(
            'name' => 'Starter',
            'price' => 19,
            'currency' => 'SAR',
            'duration' => 'monthly',
            'tweet_limit' => 30,
            'features' => array('Basic scheduling', 'Email support', 'Analytics'),
        ),
        'pro' => array(
            'name' => 'Pro',
            'price' => 39,
            'currency' => 'SAR',
            'duration' => 'monthly',
            'tweet_limit' => 120,
            'features' => array('Advanced scheduling', 'Priority support', 'Analytics', 'Multi-platform (coming soon)'),
        ),
        'enterprise' => array(
            'name' => 'Enterprise',
            'price' => 99,
            'currency' => 'SAR',
            'duration' => 'monthly',
            'tweet_limit' => -1,
            'features' => array('Unlimited tweets', 'Priority support', 'Analytics', 'Teams/sub-accounts', 'Custom integrations'),
        ),
    );
}

/**
 * Analytics Endpoints
 */
function tweetscheduler_api_get_dashboard_analytics($request) {
    global $wpdb;
    
    $users_table = $wpdb->users;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    $analytics_table = $wpdb->prefix . 'tweetscheduler_analytics';
    
    // Get basic stats
    $total_users = $wpdb->get_var("SELECT COUNT(*) FROM $users_table");
    $total_tweets = $wpdb->get_var("SELECT COUNT(*) FROM $tweets_table");
    $active_subscriptions = $wpdb->get_var("SELECT COUNT(*) FROM $subscriptions_table WHERE status = 'active'");
    $tweets_today = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $tweets_table WHERE DATE(created_at) = %s",
        date('Y-m-d')
    ));
    
    // Get subscription breakdown
    $subscription_stats = $wpdb->get_results(
        "SELECT plan_type, COUNT(*) as count FROM $subscriptions_table GROUP BY plan_type"
    );
    
    // Get recent activity
    $recent_activity = $wpdb->get_results($wpdb->prepare(
        "SELECT event_type, COUNT(*) as count, DATE(created_at) as date 
         FROM $analytics_table 
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
         GROUP BY event_type, DATE(created_at) 
         ORDER BY created_at DESC 
         LIMIT %d",
        50
    ));
    
    return array(
        'total_users' => intval($total_users),
        'total_tweets' => intval($total_tweets),
        'active_subscriptions' => intval($active_subscriptions),
        'tweets_today' => intval($tweets_today),
        'subscription_stats' => $subscription_stats,
        'recent_activity' => $recent_activity,
    );
}

/**
 * Settings Endpoints
 */
function tweetscheduler_api_get_settings($request) {
    $settings = array();
    $setting_keys = array(
        'site_title', 'site_description', 'primary_color', 'accent_color',
        'enable_rtl', 'default_language', 'trial_duration', 'trial_tweet_limit',
        'starter_price', 'starter_tweet_limit', 'pro_price', 'pro_tweet_limit',
        'enterprise_price', 'enterprise_tweet_limit', 'payment_currency',
        'enable_stc_pay', 'enable_mada', 'enable_apple_pay'
    );
    
    foreach ($setting_keys as $key) {
        $settings[$key] = tweetscheduler_get_setting($key);
    }
    
    return $settings;
}

function tweetscheduler_api_update_settings($request) {
    $settings = $request->get_params();
    $updated = 0;
    
    $allowed_settings = array(
        'site_title', 'site_description', 'primary_color', 'accent_color',
        'enable_rtl', 'default_language', 'trial_duration', 'trial_tweet_limit',
        'starter_price', 'starter_tweet_limit', 'pro_price', 'pro_tweet_limit',
        'enterprise_price', 'enterprise_tweet_limit', 'payment_currency',
        'enable_stc_pay', 'enable_mada', 'enable_apple_pay'
    );
    
    foreach ($settings as $key => $value) {
        if (in_array($key, $allowed_settings)) {
            if (tweetscheduler_update_setting($key, sanitize_text_field($value))) {
                $updated++;
            }
        }
    }
    
    return array(
        'success' => true,
        'updated' => $updated,
        'message' => "Updated $updated settings.",
    );
}

/**
 * File Upload Endpoint
 */
function tweetscheduler_api_upload_file($request) {
    if (!function_exists('wp_handle_upload')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
    }
    
    $files = $request->get_file_params();
    
    if (empty($files['file'])) {
        return new WP_Error('no_file', 'No file uploaded.', array('status' => 400));
    }
    
    $file = $files['file'];
    $upload_overrides = array('test_form' => false);
    
    $movefile = wp_handle_upload($file, $upload_overrides);
    
    if ($movefile && !isset($movefile['error'])) {
        return array(
            'success' => true,
            'file_url' => $movefile['url'],
            'file_path' => $movefile['file'],
            'file_type' => $movefile['type'],
        );
    } else {
        return new WP_Error('upload_error', $movefile['error'], array('status' => 500));
    }
}

/**
 * Helper Functions
 */
function tweetscheduler_create_trial_subscription($user_id) {
    global $wpdb;
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    
    $trial_duration = intval(tweetscheduler_get_setting('trial_duration', 3));
    $trial_limit = intval(tweetscheduler_get_setting('trial_tweet_limit', 7));
    
    return $wpdb->insert(
        $subscriptions_table,
        array(
            'user_id' => $user_id,
            'plan_type' => 'trial',
            'status' => 'active',
            'tweets_used' => 0,
            'tweets_limit' => $trial_limit,
            'end_date' => date('Y-m-d H:i:s', strtotime("+{$trial_duration} days")),
        ),
        array('%d', '%s', '%s', '%d', '%d', '%s')
    );
}

function tweetscheduler_get_user_subscription($user_id) {
    global $wpdb;
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    
    return $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $subscriptions_table WHERE user_id = %d",
        $user_id
    ), ARRAY_A);
}

function tweetscheduler_check_tweet_limit($user_id) {
    $subscription = tweetscheduler_get_user_subscription($user_id);
    
    if (!$subscription || $subscription['status'] !== 'active') {
        return false;
    }
    
    if ($subscription['tweets_limit'] === -1) {
        return true; // Unlimited
    }
    
    return $subscription['tweets_used'] < $subscription['tweets_limit'];
}

function tweetscheduler_increment_tweet_usage($user_id) {
    global $wpdb;
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    
    return $wpdb->query($wpdb->prepare(
        "UPDATE $subscriptions_table SET tweets_used = tweets_used + 1 WHERE user_id = %d",
        $user_id
    ));
}