<?php
/**
 * Subscription Manager
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Subscription Plans Configuration
 */
function tweetscheduler_get_subscription_plans() {
    return array(
        'trial' => array(
            'name' => __('Trial', 'tweetscheduler'),
            'price' => 0,
            'currency' => 'SAR',
            'duration' => 3, // days
            'duration_unit' => 'days',
            'tweet_limit' => 7,
            'features' => array(
                __('Basic scheduling', 'tweetscheduler'),
                __('Email support', 'tweetscheduler'),
                __('3-day trial', 'tweetscheduler'),
            ),
            'popular' => false,
        ),
        'starter' => array(
            'name' => __('Starter', 'tweetscheduler'),
            'price' => 19,
            'currency' => 'SAR',
            'duration' => 1, // month
            'duration_unit' => 'month',
            'tweet_limit' => 30,
            'features' => array(
                __('30 tweets per month', 'tweetscheduler'),
                __('Basic scheduling', 'tweetscheduler'),
                __('Email support', 'tweetscheduler'),
                __('Analytics dashboard', 'tweetscheduler'),
            ),
            'popular' => false,
        ),
        'pro' => array(
            'name' => __('Pro', 'tweetscheduler'),
            'price' => 39,
            'currency' => 'SAR',
            'duration' => 1, // month
            'duration_unit' => 'month',
            'tweet_limit' => 120,
            'features' => array(
                __('120 tweets per month', 'tweetscheduler'),
                __('Advanced scheduling', 'tweetscheduler'),
                __('Priority support', 'tweetscheduler'),
                __('Advanced analytics', 'tweetscheduler'),
                __('Multi-platform support (coming soon)', 'tweetscheduler'),
            ),
            'popular' => true,
        ),
        'enterprise' => array(
            'name' => __('Enterprise', 'tweetscheduler'),
            'price' => 99,
            'currency' => 'SAR',
            'duration' => 1, // month
            'duration_unit' => 'month',
            'tweet_limit' => -1, // unlimited
            'features' => array(
                __('Unlimited tweets', 'tweetscheduler'),
                __('Priority support', 'tweetscheduler'),
                __('Advanced analytics', 'tweetscheduler'),
                __('Teams/sub-accounts', 'tweetscheduler'),
                __('Custom integrations', 'tweetscheduler'),
                __('Dedicated account manager', 'tweetscheduler'),
            ),
            'popular' => false,
        ),
    );
}

/**
 * Create Subscription
 */
function tweetscheduler_create_subscription($user_id, $plan_type, $payment_id = null) {
    global $wpdb;
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    
    $plans = tweetscheduler_get_subscription_plans();
    
    if (!isset($plans[$plan_type])) {
        return new WP_Error('invalid_plan', 'Invalid subscription plan.');
    }
    
    $plan = $plans[$plan_type];
    
    // Calculate end date
    $end_date = null;
    if ($plan['duration_unit'] === 'days') {
        $end_date = date('Y-m-d H:i:s', strtotime("+{$plan['duration']} days"));
    } elseif ($plan['duration_unit'] === 'month') {
        $end_date = date('Y-m-d H:i:s', strtotime("+{$plan['duration']} month"));
    }
    
    // Check if user already has a subscription
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $subscriptions_table WHERE user_id = %d",
        $user_id
    ));
    
    if ($existing) {
        // Update existing subscription
        $result = $wpdb->update(
            $subscriptions_table,
            array(
                'plan_type' => $plan_type,
                'status' => 'active',
                'tweets_used' => 0, // Reset usage
                'tweets_limit' => $plan['tweet_limit'],
                'start_date' => current_time('mysql'),
                'end_date' => $end_date,
                'payment_id' => $payment_id,
            ),
            array('user_id' => $user_id),
            array('%s', '%s', '%d', '%d', '%s', '%s', '%s'),
            array('%d')
        );
    } else {
        // Create new subscription
        $result = $wpdb->insert(
            $subscriptions_table,
            array(
                'user_id' => $user_id,
                'plan_type' => $plan_type,
                'status' => 'active',
                'tweets_used' => 0,
                'tweets_limit' => $plan['tweet_limit'],
                'start_date' => current_time('mysql'),
                'end_date' => $end_date,
                'payment_id' => $payment_id,
            ),
            array('%d', '%s', '%s', '%d', '%d', '%s', '%s', '%s')
        );
    }
    
    if ($result !== false) {
        // Log analytics
        tweetscheduler_log_analytics($user_id, 'subscription_created', array(
            'plan_type' => $plan_type,
            'payment_id' => $payment_id,
        ));
        
        // Send welcome email
        tweetscheduler_send_subscription_email($user_id, 'welcome', $plan_type);
        
        return true;
    }
    
    return false;
}

