<?php
/**
 * WordPress Admin Dashboard for TweetScheduler
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add Admin Menu
 */
function tweetscheduler_add_admin_menu() {
    add_menu_page(
        __('TweetScheduler Pro', 'tweetscheduler'),
        __('TweetScheduler', 'tweetscheduler'),
        'manage_tweetscheduler',
        'tweetscheduler-dashboard',
        'tweetscheduler_admin_dashboard_page',
        'dashicons-twitter',
        30
    );
    
    add_submenu_page(
        'tweetscheduler-dashboard',
        __('Dashboard', 'tweetscheduler'),
        __('Dashboard', 'tweetscheduler'),
        'manage_tweetscheduler',
        'tweetscheduler-dashboard',
        'tweetscheduler_admin_dashboard_page'
    );
    
    add_submenu_page(
        'tweetscheduler-dashboard',
        __('Users', 'tweetscheduler'),
        __('Users', 'tweetscheduler'),
        'manage_tweetscheduler',
        'tweetscheduler-users',
        'tweetscheduler_admin_users_page'
    );
    
    add_submenu_page(
        'tweetscheduler-dashboard',
        __('Tweets', 'tweetscheduler'),
        __('Tweets', 'tweetscheduler'),
        'manage_tweetscheduler',
        'tweetscheduler-tweets',
        'tweetscheduler_admin_tweets_page'
    );
    
    add_submenu_page(
        'tweetscheduler-dashboard',
        __('Analytics', 'tweetscheduler'),
        __('Analytics', 'tweetscheduler'),
        'manage_tweetscheduler',
        'tweetscheduler-analytics',
        'tweetscheduler_admin_analytics_page'
    );
    
    add_submenu_page(
        'tweetscheduler-dashboard',
        __('Settings', 'tweetscheduler'),
        __('Settings', 'tweetscheduler'),
        'manage_tweetscheduler',
        'tweetscheduler-settings',
        'tweetscheduler_admin_settings_page'
    );
}
add_action('admin_menu', 'tweetscheduler_add_admin_menu');

/**
 * Admin Dashboard Page
 */
