<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="index, follow">
    <meta name="author" content="TweetScheduler Pro">
    
    <?php if (is_home() || is_front_page()): ?>
    <meta name="description" content="<?php echo esc_attr(get_bloginfo('description')); ?>">
    <?php endif; ?>
    
    <!-- Preconnect to external domains -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Google Fonts for Arabic support -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="<?php echo get_template_directory_uri(); ?>/assets/favicon.svg">
    <link rel="icon" type="image/png" href="<?php echo get_template_directory_uri(); ?>/assets/favicon.png">
    
    <!-- Apple Touch Icon -->
    <link rel="apple-touch-icon" href="<?php echo get_template_directory_uri(); ?>/assets/apple-touch-icon.png">
    
    <!-- Theme Color -->
    <meta name="theme-color" content="<?php echo get_theme_mod('primary_color', '#1DA1F2'); ?>">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="<?php wp_title('|', true, 'right'); ?><?php bloginfo('name'); ?>">
    <meta property="og:description" content="<?php echo esc_attr(get_bloginfo('description')); ?>">
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo esc_url(home_url()); ?>">
    <meta property="og:image" content="<?php echo get_template_directory_uri(); ?>/assets/og-image.png">
    <meta property="og:site_name" content="<?php bloginfo('name'); ?>">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php wp_title('|', true, 'right'); ?><?php bloginfo('name'); ?>">
    <meta name="twitter:description" content="<?php echo esc_attr(get_bloginfo('description')); ?>">
    <meta name="twitter:image" content="<?php echo get_template_directory_uri(); ?>/assets/twitter-card.png">
    
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<!-- Skip to main content for accessibility -->
<a class="sr-only" href="#main-content"><?php _e('Skip to main content', 'tweetscheduler'); ?></a>

<!-- WordPress Admin Bar Spacer -->
<?php if (is_admin_bar_showing()): ?>
<div class="admin-bar-spacer"></div>
<?php endif; ?>