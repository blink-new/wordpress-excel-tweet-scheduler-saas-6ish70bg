<?php
/**
 * TweetScheduler Pro WordPress Theme Functions
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Theme constants
define('TWEETSCHEDULER_VERSION', '1.0.0');
define('TWEETSCHEDULER_THEME_DIR', get_template_directory());
define('TWEETSCHEDULER_THEME_URL', get_template_directory_uri());

/**
 * Theme Setup
 */
function tweetscheduler_setup() {
    // Add theme support
    add_theme_support('post-thumbnails');
    add_theme_support('title-tag');
    add_theme_support('custom-logo');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));
    
    // Register navigation menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'tweetscheduler'),
        'footer' => __('Footer Menu', 'tweetscheduler'),
    ));
}
add_action('after_setup_theme', 'tweetscheduler_setup');

/**
 * Enqueue Scripts and Styles
 */
function tweetscheduler_scripts() {
    // Enqueue styles
    wp_enqueue_style('tweetscheduler-style', get_stylesheet_uri(), array(), TWEETSCHEDULER_VERSION);
    wp_enqueue_style('tweetscheduler-admin', TWEETSCHEDULER_THEME_URL . '/assets/css/admin.css', array(), TWEETSCHEDULER_VERSION);
    
    // Enqueue scripts
    wp_enqueue_script('tweetscheduler-main', TWEETSCHEDULER_THEME_URL . '/assets/js/main.js', array('jquery'), TWEETSCHEDULER_VERSION, true);
    
    // Localize script for AJAX
    wp_localize_script('tweetscheduler-main', 'tweetscheduler_ajax', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('tweetscheduler_nonce'),
        'api_url' => home_url('/wp-json/tweetscheduler/v1/'),
    ));
}
add_action('wp_enqueue_scripts', 'tweetscheduler_scripts');

/**
 * Create Custom Database Tables
 */
function tweetscheduler_create_tables() {
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    
    // Tweets table
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    $tweets_sql = "CREATE TABLE $tweets_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        content text NOT NULL,
        scheduled_time datetime NOT NULL,
        status varchar(20) DEFAULT 'scheduled',
        twitter_id varchar(50) DEFAULT NULL,
        media_urls text DEFAULT NULL,
        hashtags text DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY scheduled_time (scheduled_time),
        KEY status (status)
    ) $charset_collate;";
    
    // User subscriptions table
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    $subscriptions_sql = "CREATE TABLE $subscriptions_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        plan_type varchar(20) NOT NULL DEFAULT 'trial',
        status varchar(20) NOT NULL DEFAULT 'active',
        tweets_used int(11) DEFAULT 0,
        tweets_limit int(11) DEFAULT 7,
        start_date datetime DEFAULT CURRENT_TIMESTAMP,
        end_date datetime DEFAULT NULL,
        payment_id varchar(100) DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY user_id (user_id),
        KEY plan_type (plan_type),
        KEY status (status)
    ) $charset_collate;";
    
    // Analytics table
    $analytics_table = $wpdb->prefix . 'tweetscheduler_analytics';
    $analytics_sql = "CREATE TABLE $analytics_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        event_type varchar(50) NOT NULL,
        event_data text DEFAULT NULL,
        ip_address varchar(45) DEFAULT NULL,
        user_agent text DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY event_type (event_type),
        KEY created_at (created_at)
    ) $charset_collate;";
    
    // Settings table
    $settings_table = $wpdb->prefix . 'tweetscheduler_settings';
    $settings_sql = "CREATE TABLE $settings_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        setting_key varchar(100) NOT NULL,
        setting_value longtext DEFAULT NULL,
        autoload varchar(20) NOT NULL DEFAULT 'yes',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY setting_key (setting_key)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($tweets_sql);
    dbDelta($subscriptions_sql);
    dbDelta($analytics_sql);
    dbDelta($settings_sql);
    
    // Insert default settings
    tweetscheduler_insert_default_settings();
}

/**
 * Insert Default Settings
 */