/**
 * Cancel Subscription
 */
function tweetscheduler_cancel_subscription($user_id, $reason = '') {
    global $wpdb;
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    
    $result = $wpdb->update(
        $subscriptions_table,
        array('status' => 'cancelled'),
        array('user_id' => $user_id),
        array('%s'),
        array('%d')
    );
    
    if ($result !== false) {
        // Log analytics
        tweetscheduler_log_analytics($user_id, 'subscription_cancelled', array(
            'reason' => $reason,
        ));
        
        // Send cancellation email
        tweetscheduler_send_subscription_email($user_id, 'cancelled');
        
        return true;
    }
    
    return false;
}

/**
 * Upgrade/Downgrade Subscription
 */
function tweetscheduler_change_subscription($user_id, $new_plan_type, $payment_id = null) {
    $current_subscription = tweetscheduler_get_user_subscription($user_id);
    
    if (!$current_subscription) {
        return tweetscheduler_create_subscription($user_id, $new_plan_type, $payment_id);
    }
    
    $old_plan = $current_subscription['plan_type'];
    $result = tweetscheduler_create_subscription($user_id, $new_plan_type, $payment_id);
    
    if ($result) {
        // Log analytics
        tweetscheduler_log_analytics($user_id, 'subscription_changed', array(
            'old_plan' => $old_plan,
            'new_plan' => $new_plan_type,
            'payment_id' => $payment_id,
        ));
        
        // Send change email
        tweetscheduler_send_subscription_email($user_id, 'changed', $new_plan_type, $old_plan);
    }
    
    return $result;
}

/**
 * Check if User Can Schedule Tweet
 */
function tweetscheduler_can_schedule_tweet($user_id) {
    $subscription = tweetscheduler_get_user_subscription($user_id);
    
    if (!$subscription) {
        return array(
            'can_schedule' => false,
            'reason' => 'no_subscription',
            'message' => __('No active subscription found.', 'tweetscheduler'),
        );
    }
    
    if ($subscription['status'] !== 'active') {
        return array(
            'can_schedule' => false,
            'reason' => 'inactive_subscription',
            'message' => __('Your subscription is not active.', 'tweetscheduler'),
        );
    }
    
    // Check if subscription has expired
    if ($subscription['end_date'] && strtotime($subscription['end_date']) < time()) {
        return array(
            'can_schedule' => false,
            'reason' => 'expired_subscription',
            'message' => __('Your subscription has expired.', 'tweetscheduler'),
        );
    }
    
    // Check tweet limit
    if ($subscription['tweets_limit'] !== -1 && $subscription['tweets_used'] >= $subscription['tweets_limit']) {
        return array(
            'can_schedule' => false,
            'reason' => 'limit_exceeded',
            'message' => __('You have reached your tweet limit for this billing period.', 'tweetscheduler'),
        );
    }
    
    return array(
        'can_schedule' => true,
        'remaining_tweets' => $subscription['tweets_limit'] === -1 ? -1 : ($subscription['tweets_limit'] - $subscription['tweets_used']),
        'subscription' => $subscription,
    );
}

/**
 * Get Subscription Usage Stats
 */
function tweetscheduler_get_usage_stats($user_id) {
    $subscription = tweetscheduler_get_user_subscription($user_id);
    
    if (!$subscription) {
        return null;
    }
    
    $plans = tweetscheduler_get_subscription_plans();
    $plan = isset($plans[$subscription['plan_type']]) ? $plans[$subscription['plan_type']] : null;
    
    $stats = array(
        'plan_name' => $plan ? $plan['name'] : $subscription['plan_type'],
        'tweets_used' => intval($subscription['tweets_used']),
        'tweets_limit' => intval($subscription['tweets_limit']),
        'usage_percentage' => 0,
        'status' => $subscription['status'],
        'start_date' => $subscription['start_date'],
        'end_date' => $subscription['end_date'],
        'days_remaining' => null,
    );
    
    // Calculate usage percentage
    if ($stats['tweets_limit'] > 0) {
        $stats['usage_percentage'] = min(100, round(($stats['tweets_used'] / $stats['tweets_limit']) * 100));
    }
    
    // Calculate days remaining
    if ($subscription['end_date']) {
        $end_timestamp = strtotime($subscription['end_date']);
        $now_timestamp = time();
        if ($end_timestamp > $now_timestamp) {
            $stats['days_remaining'] = ceil(($end_timestamp - $now_timestamp) / (24 * 60 * 60));
        } else {
            $stats['days_remaining'] = 0;
        }
    }
    
    return $stats;
}

