<?php
/**
 * Authentication Handler
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Initialize Authentication
 */
function tweetscheduler_init_auth() {
    // Google OAuth integration
    add_action('wp_ajax_tweetscheduler_google_auth', 'tweetscheduler_handle_google_auth');
    add_action('wp_ajax_nopriv_tweetscheduler_google_auth', 'tweetscheduler_handle_google_auth');
    
    // Custom login/register handlers
    add_action('wp_ajax_tweetscheduler_register', 'tweetscheduler_handle_register');
    add_action('wp_ajax_nopriv_tweetscheduler_register', 'tweetscheduler_handle_register');
    
    add_action('wp_ajax_tweetscheduler_login', 'tweetscheduler_handle_login');
    add_action('wp_ajax_nopriv_tweetscheduler_login', 'tweetscheduler_handle_login');
    
    // Password reset
    add_action('wp_ajax_tweetscheduler_reset_password', 'tweetscheduler_handle_password_reset');
    add_action('wp_ajax_nopriv_tweetscheduler_reset_password', 'tweetscheduler_handle_password_reset');
    
    // JWT token validation
    add_action('wp_ajax_tweetscheduler_validate_token', 'tweetscheduler_validate_jwt_token');
    add_action('wp_ajax_nopriv_tweetscheduler_validate_token', 'tweetscheduler_validate_jwt_token');
}
add_action('init', 'tweetscheduler_init_auth');

/**
 * Google OAuth Handler
 */
function tweetscheduler_handle_google_auth() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'tweetscheduler_nonce')) {
        wp_send_json_error(__('Security check failed.', 'tweetscheduler'));
    }
    
    $google_token = sanitize_text_field($_POST['google_token']);
    if (empty($google_token)) {
        wp_send_json_error(__('Google token is required.', 'tweetscheduler'));
    }
    
    // Verify Google token
    $google_user = tweetscheduler_verify_google_token($google_token);
    if (is_wp_error($google_user)) {
        wp_send_json_error($google_user->get_error_message());
    }
    
    // Check if user exists
    $existing_user = get_user_by('email', $google_user['email']);
    
    if ($existing_user) {
        // Login existing user
        wp_set_current_user($existing_user->ID);
        wp_set_auth_cookie($existing_user->ID);
        
        // Log analytics
        tweetscheduler_log_analytics($existing_user->ID, 'google_login');
        
        $response = array(
            'success' => true,
            'action' => 'login',
            'user' => array(
                'id' => $existing_user->ID,
                'email' => $existing_user->user_email,
                'display_name' => $existing_user->display_name,
                'avatar_url' => get_avatar_url($existing_user->ID),
            ),
            'token' => tweetscheduler_generate_jwt_token($existing_user->ID),
            'redirect_url' => home_url('/dashboard'),
        );
    } else {
        // Create new user
        $user_id = wp_create_user($google_user['email'], wp_generate_password(), $google_user['email']);
        
        if (is_wp_error($user_id)) {
            wp_send_json_error(__('Failed to create user account.', 'tweetscheduler'));
        }
        
        // Update user meta
        wp_update_user(array(
            'ID' => $user_id,
            'display_name' => $google_user['name'],
            'first_name' => $google_user['given_name'],
            'last_name' => $google_user['family_name'],
            'role' => 'tweetscheduler_user',
        ));
        
        // Store Google user data
        update_user_meta($user_id, 'google_id', $google_user['sub']);
        update_user_meta($user_id, 'google_picture', $google_user['picture']);
        update_user_meta($user_id, 'auth_provider', 'google');
        
        // Create trial subscription
        tweetscheduler_create_trial_subscription($user_id);
        
        // Login user
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id);
        
        // Log analytics
        tweetscheduler_log_analytics($user_id, 'google_register');
        
        // Send welcome email
        tweetscheduler_send_welcome_email($user_id);
        
        $response = array(
            'success' => true,
            'action' => 'register',
            'user' => array(
                'id' => $user_id,
                'email' => $google_user['email'],
                'display_name' => $google_user['name'],
                'avatar_url' => $google_user['picture'],
            ),
            'token' => tweetscheduler_generate_jwt_token($user_id),
            'redirect_url' => home_url('/dashboard'),
        );
    }
    
    wp_send_json_success($response);
}