function tweetscheduler_insert_default_settings() {
    global $wpdb;
    
    $settings_table = $wpdb->prefix . 'tweetscheduler_settings';
    
    $default_settings = array(
        'twitter_api_key' => '',
        'twitter_api_secret' => '',
        'twitter_access_token' => '',
        'twitter_access_token_secret' => '',
        'site_title' => 'TweetScheduler Pro',
        'site_description' => 'Schedule Your Tweets from Excel – The Smart Way to Post!',
        'primary_color' => '#1DA1F2',
        'accent_color' => '#14B8A6',
        'enable_rtl' => 'yes',
        'default_language' => 'en',
        'trial_duration' => '3',
        'trial_tweet_limit' => '7',
        'starter_price' => '19',
        'starter_tweet_limit' => '30',
        'pro_price' => '39',
        'pro_tweet_limit' => '120',
        'enterprise_price' => '99',
        'enterprise_tweet_limit' => '-1',
        'payment_currency' => 'SAR',
        'enable_stc_pay' => 'yes',
        'enable_mada' => 'yes',
        'enable_apple_pay' => 'yes',
        'smtp_host' => '',
        'smtp_port' => '587',
        'smtp_username' => '',
        'smtp_password' => '',
        'google_oauth_client_id' => '',
        'google_oauth_client_secret' => '',
    );
    
    foreach ($default_settings as $key => $value) {
        $wpdb->replace(
            $settings_table,
            array(
                'setting_key' => $key,
                'setting_value' => $value,
            ),
            array('%s', '%s')
        );
    }
}

// Create tables on theme activation
add_action('after_switch_theme', 'tweetscheduler_create_tables');

/**
 * Include Required Files
 */
require_once TWEETSCHEDULER_THEME_DIR . '/includes/api-endpoints.php';
require_once TWEETSCHEDULER_THEME_DIR . '/includes/admin-functions.php';
require_once TWEETSCHEDULER_THEME_DIR . '/includes/tweet-scheduler.php';
require_once TWEETSCHEDULER_THEME_DIR . '/includes/subscription-manager.php';
require_once TWEETSCHEDULER_THEME_DIR . '/includes/payment-gateways.php';
require_once TWEETSCHEDULER_THEME_DIR . '/includes/file-processor.php';
require_once TWEETSCHEDULER_THEME_DIR . '/includes/auth-handler.php';
require_once TWEETSCHEDULER_THEME_DIR . '/admin-dashboard.php';

/**
 * Custom User Roles
 */
function tweetscheduler_add_user_roles() {
    add_role('tweetscheduler_user', 'TweetScheduler User', array(
        'read' => true,
        'upload_files' => true,
    ));
    
    add_role('tweetscheduler_admin', 'TweetScheduler Admin', array(
        'read' => true,
        'upload_files' => true,
        'manage_tweetscheduler' => true,
        'view_analytics' => true,
        'manage_users' => true,
    ));
}
add_action('init', 'tweetscheduler_add_user_roles');

/**
 * CORS Headers for API
 */
function tweetscheduler_add_cors_headers() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
}
add_action('rest_api_init', 'tweetscheduler_add_cors_headers');

/**
 * Custom Login Redirect
 */
function tweetscheduler_login_redirect($redirect_to, $request, $user) {
    if (isset($user->roles) && is_array($user->roles)) {
        if (in_array('tweetscheduler_admin', $user->roles)) {
            return admin_url('admin.php?page=tweetscheduler-dashboard');
        } else {
            return home_url('/dashboard');
        }
    }
    return $redirect_to;
}
add_filter('login_redirect', 'tweetscheduler_login_redirect', 10, 3);

/**
 * Disable WordPress Admin Bar for Regular Users
 */
function tweetscheduler_disable_admin_bar() {
    if (!current_user_can('manage_tweetscheduler') && !is_admin()) {
        show_admin_bar(false);
    }
}
add_action('after_setup_theme', 'tweetscheduler_disable_admin_bar');

/**
 * Custom Body Classes
 */
function tweetscheduler_body_classes($classes) {
    if (is_rtl()) {
        $classes[] = 'rtl-enabled';
    }
    
    if (is_user_logged_in()) {
        $user = wp_get_current_user();
        $classes[] = 'user-logged-in';
        $classes[] = 'user-role-' . implode('-', $user->roles);
    }
    
    return $classes;
}
add_filter('body_class', 'tweetscheduler_body_classes');

/**
 * Cron Job for Tweet Scheduling
 */
function tweetscheduler_schedule_cron() {
    if (!wp_next_scheduled('tweetscheduler_process_tweets')) {
        wp_schedule_event(time(), 'every_minute', 'tweetscheduler_process_tweets');
    }
}
add_action('wp', 'tweetscheduler_schedule_cron');

