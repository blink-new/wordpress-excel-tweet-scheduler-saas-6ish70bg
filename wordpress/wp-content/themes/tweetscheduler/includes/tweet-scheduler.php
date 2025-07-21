<?php
/**
 * Tweet Scheduler Engine
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Process Scheduled Tweets (Cron Job)
 */
function tweetscheduler_process_scheduled_tweets() {
    global $wpdb;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    
    // Get tweets that are ready to be posted
    $ready_tweets = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $tweets_table 
         WHERE status = 'scheduled' 
         AND scheduled_time <= %s 
         ORDER BY scheduled_time ASC 
         LIMIT 10",
        current_time('mysql')
    ));
    
    foreach ($ready_tweets as $tweet) {
        tweetscheduler_post_tweet($tweet);
    }
}
add_action('tweetscheduler_process_tweets', 'tweetscheduler_process_scheduled_tweets');

/**
 * Post Tweet to Twitter
 */
function tweetscheduler_post_tweet($tweet) {
    global $wpdb;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    
    // Update status to processing
    $wpdb->update(
        $tweets_table,
        array('status' => 'processing'),
        array('id' => $tweet->id),
        array('%s'),
        array('%d')
    );
    
    try {
        // Get Twitter API credentials
        $api_key = tweetscheduler_get_setting('twitter_api_key');
        $api_secret = tweetscheduler_get_setting('twitter_api_secret');
        $access_token = tweetscheduler_get_setting('twitter_access_token');
        $access_token_secret = tweetscheduler_get_setting('twitter_access_token_secret');
        
        if (empty($api_key) || empty($api_secret) || empty($access_token) || empty($access_token_secret)) {
            throw new Exception('Twitter API credentials not configured');
        }
        
        // Initialize Twitter API client
        $twitter_client = new TweetScheduler_Twitter_Client(
            $api_key,
            $api_secret,
            $access_token,
            $access_token_secret
        );
        
        // Prepare tweet data
        $tweet_data = array(
            'text' => $tweet->content,
        );
        
        // Add media if present
        if (!empty($tweet->media_urls)) {
            $media_urls = json_decode($tweet->media_urls, true);
            if (is_array($media_urls) && !empty($media_urls)) {
                $media_ids = array();
                foreach ($media_urls as $media_url) {
                    $media_id = $twitter_client->upload_media($media_url);
                    if ($media_id) {
                        $media_ids[] = $media_id;
                    }
                }
                if (!empty($media_ids)) {
                    $tweet_data['media'] = array('media_ids' => $media_ids);
                }
            }
        }
        
        // Post tweet
        $response = $twitter_client->post_tweet($tweet_data);
        
        if ($response && isset($response['data']['id'])) {
            // Success
            $wpdb->update(
                $tweets_table,
                array(
                    'status' => 'posted',
                    'twitter_id' => $response['data']['id'],
                ),
                array('id' => $tweet->id),
                array('%s', '%s'),
                array('%d')
            );
            
            // Log analytics
            tweetscheduler_log_analytics($tweet->user_id, 'tweet_posted', array(
                'tweet_id' => $tweet->id,
                'twitter_id' => $response['data']['id'],
            ));
            
            // Send success notification
            tweetscheduler_send_notification($tweet->user_id, 'tweet_posted', array(
                'content' => substr($tweet->content, 0, 50) . '...',
                'twitter_url' => "https://twitter.com/user/status/{$response['data']['id']}",
            ));
            
        } else {
            throw new Exception('Failed to post tweet: ' . json_encode($response));
        }
        
    } catch (Exception $e) {
        // Error occurred
        $wpdb->update(
            $tweets_table,
            array(
                'status' => 'failed',
            ),
            array('id' => $tweet->id),
            array('%s'),
            array('%d')
        );
        
        // Log error
        error_log("TweetScheduler Error: " . $e->getMessage());
        
        // Log analytics
        tweetscheduler_log_analytics($tweet->user_id, 'tweet_failed', array(
            'tweet_id' => $tweet->id,
            'error' => $e->getMessage(),
        ));
        
        // Send error notification
        tweetscheduler_send_notification($tweet->user_id, 'tweet_failed', array(
            'content' => substr($tweet->content, 0, 50) . '...',
            'error' => $e->getMessage(),
        ));
    }
}