/**
 * Verify Google Token
 */
function tweetscheduler_verify_google_token($token) {
    $google_client_id = tweetscheduler_get_setting('google_oauth_client_id');
    
    if (empty($google_client_id)) {
        return new WP_Error('google_not_configured', __('Google OAuth not configured.', 'tweetscheduler'));
    }
    
    $response = wp_remote_get("https://oauth2.googleapis.com/tokeninfo?id_token={$token}");
    
    if (is_wp_error($response)) {
        return new WP_Error('google_verification_failed', __('Failed to verify Google token.', 'tweetscheduler'));
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (!isset($data['aud']) || $data['aud'] !== $google_client_id) {
        return new WP_Error('invalid_google_token', __('Invalid Google token.', 'tweetscheduler'));
    }
    
    if (!isset($data['email_verified']) || $data['email_verified'] !== 'true') {
        return new WP_Error('email_not_verified', __('Google email not verified.', 'tweetscheduler'));
    }
    
    return $data;
}

/**
 * Handle User Registration
 */
function tweetscheduler_handle_register() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'tweetscheduler_nonce')) {
        wp_send_json_error(__('Security check failed.', 'tweetscheduler'));
    }
    
    $email = sanitize_email($_POST['email']);
    $password = $_POST['password'];
    $display_name = sanitize_text_field($_POST['display_name']);
    $phone = sanitize_text_field($_POST['phone']);
    
    // Validation
    if (empty($email) || empty($password)) {
        wp_send_json_error(__('Email and password are required.', 'tweetscheduler'));
    }
    
    if (!is_email($email)) {
        wp_send_json_error(__('Invalid email address.', 'tweetscheduler'));
    }
    
    if (strlen($password) < 6) {
        wp_send_json_error(__('Password must be at least 6 characters long.', 'tweetscheduler'));
    }
    
    if (email_exists($email)) {
        wp_send_json_error(__('Email already exists. Please use a different email or try logging in.', 'tweetscheduler'));
    }
    
    // Create user
    $user_id = wp_create_user($email, $password, $email);
    
    if (is_wp_error($user_id)) {
        wp_send_json_error(__('Failed to create user account. Please try again.', 'tweetscheduler'));
    }
    
    // Update user meta
    wp_update_user(array(
        'ID' => $user_id,
        'display_name' => $display_name ?: $email,
        'role' => 'tweetscheduler_user',
    ));
    
    // Store additional data
    if (!empty($phone)) {
        update_user_meta($user_id, 'phone', $phone);
    }
    update_user_meta($user_id, 'auth_provider', 'email');
    
    // Create trial subscription
    tweetscheduler_create_trial_subscription($user_id);
    
    // Login user
    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id);
    
    // Log analytics
    tweetscheduler_log_analytics($user_id, 'email_register');
    
    // Send welcome email
    tweetscheduler_send_welcome_email($user_id);
    
    $response = array(
        'success' => true,
        'user' => array(
            'id' => $user_id,
            'email' => $email,
            'display_name' => $display_name ?: $email,
            'avatar_url' => get_avatar_url($user_id),
        ),
        'token' => tweetscheduler_generate_jwt_token($user_id),
        'redirect_url' => home_url('/dashboard'),
        'message' => __('Account created successfully! Welcome to TweetScheduler Pro.', 'tweetscheduler'),
    );
    
    wp_send_json_success($response);
}

/**
 * Handle User Login
 */
