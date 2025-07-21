<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php wp_title('|', true, 'right'); ?><?php bloginfo('name'); ?></title>
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>

<div id="tweetscheduler-app">
    <!-- React App will mount here -->
    <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p><?php _e('Loading TweetScheduler Pro...', 'tweetscheduler'); ?></p>
    </div>
</div>

<!-- WordPress Admin Bar -->
<?php wp_footer(); ?>

<style>
.loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #fafafa;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #1DA1F2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-screen p {
    color: #6b7280;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Hide loading screen when React app loads */
#tweetscheduler-app.loaded .loading-screen {
    display: none;
}
</style>

<script>
// WordPress integration data
window.tweetschedulerWordPress = {
    apiUrl: '<?php echo home_url('/wp-json/tweetscheduler/v1/'); ?>',
    nonce: '<?php echo wp_create_nonce('wp_rest'); ?>',
    ajaxUrl: '<?php echo admin_url('admin-ajax.php'); ?>',
    homeUrl: '<?php echo home_url(); ?>',
    adminUrl: '<?php echo admin_url(); ?>',
    currentUser: <?php echo json_encode(is_user_logged_in() ? wp_get_current_user() : null); ?>,
    isLoggedIn: <?php echo is_user_logged_in() ? 'true' : 'false'; ?>,
    settings: {
        siteName: '<?php echo get_bloginfo('name'); ?>',
        siteDescription: '<?php echo get_bloginfo('description'); ?>',
        primaryColor: '<?php echo get_theme_mod('primary_color', '#1DA1F2'); ?>',
        accentColor: '<?php echo get_theme_mod('accent_color', '#14B8A6'); ?>',
        enableRtl: '<?php echo tweetscheduler_get_setting('enable_rtl', 'yes'); ?>',
        defaultLanguage: '<?php echo tweetscheduler_get_setting('default_language', 'en'); ?>',
    },
    plans: <?php echo json_encode(tweetscheduler_get_subscription_plans()); ?>,
    paymentMethods: <?php echo json_encode(tweetscheduler_get_payment_methods()); ?>,
};

// Initialize React app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // The React app will be built and served from the React frontend
    // This is just a placeholder for WordPress integration
    
    // If React app is not loaded within 5 seconds, show fallback
    setTimeout(function() {
        const app = document.getElementById('tweetscheduler-app');
        if (!app.classList.contains('loaded')) {
            app.innerHTML = `
                <div style="text-align: center; padding: 50px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <h1>TweetScheduler Pro</h1>
                    <p>Please ensure the React frontend is properly configured and running.</p>
                    <p><a href="<?php echo admin_url('admin.php?page=tweetscheduler-dashboard'); ?>" style="color: #1DA1F2;">Go to WordPress Admin Dashboard</a></p>
                </div>
            `;
        }
    }, 5000);
});
</script>

</body>
</html>