/**
 * Twitter API Client Class
 */
class TweetScheduler_Twitter_Client {
    private $api_key;
    private $api_secret;
    private $access_token;
    private $access_token_secret;
    private $base_url = 'https://api.twitter.com/2/';
    
    public function __construct($api_key, $api_secret, $access_token, $access_token_secret) {
        $this->api_key = $api_key;
        $this->api_secret = $api_secret;
        $this->access_token = $access_token;
        $this->access_token_secret = $access_token_secret;
    }
    
    /**
     * Post Tweet
     */
    public function post_tweet($tweet_data) {
        $url = $this->base_url . 'tweets';
        return $this->make_request('POST', $url, $tweet_data);
    }
    
    /**
     * Upload Media
     */
    public function upload_media($media_url) {
        // Download media file
        $media_data = wp_remote_get($media_url);
        if (is_wp_error($media_data)) {
            return false;
        }
        
        $media_content = wp_remote_retrieve_body($media_data);
        $media_type = wp_remote_retrieve_header($media_data, 'content-type');
        
        // Upload to Twitter
        $upload_url = 'https://upload.twitter.com/1.1/media/upload.json';
        $upload_data = array(
            'media_data' => base64_encode($media_content),
            'media_category' => 'tweet_image',
        );
        
        $response = $this->make_request('POST', $upload_url, $upload_data);
        
        return isset($response['media_id_string']) ? $response['media_id_string'] : false;
    }
    
    /**
     * Make API Request
     */
    private function make_request($method, $url, $data = array()) {
        $oauth_params = array(
            'oauth_consumer_key' => $this->api_key,
            'oauth_token' => $this->access_token,
            'oauth_signature_method' => 'HMAC-SHA1',
            'oauth_timestamp' => time(),
            'oauth_nonce' => wp_generate_password(32, false),
            'oauth_version' => '1.0',
        );
        
        // Create signature
        $signature_params = array_merge($oauth_params, $data);
        ksort($signature_params);
        
        $signature_string = $method . '&' . rawurlencode($url) . '&' . rawurlencode(http_build_query($signature_params));
        $signing_key = rawurlencode($this->api_secret) . '&' . rawurlencode($this->access_token_secret);
        $oauth_params['oauth_signature'] = base64_encode(hash_hmac('sha1', $signature_string, $signing_key, true));
        
        // Build authorization header
        $auth_header = 'OAuth ';
        $auth_parts = array();
        foreach ($oauth_params as $key => $value) {
            $auth_parts[] = $key . '="' . rawurlencode($value) . '"';
        }
        $auth_header .= implode(', ', $auth_parts);
        
        // Make request
        $args = array(
            'method' => $method,
            'headers' => array(
                'Authorization' => $auth_header,
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        );
        
        if ($method === 'POST' && !empty($data)) {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            throw new Exception('HTTP Error: ' . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);
        
        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code >= 400) {
            $error_message = isset($decoded['detail']) ? $decoded['detail'] : 'Unknown error';
            throw new Exception("Twitter API Error ($status_code): $error_message");
        }
        
        return $decoded;
    }
}

/**
 * Send Notifications
 */
function tweetscheduler_send_notification($user_id, $type, $data = array()) {
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return false;
    }
    
    $subject = '';
    $message = '';
    
    switch ($type) {
        case 'tweet_posted':
            $subject = 'Tweet Posted Successfully';
            $message = "Your tweet has been posted successfully!\n\n";
            $message .= "Content: {$data['content']}\n";
            $message .= "View on Twitter: {$data['twitter_url']}\n\n";
            $message .= "Thank you for using TweetScheduler Pro!";
            break;
            
        case 'tweet_failed':
            $subject = 'Tweet Failed to Post';
            $message = "We encountered an issue posting your tweet.\n\n";
            $message .= "Content: {$data['content']}\n";
            $message .= "Error: {$data['error']}\n\n";
            $message .= "Please check your Twitter API settings or contact support.";
            break;
            
        case 'subscription_expired':
            $subject = 'Subscription Expired';
            $message = "Your TweetScheduler Pro subscription has expired.\n\n";
            $message .= "To continue scheduling tweets, please renew your subscription.\n\n";
            $message .= "Renew now: " . home_url('/subscription');
            break;
            
        case 'trial_ending':
            $subject = 'Trial Ending Soon';
            $message = "Your free trial will end in {$data['days_left']} days.\n\n";
            $message .= "Upgrade to continue scheduling tweets without interruption.\n\n";
            $message .= "Choose a plan: " . home_url('/subscription');
            break;
    }
    