function tweetscheduler_handle_login() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'tweetscheduler_nonce')) {
        wp_send_json_error(__('Security check failed.', 'tweetscheduler'));
    }
    
    $email = sanitize_email($_POST['email']);
    $password = $_POST['password'];
    $remember = isset($_POST['remember']) && $_POST['remember'] === 'true';
    
    if (empty($email) || empty($password)) {
        wp_send_json_error(__('Email and password are required.', 'tweetscheduler'));
    }
    
    // Authenticate user
    $user = wp_authenticate($email, $password);
    
    if (is_wp_error($user)) {
        // Log failed attempt
        tweetscheduler_log_analytics(0, 'login_failed', array('email' => $email));
        wp_send_json_error(__('Invalid email or password.', 'tweetscheduler'));
    }
    
    // Set authentication
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, $remember);
    
    // Log analytics
    tweetscheduler_log_analytics($user->ID, 'email_login');
    
    $response = array(
        'success' => true,
        'user' => array(
            'id' => $user->ID,
            'email' => $user->user_email,
            'display_name' => $user->display_name,
            'avatar_url' => get_avatar_url($user->ID),
            'roles' => $user->roles,
        ),
        'token' => tweetscheduler_generate_jwt_token($user->ID),
        'redirect_url' => in_array('tweetscheduler_admin', $user->roles) ? admin_url('admin.php?page=tweetscheduler-dashboard') : home_url('/dashboard'),
        'message' => sprintf(__('Welcome back, %s!', 'tweetscheduler'), $user->display_name),
    );
    
    wp_send_json_success($response);
}

/**
 * Handle Password Reset
 */
function tweetscheduler_handle_password_reset() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'tweetscheduler_nonce')) {
        wp_send_json_error(__('Security check failed.', 'tweetscheduler'));
    }
    
    $email = sanitize_email($_POST['email']);
    
    if (empty($email)) {
        wp_send_json_error(__('Email is required.', 'tweetscheduler'));
    }
    
    if (!is_email($email)) {
        wp_send_json_error(__('Invalid email address.', 'tweetscheduler'));
    }
    
    $user = get_user_by('email', $email);
    if (!$user) {
        wp_send_json_error(__('No account found with this email address.', 'tweetscheduler'));
    }
    
    // Generate reset key
    $reset_key = get_password_reset_key($user);
    if (is_wp_error($reset_key)) {
        wp_send_json_error(__('Failed to generate reset key. Please try again.', 'tweetscheduler'));
    }
    
    // Send reset email
    $reset_url = home_url("/reset-password?key={$reset_key}&login=" . rawurlencode($user->user_login));
    $subject = sprintf(__('Password Reset - %s', 'tweetscheduler'), get_bloginfo('name'));
    $message = sprintf(__("Hi %s,\n\nYou requested a password reset for your TweetScheduler Pro account.\n\nClick the link below to reset your password:\n%s\n\nThis link will expire in 24 hours.\n\nIf you didn't request this reset, please ignore this email.\n\nBest regards,\nTweetScheduler Pro Team", 'tweetscheduler'), 
        $user->display_name, 
        $reset_url
    );
    
    $sent = wp_mail($user->user_email, $subject, $message);
    
    if (!$sent) {
        wp_send_json_error(__('Failed to send reset email. Please try again.', 'tweetscheduler'));
    }
    
    // Log analytics
    tweetscheduler_log_analytics($user->ID, 'password_reset_requested');
    
    wp_send_json_success(array(
        'message' => __('Password reset email sent. Please check your inbox.', 'tweetscheduler'),
    ));
}

/**
 * Generate JWT Token
 */
function tweetscheduler_generate_jwt_token($user_id) {
    $header = json_encode(array('typ' => 'JWT', 'alg' => 'HS256'));
    $payload = json_encode(array(
        'user_id' => $user_id,
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60), // 24 hours
    ));
    
    $base64_header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64_payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64_header . "." . $base64_payload, wp_salt('auth'), true);
    $base64_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64_header . "." . $base64_payload . "." . $base64_signature;
}

/**
 * Validate JWT Token
 */