// Add custom cron interval
function tweetscheduler_cron_intervals($schedules) {
    $schedules['every_minute'] = array(
        'interval' => 60,
        'display' => __('Every Minute', 'tweetscheduler')
    );
    return $schedules;
}
add_filter('cron_schedules', 'tweetscheduler_cron_intervals');

/**
 * Security Enhancements
 */
// Limit login attempts
function tweetscheduler_limit_login_attempts() {
    $ip = $_SERVER['REMOTE_ADDR'];
    $attempts = get_transient('login_attempts_' . $ip);
    
    if ($attempts && $attempts >= 5) {
        wp_die(__('Too many login attempts. Please try again in 15 minutes.', 'tweetscheduler'));
    }
}
add_action('wp_login_failed', 'tweetscheduler_limit_login_attempts');

// Track failed login attempts
function tweetscheduler_track_failed_login($username) {
    $ip = $_SERVER['REMOTE_ADDR'];
    $attempts = get_transient('login_attempts_' . $ip) ?: 0;
    $attempts++;
    set_transient('login_attempts_' . $ip, $attempts, 15 * MINUTE_IN_SECONDS);
}
add_action('wp_login_failed', 'tweetscheduler_track_failed_login');

// Clear attempts on successful login
function tweetscheduler_clear_login_attempts($user_login, $user) {
    $ip = $_SERVER['REMOTE_ADDR'];
    delete_transient('login_attempts_' . $ip);
}
add_action('wp_login', 'tweetscheduler_clear_login_attempts', 10, 2);

/**
 * File Upload Security
 */
function tweetscheduler_check_file_type($file) {
    $allowed_types = array('xlsx', 'xls', 'csv');
    $file_type = wp_check_filetype($file['name']);
    
    if (!in_array($file_type['ext'], $allowed_types)) {
        $file['error'] = __('Only Excel (.xlsx, .xls) and CSV files are allowed.', 'tweetscheduler');
    }
    
    // Check file size (5MB max)
    if ($file['size'] > 5 * 1024 * 1024) {
        $file['error'] = __('File size must be less than 5MB.', 'tweetscheduler');
    }
    
    return $file;
}
add_filter('wp_handle_upload_prefilter', 'tweetscheduler_check_file_type');

/**
 * Utility Functions
 */
function tweetscheduler_get_setting($key, $default = '') {
    global $wpdb;
    $settings_table = $wpdb->prefix . 'tweetscheduler_settings';
    
    $value = $wpdb->get_var($wpdb->prepare(
        "SELECT setting_value FROM $settings_table WHERE setting_key = %s",
        $key
    ));
    
    return $value !== null ? $value : $default;
}

function tweetscheduler_update_setting($key, $value) {
    global $wpdb;
    $settings_table = $wpdb->prefix . 'tweetscheduler_settings';
    
    return $wpdb->replace(
        $settings_table,
        array(
            'setting_key' => $key,
            'setting_value' => $value,
        ),
        array('%s', '%s')
    );
}

