<?php
/**
 * Admin Dashboard Functions for TweetScheduler Pro
 * 
 * This file contains all the admin dashboard functionality for managing
 * the SaaS platform from the WordPress backend.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Main admin dashboard page
function tweetscheduler_admin_page() {
    global $wpdb;
    
    // Get statistics
    $users_table = $wpdb->prefix . 'tweetscheduler_users';
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    
    $total_users = $wpdb->get_var("SELECT COUNT(*) FROM $users_table");
    $active_subscriptions = $wpdb->get_var("SELECT COUNT(*) FROM $users_table WHERE subscription_tier != 'trial'");
    $total_tweets = $wpdb->get_var("SELECT COUNT(*) FROM $tweets_table");
    $published_tweets = $wpdb->get_var("SELECT COUNT(*) FROM $tweets_table WHERE status = 'published'");
    $scheduled_tweets = $wpdb->get_var("SELECT COUNT(*) FROM $tweets_table WHERE status = 'scheduled'");
    $failed_tweets = $wpdb->get_var("SELECT COUNT(*) FROM $tweets_table WHERE status = 'failed'");
    
    // Get recent activity
    $recent_users = $wpdb->get_results("
        SELECT u.*, wp.user_email, wp.display_name 
        FROM $users_table u 
        LEFT JOIN {$wpdb->users} wp ON u.user_id = wp.ID 
        ORDER BY u.created_at DESC 
        LIMIT 10
    ");
    
    $recent_tweets = $wpdb->get_results("
        SELECT t.*, wp.user_email 
        FROM $tweets_table t 
        LEFT JOIN {$wpdb->users} wp ON t.user_id = wp.ID 
        ORDER BY t.created_at DESC 
        LIMIT 10
    ");
    
    ?>
    <div class="wrap">
        <h1>TweetScheduler Pro Dashboard</h1>
        
        <!-- Statistics Cards -->
        <div class="tweetscheduler-stats-grid">
            <div class="tweetscheduler-stat-card">
                <h3>Total Users</h3>
                <div class="stat-number"><?php echo number_format($total_users); ?></div>
                <div class="stat-label">Registered users</div>
            </div>
            
            <div class="tweetscheduler-stat-card">
                <h3>Active Subscriptions</h3>
                <div class="stat-number"><?php echo number_format($active_subscriptions); ?></div>
                <div class="stat-label">Paid subscribers</div>
            </div>
            
            <div class="tweetscheduler-stat-card">
                <h3>Total Tweets</h3>
                <div class="stat-number"><?php echo number_format($total_tweets); ?></div>
                <div class="stat-label">All time</div>
            </div>
            
            <div class="tweetscheduler-stat-card">
                <h3>Published</h3>
                <div class="stat-number"><?php echo number_format($published_tweets); ?></div>
                <div class="stat-label">Successfully sent</div>
            </div>
            
            <div class="tweetscheduler-stat-card">
                <h3>Scheduled</h3>
                <div class="stat-number"><?php echo number_format($scheduled_tweets); ?></div>
                <div class="stat-label">Pending tweets</div>
            </div>
            
            <div class="tweetscheduler-stat-card">
                <h3>Failed</h3>
                <div class="stat-number"><?php echo number_format($failed_tweets); ?></div>
                <div class="stat-label">Failed to send</div>
            </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="tweetscheduler-admin-grid">
            <div class="tweetscheduler-admin-section">
                <h2>Recent Users</h2>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Subscription</th>
                            <th>Tweets Used</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_users as $user): ?>
                        <tr>
                            <td><?php echo esc_html($user->display_name ?: $user->user_email); ?></td>
                            <td><?php echo esc_html($user->user_email); ?></td>
                            <td>
                                <span class="subscription-badge subscription-<?php echo esc_attr($user->subscription_tier); ?>">
                                    <?php echo esc_html(ucfirst($user->subscription_tier)); ?>
                                </span>
                            </td>
                            <td><?php echo esc_html($user->tweets_used . '/' . $user->tweets_limit); ?></td>
                            <td><?php echo esc_html(date('M j, Y', strtotime($user->created_at))); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <div class="tweetscheduler-admin-section">
                <h2>Recent Tweets</h2>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Content</th>
                            <th>User</th>
                            <th>Status</th>
                            <th>Scheduled</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_tweets as $tweet): ?>
                        <tr>
                            <td>
                                <div class="tweet-content">
                                    <?php echo esc_html(substr($tweet->content, 0, 50) . (strlen($tweet->content) > 50 ? '...' : '')); ?>
                                </div>
                            </td>
                            <td><?php echo esc_html($tweet->user_email); ?></td>
                            <td>
                                <span class="status-badge status-<?php echo esc_attr($tweet->status); ?>">
                                    <?php echo esc_html(ucfirst($tweet->status)); ?>
                                </span>
                            </td>
                            <td><?php echo esc_html(date('M j, Y H:i', strtotime($tweet->scheduled_at))); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <style>
    .tweetscheduler-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin: 20px 0;
    }
    
    .tweetscheduler-stat-card {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
    }
    
    .tweetscheduler-stat-card h3 {
        margin: 0 0 10px 0;
        color: #666;
        font-size: 14px;
        text-transform: uppercase;
    }
    
    .stat-number {
        font-size: 32px;
        font-weight: bold;
        color: #1DA1F2;
        margin: 10px 0;
    }
    
    .stat-label {
        color: #999;
        font-size: 12px;
    }
    
    .tweetscheduler-admin-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin: 20px 0;
    }
    
    .tweetscheduler-admin-section {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .subscription-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .subscription-trial { background: #f0f0f0; color: #666; }
    .subscription-starter { background: #e3f2fd; color: #1976d2; }
    .subscription-pro { background: #f3e5f5; color: #7b1fa2; }
    .subscription-enterprise { background: #fff3e0; color: #f57c00; }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .status-scheduled { background: #fff3cd; color: #856404; }
    .status-published { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    
    .tweet-content {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    </style>
    <?php
}

// Users management page
function tweetscheduler_users_page() {
    global $wpdb;
    
    $users_table = $wpdb->prefix . 'tweetscheduler_users';
    $page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $per_page = 20;
    $offset = ($page - 1) * $per_page;
    
    // Handle user actions
    if (isset($_POST['action']) && isset($_POST['user_id'])) {
        $user_id = intval($_POST['user_id']);
        $action = sanitize_text_field($_POST['action']);
        
        switch ($action) {
            case 'reset_tweets':
                $wpdb->update(
                    $users_table,
                    array('tweets_used' => 0),
                    array('user_id' => $user_id),
                    array('%d'),
                    array('%d')
                );
                echo '<div class="notice notice-success"><p>Tweet count reset successfully.</p></div>';
                break;
                
            case 'upgrade_subscription':
                $new_tier = sanitize_text_field($_POST['new_tier']);
                $limits = array(
                    'starter' => 30,
                    'pro' => 120,
                    'enterprise' => -1
                );
                
                $wpdb->update(
                    $users_table,
                    array(
                        'subscription_tier' => $new_tier,
                        'tweets_limit' => $limits[$new_tier],
                        'subscription_ends_at' => date('Y-m-d H:i:s', strtotime('+1 month'))
                    ),
                    array('user_id' => $user_id),
                    array('%s', '%d', '%s'),
                    array('%d')
                );
                echo '<div class="notice notice-success"><p>Subscription updated successfully.</p></div>';
                break;
        }
    }
    
    // Get users with pagination
    $users = $wpdb->get_results($wpdb->prepare("
        SELECT u.*, wp.user_email, wp.display_name, wp.user_registered
        FROM $users_table u 
        LEFT JOIN {$wpdb->users} wp ON u.user_id = wp.ID 
        ORDER BY u.created_at DESC 
        LIMIT %d OFFSET %d
    ", $per_page, $offset));
    
    $total_users = $wpdb->get_var("SELECT COUNT(*) FROM $users_table");
    $total_pages = ceil($total_users / $per_page);
    
    ?>
    <div class="wrap">
        <h1>User Management</h1>
        
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Subscription</th>
                    <th>Tweets</th>
                    <th>Twitter</th>
                    <th>Joined</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($users as $user): ?>
                <tr>
                    <td><?php echo esc_html($user->display_name ?: $user->user_email); ?></td>
                    <td><?php echo esc_html($user->user_email); ?></td>
                    <td>
                        <span class="subscription-badge subscription-<?php echo esc_attr($user->subscription_tier); ?>">
                            <?php echo esc_html(ucfirst($user->subscription_tier)); ?>
                        </span>
                        <?php if ($user->trial_ends_at && strtotime($user->trial_ends_at) > time()): ?>
                            <br><small>Trial ends: <?php echo date('M j', strtotime($user->trial_ends_at)); ?></small>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php echo esc_html($user->tweets_used); ?> / 
                        <?php echo $user->tweets_limit == -1 ? '∞' : esc_html($user->tweets_limit); ?>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?php echo $user->tweets_limit > 0 ? ($user->tweets_used / $user->tweets_limit * 100) : 0; ?>%"></div>
                        </div>
                    </td>
                    <td>
                        <?php if ($user->twitter_connected): ?>
                            <span class="dashicons dashicons-twitter" style="color: #1DA1F2;"></span>
                            <?php echo esc_html($user->twitter_username); ?>
                        <?php else: ?>
                            <span style="color: #999;">Not connected</span>
                        <?php endif; ?>
                    </td>
                    <td><?php echo esc_html(date('M j, Y', strtotime($user->created_at))); ?></td>
                    <td>
                        <div class="user-actions">
                            <form method="post" style="display: inline;">
                                <input type="hidden" name="user_id" value="<?php echo esc_attr($user->user_id); ?>">
                                <input type="hidden" name="action" value="reset_tweets">
                                <button type="submit" class="button button-small" onclick="return confirm('Reset tweet count for this user?')">
                                    Reset Tweets
                                </button>
                            </form>
                            
                            <form method="post" style="display: inline;">
                                <input type="hidden" name="user_id" value="<?php echo esc_attr($user->user_id); ?>">
                                <input type="hidden" name="action" value="upgrade_subscription">
                                <select name="new_tier" onchange="this.form.submit()">
                                    <option value="">Change Plan</option>
                                    <option value="starter" <?php selected($user->subscription_tier, 'starter'); ?>>Starter</option>
                                    <option value="pro" <?php selected($user->subscription_tier, 'pro'); ?>>Pro</option>
                                    <option value="enterprise" <?php selected($user->subscription_tier, 'enterprise'); ?>>Enterprise</option>
                                </select>
                            </form>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <!-- Pagination -->
        <?php if ($total_pages > 1): ?>
        <div class="tablenav">
            <div class="tablenav-pages">
                <?php
                echo paginate_links(array(
                    'base' => add_query_arg('paged', '%#%'),
                    'format' => '',
                    'prev_text' => '&laquo;',
                    'next_text' => '&raquo;',
                    'total' => $total_pages,
                    'current' => $page
                ));
                ?>
            </div>
        </div>
        <?php endif; ?>
    </div>
    
    <style>
    .progress-bar {
        width: 100px;
        height: 6px;
        background: #f0f0f0;
        border-radius: 3px;
        margin-top: 4px;
    }
    
    .progress-fill {
        height: 100%;
        background: #1DA1F2;
        border-radius: 3px;
        transition: width 0.3s ease;
    }
    
    .user-actions {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
    }
    
    .user-actions form {
        margin: 0;
    }
    
    .user-actions select {
        font-size: 11px;
        padding: 2px 4px;
    }
    </style>
    <?php
}

// Settings page
function tweetscheduler_settings_page() {
    // Handle form submission
    if (isset($_POST['submit'])) {
        // Update settings
        update_option('tweetscheduler_twitter_api_key', sanitize_text_field($_POST['twitter_api_key']));
        update_option('tweetscheduler_twitter_api_secret', sanitize_text_field($_POST['twitter_api_secret']));
        update_option('tweetscheduler_twitter_bearer_token', sanitize_text_field($_POST['twitter_bearer_token']));
        update_option('tweetscheduler_stc_pay_api_key', sanitize_text_field($_POST['stc_pay_api_key']));
        update_option('tweetscheduler_mada_api_key', sanitize_text_field($_POST['mada_api_key']));
        update_option('tweetscheduler_hyperpay_api_key', sanitize_text_field($_POST['hyperpay_api_key']));
        
        echo '<div class="notice notice-success"><p>Settings saved successfully.</p></div>';
    }
    
    // Get current settings
    $twitter_api_key = get_option('tweetscheduler_twitter_api_key', '');
    $twitter_api_secret = get_option('tweetscheduler_twitter_api_secret', '');
    $twitter_bearer_token = get_option('tweetscheduler_twitter_bearer_token', '');
    $stc_pay_api_key = get_option('tweetscheduler_stc_pay_api_key', '');
    $mada_api_key = get_option('tweetscheduler_mada_api_key', '');
    $hyperpay_api_key = get_option('tweetscheduler_hyperpay_api_key', '');
    
    ?>
    <div class="wrap">
        <h1>TweetScheduler Settings</h1>
        
        <form method="post">
            <table class="form-table">
                <tr>
                    <th colspan="2"><h2>Twitter API Settings</h2></th>
                </tr>
                <tr>
                    <th scope="row">Twitter API Key</th>
                    <td>
                        <input type="text" name="twitter_api_key" value="<?php echo esc_attr($twitter_api_key); ?>" class="regular-text" />
                        <p class="description">Your Twitter API key from developer.twitter.com</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Twitter API Secret</th>
                    <td>
                        <input type="password" name="twitter_api_secret" value="<?php echo esc_attr($twitter_api_secret); ?>" class="regular-text" />
                        <p class="description">Your Twitter API secret key</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Twitter Bearer Token</th>
                    <td>
                        <input type="password" name="twitter_bearer_token" value="<?php echo esc_attr($twitter_bearer_token); ?>" class="regular-text" />
                        <p class="description">Your Twitter Bearer token for API v2</p>
                    </td>
                </tr>
                
                <tr>
                    <th colspan="2"><h2>Payment Gateway Settings</h2></th>
                </tr>
                <tr>
                    <th scope="row">STC Pay API Key</th>
                    <td>
                        <input type="password" name="stc_pay_api_key" value="<?php echo esc_attr($stc_pay_api_key); ?>" class="regular-text" />
                        <p class="description">API key for STC Pay integration</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Mada API Key</th>
                    <td>
                        <input type="password" name="mada_api_key" value="<?php echo esc_attr($mada_api_key); ?>" class="regular-text" />
                        <p class="description">API key for Mada payment integration</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">HyperPay API Key</th>
                    <td>
                        <input type="password" name="hyperpay_api_key" value="<?php echo esc_attr($hyperpay_api_key); ?>" class="regular-text" />
                        <p class="description">API key for HyperPay integration</p>
                    </td>
                </tr>
            </table>
            
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// Tweets management page
function tweetscheduler_tweets_page() {
    echo '<div class="wrap"><h1>Tweet Management</h1><p>Tweet management functionality will be implemented here.</p></div>';
}