function tweetscheduler_validate_jwt_token() {
    $token = sanitize_text_field($_POST['token']);
    
    if (empty($token)) {
        wp_send_json_error(__('Token is required.', 'tweetscheduler'));
    }
    
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        wp_send_json_error(__('Invalid token format.', 'tweetscheduler'));
    }
    
    list($header, $payload, $signature) = $parts;
    
    // Verify signature
    $expected_signature = hash_hmac('sha256', $header . "." . $payload, wp_salt('auth'), true);
    $expected_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expected_signature));
    
    if (!hash_equals($signature, $expected_signature)) {
        wp_send_json_error(__('Invalid token signature.', 'tweetscheduler'));
    }
    
    // Decode payload
    $payload_data = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
    
    if (!$payload_data || !isset($payload_data['user_id']) || !isset($payload_data['exp'])) {
        wp_send_json_error(__('Invalid token payload.', 'tweetscheduler'));
    }
    
    // Check expiration
    if ($payload_data['exp'] < time()) {
        wp_send_json_error(__('Token has expired.', 'tweetscheduler'));
    }
    
    // Get user
    $user = get_user_by('ID', $payload_data['user_id']);
    if (!$user) {
        wp_send_json_error(__('User not found.', 'tweetscheduler'));
    }
    
    wp_send_json_success(array(
        'valid' => true,
        'user' => array(
            'id' => $user->ID,
            'email' => $user->user_email,
            'display_name' => $user->display_name,
            'avatar_url' => get_avatar_url($user->ID),
            'roles' => $user->roles,
        ),
    ));
}

/**
 * Send Welcome Email
 */
function tweetscheduler_send_welcome_email($user_id) {
    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return false;
    }
    
    $site_name = get_bloginfo('name');
    $subject = sprintf(__('Welcome to %s!', 'tweetscheduler'), $site_name);
    
    $message = sprintf(__("Hi %s,\n\nWelcome to TweetScheduler Pro! 🎉\n\nYour account has been created successfully and you now have access to a 3-day free trial.\n\nHere's what you can do:\n✅ Upload Excel/CSV files with your tweets\n✅ Schedule up to 7 tweets during your trial\n✅ Track your tweet performance\n✅ Manage your social media presence\n\nGet started now: %s\n\nNeed help? Check out our guide: %s\n\nQuestions? Reply to this email and we'll help you out!\n\nBest regards,\nThe TweetScheduler Pro Team\n\nP.S. Don't forget to upgrade before your trial ends to continue scheduling unlimited tweets!", 'tweetscheduler'),
        $user->display_name,
        home_url('/dashboard'),
        home_url('/help')
    );
    
    return wp_mail($user->user_email, $subject, $message);
}

/**
 * Custom Login Page Redirect
 */
function tweetscheduler_custom_login_redirect() {
    global $pagenow;
    
    if ($pagenow === 'wp-login.php' && !isset($_GET['action'])) {
        wp_redirect(home_url('/login'));
        exit;
    }
}
add_action('init', 'tweetscheduler_custom_login_redirect');

/**
 * Disable WordPress Admin Bar for Regular Users
 */
function tweetscheduler_disable_admin_bar_for_users() {
    if (!current_user_can('manage_tweetscheduler')) {
        show_admin_bar(false);
    }
}
add_action('after_setup_theme', 'tweetscheduler_disable_admin_bar_for_users');

/**
 * Redirect Users After Login
 */
function tweetscheduler_login_redirect_filter($redirect_to, $request, $user) {
    if (isset($user->roles) && is_array($user->roles)) {
        if (in_array('tweetscheduler_admin', $user->roles)) {
            return admin_url('admin.php?page=tweetscheduler-dashboard');
        } else {
            return home_url('/dashboard');
        }
    }
    return $redirect_to;
}
add_filter('login_redirect', 'tweetscheduler_login_redirect_filter', 10, 3);

/**
 * Logout Redirect
 */
function tweetscheduler_logout_redirect() {
    wp_redirect(home_url('/'));
    exit;
}
add_action('wp_logout', 'tweetscheduler_logout_redirect');