function tweetscheduler_log_analytics($user_id, $event_type, $event_data = null) {
    global $wpdb;
    $analytics_table = $wpdb->prefix . 'tweetscheduler_analytics';
    
    return $wpdb->insert(
        $analytics_table,
        array(
            'user_id' => $user_id,
            'event_type' => $event_type,
            'event_data' => is_array($event_data) ? json_encode($event_data) : $event_data,
            'ip_address' => $_SERVER['REMOTE_ADDR'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT'],
        ),
        array('%d', '%s', '%s', '%s', '%s')
    );
}

/**
 * Get Subscription Plans
 */
function tweetscheduler_get_subscription_plans() {
    return array(
        'trial' => array(
            'name' => __('Trial', 'tweetscheduler'),
            'price' => 0,
            'currency' => 'SAR',
            'duration' => 3,
            'duration_unit' => 'days',
            'tweet_limit' => 7,
            'features' => array(
                __('7 scheduled tweets', 'tweetscheduler'),
                __('Basic scheduling', 'tweetscheduler'),
                __('Email support', 'tweetscheduler'),
            ),
        ),
        'starter' => array(
            'name' => __('Starter', 'tweetscheduler'),
            'price' => 19,
            'currency' => 'SAR',
            'duration' => 1,
            'duration_unit' => 'month',
            'tweet_limit' => 30,
            'features' => array(
                __('30 scheduled tweets per month', 'tweetscheduler'),
                __('Advanced scheduling', 'tweetscheduler'),
                __('Email support', 'tweetscheduler'),
                __('Analytics dashboard', 'tweetscheduler'),
            ),
        ),
        'pro' => array(
            'name' => __('Pro', 'tweetscheduler'),
            'price' => 39,
            'currency' => 'SAR',
            'duration' => 1,
            'duration_unit' => 'month',
            'tweet_limit' => 120,
            'features' => array(
                __('120 scheduled tweets per month', 'tweetscheduler'),
                __('Multi-platform support (coming soon)', 'tweetscheduler'),
                __('Priority email support', 'tweetscheduler'),
                __('Advanced analytics', 'tweetscheduler'),
                __('Custom scheduling', 'tweetscheduler'),
            ),
        ),
        'enterprise' => array(
            'name' => __('Enterprise', 'tweetscheduler'),
            'price' => 99,
            'currency' => 'SAR',
            'duration' => 1,
            'duration_unit' => 'month',
            'tweet_limit' => -1, // Unlimited
            'features' => array(
                __('Unlimited scheduled tweets', 'tweetscheduler'),
                __('Multi-platform support', 'tweetscheduler'),
                __('Priority support', 'tweetscheduler'),
                __('Team management', 'tweetscheduler'),
                __('Sub-accounts', 'tweetscheduler'),
                __('Custom integrations', 'tweetscheduler'),
            ),
        ),
    );
}

/**
 * Get Payment Methods
 */
function tweetscheduler_get_payment_methods() {
    return array(
        'stc_pay' => array(
            'name' => __('STC Pay', 'tweetscheduler'),
            'enabled' => tweetscheduler_get_setting('enable_stc_pay', 'yes') === 'yes',
            'icon' => 'stc-pay.svg',
        ),
        'mada' => array(
            'name' => __('Mada', 'tweetscheduler'),
            'enabled' => tweetscheduler_get_setting('enable_mada', 'yes') === 'yes',
            'icon' => 'mada.svg',
        ),
        'apple_pay' => array(
            'name' => __('Apple Pay', 'tweetscheduler'),
            'enabled' => tweetscheduler_get_setting('enable_apple_pay', 'yes') === 'yes',
            'icon' => 'apple-pay.svg',
        ),
        'visa' => array(
            'name' => __('Visa', 'tweetscheduler'),
            'enabled' => true,
            'icon' => 'visa.svg',
        ),
        'mastercard' => array(
            'name' => __('Mastercard', 'tweetscheduler'),
            'enabled' => true,
            'icon' => 'mastercard.svg',
        ),
        'tabby' => array(
            'name' => __('Tabby', 'tweetscheduler'),
            'enabled' => tweetscheduler_get_setting('enable_tabby', 'no') === 'yes',
            'icon' => 'tabby.svg',
        ),
        'tamara' => array(
            'name' => __('Tamara', 'tweetscheduler'),
            'enabled' => tweetscheduler_get_setting('enable_tamara', 'no') === 'yes',
            'icon' => 'tamara.svg',
        ),
    );
}

/**
 * Theme Customization
 */
function tweetscheduler_customize_register($wp_customize) {
    // Colors
    $wp_customize->add_section('tweetscheduler_colors', array(
        'title' => __('TweetScheduler Colors', 'tweetscheduler'),
        'priority' => 30,
    ));
    
    $wp_customize->add_setting('primary_color', array(
        'default' => '#1DA1F2',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'primary_color', array(
        'label' => __('Primary Color', 'tweetscheduler'),
        'section' => 'tweetscheduler_colors',
    )));
    
    $wp_customize->add_setting('accent_color', array(
        'default' => '#14B8A6',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'accent_color', array(
        'label' => __('Accent Color', 'tweetscheduler'),
        'section' => 'tweetscheduler_colors',
    )));
}
add_action('customize_register', 'tweetscheduler_customize_register');

/**
 * Generate Custom CSS
 */
function tweetscheduler_custom_css() {
    $primary_color = get_theme_mod('primary_color', '#1DA1F2');
    $accent_color = get_theme_mod('accent_color', '#14B8A6');
    
    echo "<style type='text/css'>
        :root {
            --primary-color: {$primary_color};
            --accent-color: {$accent_color};
        }
        .btn-primary { background-color: {$primary_color}; }
        .btn-accent { background-color: {$accent_color}; }
        .text-primary { color: {$primary_color}; }
        .text-accent { color: {$accent_color}; }
        .border-primary { border-color: {$primary_color}; }
        .border-accent { border-color: {$accent_color}; }
    </style>";
}
add_action('wp_head', 'tweetscheduler_custom_css');