/**
 * Send Subscription Emails
 */
function tweetscheduler_send_subscription_email($user_id, $type, $new_plan = null, $old_plan = null) {
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return false;
    }
    
    $site_name = get_bloginfo('name');
    $plans = tweetscheduler_get_subscription_plans();
    
    $subject = '';
    $message = '';
    
    switch ($type) {
        case 'welcome':
            $plan_name = isset($plans[$new_plan]) ? $plans[$new_plan]['name'] : $new_plan;
            $subject = sprintf(__('Welcome to %s - %s Plan Activated', 'tweetscheduler'), $site_name, $plan_name);
            $message = sprintf(__("Welcome to %s!\n\nYour %s subscription has been activated successfully.\n\nYou can now start scheduling your tweets and growing your social media presence.\n\nLogin to your dashboard: %s\n\nIf you have any questions, feel free to contact our support team.\n\nThank you for choosing %s!", 'tweetscheduler'), 
                $site_name, 
                $plan_name, 
                home_url('/dashboard'), 
                $site_name
            );
            break;
            
        case 'cancelled':
            $subject = sprintf(__('Subscription Cancelled - %s', 'tweetscheduler'), $site_name);
            $message = sprintf(__("We're sorry to see you go!\n\nYour subscription has been cancelled successfully. You can continue using your current plan until the end of your billing period.\n\nIf you change your mind, you can reactivate your subscription anytime from your dashboard: %s\n\nWe'd love to hear your feedback on how we can improve our service.\n\nThank you for using %s!", 'tweetscheduler'), 
                home_url('/subscription'), 
                $site_name
            );
            break;
            
        case 'changed':
            $old_plan_name = isset($plans[$old_plan]) ? $plans[$old_plan]['name'] : $old_plan;
            $new_plan_name = isset($plans[$new_plan]) ? $plans[$new_plan]['name'] : $new_plan;
            $subject = sprintf(__('Subscription Updated - %s', 'tweetscheduler'), $site_name);
            $message = sprintf(__("Your subscription has been updated!\n\nChanged from: %s\nChanged to: %s\n\nYour new plan is now active and you can enjoy the updated features.\n\nView your dashboard: %s\n\nThank you for staying with %s!", 'tweetscheduler'), 
                $old_plan_name, 
                $new_plan_name, 
                home_url('/dashboard'), 
                $site_name
            );
            break;
    }
    
    if (!empty($subject) && !empty($message)) {
        return wp_mail($user->user_email, $subject, $message);
    }
    
    return false;
}

/**
 * Generate Invoice
 */
function tweetscheduler_generate_invoice($user_id, $plan_type, $payment_id, $amount) {
    $user = get_user_by('ID', $user_id);
    $plans = tweetscheduler_get_subscription_plans();
    $plan = isset($plans[$plan_type]) ? $plans[$plan_type] : null;
    
    if (!$user || !$plan) {
        return false;
    }
    
    $invoice_data = array(
        'invoice_id' => 'INV-' . strtoupper(wp_generate_password(8, false)),
        'user_id' => $user_id,
        'user_name' => $user->display_name,
        'user_email' => $user->user_email,
        'plan_name' => $plan['name'],
        'plan_type' => $plan_type,
        'amount' => $amount,
        'currency' => $plan['currency'],
        'payment_id' => $payment_id,
        'date' => current_time('mysql'),
        'status' => 'paid',
    );
    
    // Store invoice in database
    global $wpdb;
    $invoices_table = $wpdb->prefix . 'tweetscheduler_invoices';
    
    // Create invoices table if it doesn't exist
    $wpdb->query("CREATE TABLE IF NOT EXISTS $invoices_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        invoice_id varchar(50) NOT NULL,
        user_id bigint(20) NOT NULL,
        plan_type varchar(20) NOT NULL,
        amount decimal(10,2) NOT NULL,
        currency varchar(3) NOT NULL,
        payment_id varchar(100) DEFAULT NULL,
        status varchar(20) DEFAULT 'pending',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY invoice_id (invoice_id),
        KEY user_id (user_id)
    ) {$wpdb->get_charset_collate()};");
    
    $result = $wpdb->insert(
        $invoices_table,
        array(
            'invoice_id' => $invoice_data['invoice_id'],
            'user_id' => $user_id,
            'plan_type' => $plan_type,
            'amount' => $amount,
            'currency' => $plan['currency'],
            'payment_id' => $payment_id,
            'status' => 'paid',
        ),
        array('%s', '%d', '%s', '%f', '%s', '%s', '%s')
    );
    
    if ($result) {
        // Send invoice email
        tweetscheduler_send_invoice_email($user_id, $invoice_data);
        return $invoice_data;
    }
    
    return false;
}

