    <!-- WordPress Footer -->
    <?php wp_footer(); ?>
    
    <!-- TweetScheduler Analytics -->
    <script>
    // Track page views and user interactions
    if (window.tweetschedulerWordPress && window.tweetschedulerWordPress.isLoggedIn) {
        // Log page view
        fetch(window.tweetschedulerWordPress.ajaxUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'tweetscheduler_log_analytics',
                nonce: window.tweetschedulerWordPress.nonce,
                event_type: 'page_view',
                event_data: JSON.stringify({
                    page: window.location.pathname,
                    referrer: document.referrer,
                    timestamp: Date.now()
                })
            })
        }).catch(console.error);
    }
    </script>
    
    <!-- Service Worker for PWA functionality -->
    <script>
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('<?php echo home_url('/sw.js'); ?>')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                })
                .catch(function(err) {
                    console.log('ServiceWorker registration failed');
                });
        });
    }
    </script>
    
</body>
</html>