function tweetscheduler_admin_dashboard_page() {
    global $wpdb;
    
    // Get statistics
    $stats = tweetscheduler_get_admin_stats();
    
    ?>
    <div class="wrap">
        <h1><?php _e('TweetScheduler Pro Dashboard', 'tweetscheduler'); ?></h1>
        
        <div class="tweetscheduler-admin-dashboard">
            <!-- Stats Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <h3><?php echo number_format($stats['total_users']); ?></h3>
                        <p><?php _e('Total Users', 'tweetscheduler'); ?></p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">🐦</div>
                    <div class="stat-content">
                        <h3><?php echo number_format($stats['total_tweets']); ?></h3>
                        <p><?php _e('Total Tweets', 'tweetscheduler'); ?></p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">💳</div>
                    <div class="stat-content">
                        <h3><?php echo number_format($stats['active_subscriptions']); ?></h3>
                        <p><?php _e('Active Subscriptions', 'tweetscheduler'); ?></p>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-content">
                        <h3><?php echo number_format($stats['tweets_today']); ?></h3>
                        <p><?php _e('Tweets Today', 'tweetscheduler'); ?></p>
                    </div>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="dashboard-section">
                <h2><?php _e('Recent Activity', 'tweetscheduler'); ?></h2>
                <div class="activity-list">
                    <?php foreach ($stats['recent_activity'] as $activity): ?>
                        <div class="activity-item">
                            <div class="activity-icon"><?php echo tweetscheduler_get_activity_icon($activity->event_type); ?></div>
                            <div class="activity-content">
                                <p><?php echo tweetscheduler_format_activity($activity); ?></p>
                                <small><?php echo human_time_diff(strtotime($activity->created_at)); ?> ago</small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="dashboard-section">
                <h2><?php _e('Quick Actions', 'tweetscheduler'); ?></h2>
                <div class="quick-actions">
                    <a href="<?php echo admin_url('admin.php?page=tweetscheduler-users'); ?>" class="action-button">
                        <span class="dashicons dashicons-admin-users"></span>
                        <?php _e('Manage Users', 'tweetscheduler'); ?>
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=tweetscheduler-tweets'); ?>" class="action-button">
                        <span class="dashicons dashicons-twitter"></span>
                        <?php _e('View Tweets', 'tweetscheduler'); ?>
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=tweetscheduler-settings'); ?>" class="action-button">
                        <span class="dashicons dashicons-admin-settings"></span>
                        <?php _e('Settings', 'tweetscheduler'); ?>
                    </a>
                </div>
            </div>
            
            <!-- System Status -->
            <div class="dashboard-section">
                <h2><?php _e('System Status', 'tweetscheduler'); ?></h2>
                <div class="system-status">
                    <div class="status-item">
                        <span class="status-label"><?php _e('Twitter API', 'tweetscheduler'); ?>:</span>
                        <span class="status-value <?php echo tweetscheduler_check_twitter_api() ? 'status-ok' : 'status-error'; ?>">
                            <?php echo tweetscheduler_check_twitter_api() ? __('Connected', 'tweetscheduler') : __('Not Connected', 'tweetscheduler'); ?>
                        </span>
                    </div>
                    <div class="status-item">
                        <span class="status-label"><?php _e('Cron Jobs', 'tweetscheduler'); ?>:</span>
                        <span class="status-value <?php echo wp_next_scheduled('tweetscheduler_process_tweets') ? 'status-ok' : 'status-error'; ?>">
                            <?php echo wp_next_scheduled('tweetscheduler_process_tweets') ? __('Running', 'tweetscheduler') : __('Not Running', 'tweetscheduler'); ?>
                        </span>
                    </div>
                    <div class="status-item">
                        <span class="status-label"><?php _e('SSL Certificate', 'tweetscheduler'); ?>:</span>
                        <span class="status-value <?php echo is_ssl() ? 'status-ok' : 'status-warning'; ?>">
                            <?php echo is_ssl() ? __('Secure', 'tweetscheduler') : __('Not Secure', 'tweetscheduler'); ?>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <style>
    .tweetscheduler-admin-dashboard {
        max-width: 1200px;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .stat-card {
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .stat-icon {
        font-size: 2em;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f9ff;
        border-radius: 50%;
    }
    
    .stat-content h3 {
        margin: 0;
        font-size: 2em;
        color: #1DA1F2;
    }
    
    .stat-content p {
        margin: 5px 0 0 0;
        color: #666;
    }
    
    .dashboard-section {
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }
    
    .dashboard-section h2 {
        margin-top: 0;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
    }
    
    .activity-list {
        max-height: 400px;
        overflow-y: auto;
    }
    
    .activity-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 10px 0;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .activity-icon {
        font-size: 1.2em;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f9fa;
        border-radius: 50%;
    }
    
    .quick-actions {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
    }
    
    .action-button {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        background: #1DA1F2;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        transition: background 0.3s;
    }
    
    .action-button:hover {
        background: #1991db;
        color: white;
    }
    
    .system-status {
        display: grid;
        gap: 10px;
    }
    
    .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 4px;
    }
    
    .status-ok { color: #28a745; font-weight: bold; }
    .status-warning { color: #ffc107; font-weight: bold; }
    .status-error { color: #dc3545; font-weight: bold; }
    </style>
    <?php
}

/**
 * Admin Users Page
 */
function tweetscheduler_admin_users_page() {
    global $wpdb;
    
    // Handle user actions
    if (isset($_POST['action']) && wp_verify_nonce($_POST['nonce'], 'tweetscheduler_admin')) {
        tweetscheduler_handle_user_action();
    }
    
    // Get users with subscriptions
    $users = tweetscheduler_get_users_with_subscriptions();
    
    ?>
    <div class="wrap">
        <h1><?php _e('User Management', 'tweetscheduler'); ?></h1>
        
        <div class="tweetscheduler-users-table">
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php _e('User', 'tweetscheduler'); ?></th>
                        <th><?php _e('Email', 'tweetscheduler'); ?></th>
                        <th><?php _e('Plan', 'tweetscheduler'); ?></th>
                        <th><?php _e('Usage', 'tweetscheduler'); ?></th>
                        <th><?php _e('Status', 'tweetscheduler'); ?></th>
                        <th><?php _e('Joined', 'tweetscheduler'); ?></th>
                        <th><?php _e('Actions', 'tweetscheduler'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $user): ?>
                        <tr>
                            <td>
                                <strong><?php echo esc_html($user->display_name); ?></strong>
                                <br><small>ID: <?php echo $user->ID; ?></small>
                            </td>
                            <td><?php echo esc_html($user->user_email); ?></td>
                            <td>
                                <span class="plan-badge plan-<?php echo esc_attr($user->plan_type); ?>">
                                    <?php echo esc_html(ucfirst($user->plan_type)); ?>
                                </span>
                            </td>
                            <td>
                                <?php if ($user->tweets_limit == -1): ?>
                                    <?php echo $user->tweets_used; ?> / ∞
                                <?php else: ?>
                                    <?php echo $user->tweets_used; ?> / <?php echo $user->tweets_limit; ?>
                                    <div class="usage-bar">
                                        <div class="usage-fill" style="width: <?php echo min(100, ($user->tweets_used / $user->tweets_limit) * 100); ?>%"></div>
                                    </div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <span class="status-badge status-<?php echo esc_attr($user->subscription_status); ?>">
                                    <?php echo esc_html(ucfirst($user->subscription_status)); ?>
                                </span>
                            </td>
                            <td><?php echo date('M j, Y', strtotime($user->user_registered)); ?></td>
                            <td>
                                <div class="user-actions">
                                    <button class="button button-small" onclick="editUser(<?php echo $user->ID; ?>)">
                                        <?php _e('Edit', 'tweetscheduler'); ?>
                                    </button>
                                    <button class="button button-small" onclick="viewTweets(<?php echo $user->ID; ?>)">
                                        <?php _e('Tweets', 'tweetscheduler'); ?>
                                    </button>
                                    <?php if ($user->subscription_status === 'active'): ?>
                                        <button class="button button-small button-link-delete" onclick="suspendUser(<?php echo $user->ID; ?>)">
                                            <?php _e('Suspend', 'tweetscheduler'); ?>
                                        </button>
                                    <?php else: ?>
                                        <button class="button button-small button-primary" onclick="activateUser(<?php echo $user->ID; ?>)">
                                            <?php _e('Activate', 'tweetscheduler'); ?>
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    
    <style>
    .plan-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .plan-trial { background: #f0f9ff; color: #1e40af; }
    .plan-starter { background: #f0fdf4; color: #166534; }
    .plan-pro { background: #fef3c7; color: #92400e; }
    .plan-enterprise { background: #f3e8ff; color: #7c3aed; }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .status-active { background: #dcfce7; color: #166534; }
    .status-expired { background: #fee2e2; color: #dc2626; }
    .status-cancelled { background: #f3f4f6; color: #6b7280; }
    
    .usage-bar {
        width: 100px;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        margin-top: 4px;
    }
    
    .usage-fill {
        height: 100%;
        background: #1DA1F2;
        border-radius: 3px;
        transition: width 0.3s;
    }
    
    .user-actions {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
    }
    </style>
    
    <script>
    function editUser(userId) {
        // Implement user editing modal
        alert('Edit user functionality would be implemented here');
    }
    
    function viewTweets(userId) {
        window.location.href = '<?php echo admin_url('admin.php?page=tweetscheduler-tweets&user_id='); ?>' + userId;
    }
    
    function suspendUser(userId) {
        if (confirm('Are you sure you want to suspend this user?')) {
            // Implement suspension
            alert('User suspension functionality would be implemented here');
        }
    }
    
    function activateUser(userId) {
        if (confirm('Are you sure you want to activate this user?')) {
            // Implement activation
            alert('User activation functionality would be implemented here');
        }
    }
    </script>
    <?php
}

/**
 * Get Admin Statistics
 */
function tweetscheduler_get_admin_stats() {
    global $wpdb;
    
    $users_table = $wpdb->users;
    $tweets_table = $wpdb->prefix . 'tweetscheduler_tweets';
    $subscriptions_table = $wpdb->prefix . 'tweetscheduler_subscriptions';
    $analytics_table = $wpdb->prefix . 'tweetscheduler_analytics';
    
    $stats = array();
    
    // Basic counts
    $stats['total_users'] = $wpdb->get_var("SELECT COUNT(*) FROM $users_table WHERE ID IN (SELECT user_id FROM $subscriptions_table)");
    $stats['total_tweets'] = $wpdb->get_var("SELECT COUNT(*) FROM $tweets_table");
    $stats['active_subscriptions'] = $wpdb->get_var("SELECT COUNT(*) FROM $subscriptions_table WHERE status = 'active'");
    $stats['tweets_today'] = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $tweets_table WHERE DATE(created_at) = %s",
        date('Y-m-d')
    ));
    
    // Recent activity
    $stats['recent_activity'] = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $analytics_table ORDER BY created_at DESC LIMIT %d",
        10
    ));
    
    return $stats;
}

/**
 * Get Users with Subscriptions
 */
function tweetscheduler_get_users_with_subscriptions() {
    global $wpdb;
    
    return $wpdb->get_results("
        SELECT u.*, s.plan_type, s.status as subscription_status, s.tweets_used, s.tweets_limit
        FROM {$wpdb->users} u
        LEFT JOIN {$wpdb->prefix}tweetscheduler_subscriptions s ON u.ID = s.user_id
        WHERE s.user_id IS NOT NULL
        ORDER BY u.user_registered DESC
    ");
}

/**
 * Check Twitter API Status
 */
function tweetscheduler_check_twitter_api() {
    $api_key = tweetscheduler_get_setting('twitter_api_key');
    $api_secret = tweetscheduler_get_setting('twitter_api_secret');
    $access_token = tweetscheduler_get_setting('twitter_access_token');
    $access_token_secret = tweetscheduler_get_setting('twitter_access_token_secret');
    
    return !empty($api_key) && !empty($api_secret) && !empty($access_token) && !empty($access_token_secret);
}

/**
 * Get Activity Icon
 */
function tweetscheduler_get_activity_icon($event_type) {
    $icons = array(
        'login' => '🔐',
        'register' => '👤',
        'tweet_created' => '🐦',
        'tweet_posted' => '✅',
        'tweet_failed' => '❌',
        'subscription_created' => '💳',
        'payment_completed' => '💰',
    );
    
    return isset($icons[$event_type]) ? $icons[$event_type] : '📊';
}

/**
 * Format Activity
 */
function tweetscheduler_format_activity($activity) {
    $user = get_user_by('ID', $activity->user_id);
    $user_name = $user ? $user->display_name : 'Unknown User';
    
    switch ($activity->event_type) {
        case 'login':
            return sprintf(__('%s logged in', 'tweetscheduler'), $user_name);
        case 'register':
            return sprintf(__('%s registered', 'tweetscheduler'), $user_name);
        case 'tweet_created':
            return sprintf(__('%s scheduled a tweet', 'tweetscheduler'), $user_name);
        case 'tweet_posted':
            return sprintf(__('%s\'s tweet was posted', 'tweetscheduler'), $user_name);
        case 'tweet_failed':
            return sprintf(__('%s\'s tweet failed to post', 'tweetscheduler'), $user_name);
        case 'subscription_created':
            return sprintf(__('%s created a subscription', 'tweetscheduler'), $user_name);
        case 'payment_completed':
            return sprintf(__('%s completed a payment', 'tweetscheduler'), $user_name);
        default:
            return sprintf(__('%s performed an action', 'tweetscheduler'), $user_name);
    }
}