/**
 * Send Invoice Email
 */
function tweetscheduler_send_invoice_email($user_id, $invoice_data) {
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return false;
    }
    
    $site_name = get_bloginfo('name');
    $subject = sprintf(__('Invoice %s - %s', 'tweetscheduler'), $invoice_data['invoice_id'], $site_name);
    
    $message = sprintf(__("Thank you for your payment!\n\nInvoice Details:\n- Invoice ID: %s\n- Plan: %s\n- Amount: %s %s\n- Date: %s\n- Payment ID: %s\n\nYour subscription is now active and you can start using all the features.\n\nDashboard: %s\n\nThank you for choosing %s!", 'tweetscheduler'),
        $invoice_data['invoice_id'],
        $invoice_data['plan_name'],
        $invoice_data['amount'],
        $invoice_data['currency'],
        date('Y-m-d H:i:s'),
        $invoice_data['payment_id'],
        home_url('/dashboard'),
        $site_name
    );
    
    return wp_mail($user->user_email, $subject, $message);
}

/**
 * Get User Invoices
 */
function tweetscheduler_get_user_invoices($user_id, $limit = 10) {
    global $wpdb;
    $invoices_table = $wpdb->prefix . 'tweetscheduler_invoices';
    
    return $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $invoices_table 
         WHERE user_id = %d 
         ORDER BY created_at DESC 
         LIMIT %d",
        $user_id,
        $limit
    ), ARRAY_A);
}

/**
 * Subscription Renewal Reminder
 */
function tweetscheduler_send_renewal_reminders() {
    global $wpdb;
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    
    // Get subscriptions expiring in 3 days
    $expiring_soon = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $subscriptions_table 
         WHERE status = 'active' 
         AND end_date IS NOT NULL 
         AND end_date BETWEEN %s AND %s",
        date('Y-m-d H:i:s', strtotime('+2 days')),
        date('Y-m-d H:i:s', strtotime('+4 days'))
    ));
    
    foreach ($expiring_soon as $subscription) {
        $user = get_user_by('ID', $subscription->user_id);
        if (!$user) continue;
        
        $days_left = ceil((strtotime($subscription->end_date) - time()) / (24 * 60 * 60));
        $site_name = get_bloginfo('name');
        
        $subject = sprintf(__('Subscription Expiring Soon - %s', 'tweetscheduler'), $site_name);
        $message = sprintf(__("Your %s subscription will expire in %d days.\n\nTo continue enjoying uninterrupted service, please renew your subscription:\n%s\n\nIf you have any questions, please contact our support team.\n\nThank you for using %s!", 'tweetscheduler'),
            $site_name,
            $days_left,
            home_url('/subscription'),
            $site_name
        );
        
        wp_mail($user->user_email, $subject, $message);
        
        // Log reminder sent
        tweetscheduler_log_analytics($subscription->user_id, 'renewal_reminder_sent', array(
            'days_left' => $days_left,
        ));
    }
}

// Schedule daily renewal reminders
if (!wp_next_scheduled('tweetscheduler_renewal_reminders')) {
    wp_schedule_event(time(), 'daily', 'tweetscheduler_renewal_reminders');
}
add_action('tweetscheduler_renewal_reminders', 'tweetscheduler_send_renewal_reminders');