    if (!empty($subject) && !empty($message)) {
        wp_mail($user->user_email, $subject, $message);
    }
}

/**
 * Check Subscription Status (Daily Cron)
 */
function tweetscheduler_check_subscriptions() {
    global $wpdb;
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    
    // Get expiring subscriptions
    $expiring_subscriptions = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $subscriptions_table 
         WHERE status = 'active' 
         AND end_date IS NOT NULL 
         AND end_date <= %s",
        date('Y-m-d H:i:s', strtotime('+1 day'))
    ));
    
    foreach ($expiring_subscriptions as $subscription) {
        $days_left = ceil((strtotime($subscription->end_date) - time()) / (24 * 60 * 60));
        
        if ($days_left <= 0) {
            // Expire subscription
            $wpdb->update(
                $subscriptions_table,
                array('status' => 'expired'),
                array('id' => $subscription->id),
                array('%s'),
                array('%d')
            );
            
            tweetscheduler_send_notification($subscription->user_id, 'subscription_expired');
            
        } elseif ($days_left <= 3) {
            // Send warning
            tweetscheduler_send_notification($subscription->user_id, 'trial_ending', array(
                'days_left' => $days_left,
            ));
        }
    }
}

// Schedule daily subscription check
if (!wp_next_scheduled('tweetscheduler_check_subscriptions')) {
    wp_schedule_event(time(), 'daily', 'tweetscheduler_check_subscriptions');
}
add_action('tweetscheduler_check_subscriptions', 'tweetscheduler_check_subscriptions');

/**
 * Retry Failed Tweets
 */
function tweetscheduler_retry_failed_tweets() {
    global $wpdb;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    
    // Get failed tweets from the last 24 hours
    $failed_tweets = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $tweets_table 
         WHERE status = 'failed' 
         AND updated_at >= %s 
         ORDER BY updated_at ASC 
         LIMIT 5",
        date('Y-m-d H:i:s', strtotime('-24 hours'))
    ));
    
    foreach ($failed_tweets as $tweet) {
        // Reset status to scheduled for retry
        $wpdb->update(
            $tweets_table,
            array('status' => 'scheduled'),
            array('id' => $tweet->id),
            array('%s'),
            array('%d')
        );
        
        // Process immediately
        tweetscheduler_post_tweet($tweet);
    }
}

// Schedule hourly retry
if (!wp_next_scheduled('tweetscheduler_retry_failed')) {
    wp_schedule_event(time(), 'hourly', 'tweetscheduler_retry_failed');
}
add_action('tweetscheduler_retry_failed', 'tweetscheduler_retry_failed_tweets');

/**
 * Clean Old Data
 */
function tweetscheduler_cleanup_old_data() {
    global $wpdb;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    $analytics_table = $wpdb->prefix . 'tweetscheduler_analytics';
    
    // Delete tweets older than 6 months
    $wpdb->query($wpdb->prepare(
        "DELETE FROM $tweets_table WHERE created_at < %s",
        date('Y-m-d H:i:s', strtotime('-6 months'))
    ));
    
    // Delete analytics older than 3 months
    $wpdb->query($wpdb->prepare(
        "DELETE FROM $analytics_table WHERE created_at < %s",
        date('Y-m-d H:i:s', strtotime('-3 months'))
    ));
}

// Schedule weekly cleanup
if (!wp_next_scheduled('tweetscheduler_cleanup')) {
    wp_schedule_event(time(), 'weekly', 'tweetscheduler_cleanup');
}
add_action('tweetscheduler_cleanup', 'tweetscheduler_cleanup_old_data');