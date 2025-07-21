<?php
/**
 * Payment Gateways Integration
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Initialize Payment Gateways
 */
function tweetscheduler_init_payment_gateways() {
    // Register payment gateway hooks
    add_action('wp_ajax_tweetscheduler_process_payment', 'tweetscheduler_process_payment');
    add_action('wp_ajax_nopriv_tweetscheduler_process_payment', 'tweetscheduler_process_payment');
    
    // Payment webhook handlers
    add_action('wp_ajax_tweetscheduler_stc_webhook', 'tweetscheduler_handle_stc_webhook');
    add_action('wp_ajax_nopriv_tweetscheduler_stc_webhook', 'tweetscheduler_handle_stc_webhook');
    
    add_action('wp_ajax_tweetscheduler_hyperpay_webhook', 'tweetscheduler_handle_hyperpay_webhook');
    add_action('wp_ajax_nopriv_tweetscheduler_hyperpay_webhook', 'tweetscheduler_handle_hyperpay_webhook');
    
    add_action('wp_ajax_tweetscheduler_tabby_webhook', 'tweetscheduler_handle_tabby_webhook');
    add_action('wp_ajax_nopriv_tweetscheduler_tabby_webhook', 'tweetscheduler_handle_tabby_webhook');
}
add_action('init', 'tweetscheduler_init_payment_gateways');

/**
 * Get Available Payment Methods
 */
function tweetscheduler_get_payment_methods() {
    $methods = array();
    
    // STC Pay
    if (tweetscheduler_get_setting('enable_stc_pay') === 'yes') {
        $methods['stc_pay'] = array(
            'id' => 'stc_pay',
            'name' => __('STC Pay', 'tweetscheduler'),
            'description' => __('Pay securely with STC Pay', 'tweetscheduler'),
            'icon' => TWEETSCHEDULER_THEME_URL . '/assets/images/stc-pay.png',
            'supported_currencies' => array('SAR'),
        );
    }
    
    // Mada
    if (tweetscheduler_get_setting('enable_mada') === 'yes') {
        $methods['mada'] = array(
            'id' => 'mada',
            'name' => __('Mada', 'tweetscheduler'),
            'description' => __('Pay with your Mada card', 'tweetscheduler'),
            'icon' => TWEETSCHEDULER_THEME_URL . '/assets/images/mada.png',
            'supported_currencies' => array('SAR'),
        );
    }
    
    // Apple Pay
    if (tweetscheduler_get_setting('enable_apple_pay') === 'yes') {
        $methods['apple_pay'] = array(
            'id' => 'apple_pay',
            'name' => __('Apple Pay', 'tweetscheduler'),
            'description' => __('Pay quickly with Apple Pay', 'tweetscheduler'),
            'icon' => TWEETSCHEDULER_THEME_URL . '/assets/images/apple-pay.png',
            'supported_currencies' => array('SAR', 'USD', 'EUR'),
        );
    }
    
    // HyperPay
    if (tweetscheduler_get_setting('enable_hyperpay') === 'yes') {
        $methods['hyperpay'] = array(
            'id' => 'hyperpay',
            'name' => __('Credit/Debit Card', 'tweetscheduler'),
            'description' => __('Pay with Visa, Mastercard, or other cards', 'tweetscheduler'),
            'icon' => TWEETSCHEDULER_THEME_URL . '/assets/images/cards.png',
            'supported_currencies' => array('SAR', 'USD', 'EUR', 'AED'),
        );
    }
    
    // Tabby (Buy Now, Pay Later)
    if (tweetscheduler_get_setting('enable_tabby') === 'yes') {
        $methods['tabby'] = array(
            'id' => 'tabby',
            'name' => __('Tabby', 'tweetscheduler'),
            'description' => __('Buy now, pay later in 4 installments', 'tweetscheduler'),
            'icon' => TWEETSCHEDULER_THEME_URL . '/assets/images/tabby.png',
            'supported_currencies' => array('SAR', 'AED'),
        );
    }
    
    // Tamara (Buy Now, Pay Later)
    if (tweetscheduler_get_setting('enable_tamara') === 'yes') {
        $methods['tamara'] = array(
            'id' => 'tamara',
            'name' => __('Tamara', 'tweetscheduler'),
            'description' => __('Split your payment into 3 installments', 'tweetscheduler'),
            'icon' => TWEETSCHEDULER_THEME_URL . '/assets/images/tamara.png',
            'supported_currencies' => array('SAR', 'AED', 'KWD'),
        );
    }
    
    return apply_filters('tweetscheduler_payment_methods', $methods);
}

/**
 * Process Payment
 */
function tweetscheduler_process_payment() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'tweetscheduler_payment')) {
        wp_die(__('Security check failed.', 'tweetscheduler'));
    }
    
    $user_id = get_current_user_id();
    if (!$user_id) {
        wp_send_json_error(__('User not logged in.', 'tweetscheduler'));
    }
    
    $plan_type = sanitize_text_field($_POST['plan_type']);
    $payment_method = sanitize_text_field($_POST['payment_method']);
    $return_url = esc_url_raw($_POST['return_url']);
    $cancel_url = esc_url_raw($_POST['cancel_url']);
    
    $plans = tweetscheduler_get_subscription_plans();
    if (!isset($plans[$plan_type])) {
        wp_send_json_error(__('Invalid plan selected.', 'tweetscheduler'));
    }
    
    $plan = $plans[$plan_type];
    $amount = $plan['price'];
    $currency = $plan['currency'];
    
    // Create payment session based on method
    switch ($payment_method) {
        case 'stc_pay':
            $result = tweetscheduler_create_stc_payment($user_id, $plan_type, $amount, $currency, $return_url, $cancel_url);
            break;
            
        case 'mada':
        case 'hyperpay':
            $result = tweetscheduler_create_hyperpay_payment($user_id, $plan_type, $amount, $currency, $payment_method, $return_url, $cancel_url);
            break;
            
        case 'apple_pay':
            $result = tweetscheduler_create_apple_pay_session($user_id, $plan_type, $amount, $currency, $return_url, $cancel_url);
            break;
            
        case 'tabby':
            $result = tweetscheduler_create_tabby_payment($user_id, $plan_type, $amount, $currency, $return_url, $cancel_url);
            break;
            
        case 'tamara':
            $result = tweetscheduler_create_tamara_payment($user_id, $plan_type, $amount, $currency, $return_url, $cancel_url);
            break;
            
        default:
            wp_send_json_error(__('Payment method not supported.', 'tweetscheduler'));
    }
    
    if (is_wp_error($result)) {
        wp_send_json_error($result->get_error_message());
    }
    
    wp_send_json_success($result);
}

/**
 * STC Pay Integration
 */
function tweetscheduler_create_stc_payment($user_id, $plan_type, $amount, $currency, $return_url, $cancel_url) {
    $stc_api_key = tweetscheduler_get_setting('stc_pay_api_key');
    $stc_merchant_id = tweetscheduler_get_setting('stc_pay_merchant_id');
    
    if (empty($stc_api_key) || empty($stc_merchant_id)) {
        return new WP_Error('stc_config', __('STC Pay not configured.', 'tweetscheduler'));
    }
    
    $user = get_user_by('ID', $user_id);
    $order_id = 'TS_' . $user_id . '_' . time();
    
    $payment_data = array(
        'MerchantId' => $stc_merchant_id,
        'BranchId' => '1',
        'TellerId' => '1',
        'DeviceId' => '1',
        'RefNum' => $order_id,
        'BillNumber' => $order_id,
        'Amount' => $amount,
        'CurrencyCode' => $currency,
        'Description' => sprintf(__('TweetScheduler Pro - %s Plan', 'tweetscheduler'), ucfirst($plan_type)),
        'ReturnUrl' => $return_url,
        'CancelUrl' => $cancel_url,
        'CustomerName' => $user->display_name,
        'CustomerEmail' => $user->user_email,
        'CustomerMobile' => get_user_meta($user_id, 'phone', true),
    );
    
    $response = wp_remote_post('https://api.stcpay.com.sa/DirectPayment/Payment', array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $stc_api_key,
            'Content-Type' => 'application/json',
        ),
        'body' => json_encode($payment_data),
        'timeout' => 30,
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error('stc_error', __('STC Pay connection failed.', 'tweetscheduler'));
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (isset($data['PaymentURL'])) {
        // Store payment session
        tweetscheduler_store_payment_session($order_id, $user_id, $plan_type, $amount, $currency, 'stc_pay', $data);
        
        return array(
            'payment_url' => $data['PaymentURL'],
            'order_id' => $order_id,
        );
    }
    
    return new WP_Error('stc_failed', __('Failed to create STC Pay session.', 'tweetscheduler'));
}

/**
 * HyperPay Integration (for Mada and Credit Cards)
 */
function tweetscheduler_create_hyperpay_payment($user_id, $plan_type, $amount, $currency, $payment_method, $return_url, $cancel_url) {
    $hyperpay_user_id = tweetscheduler_get_setting('hyperpay_user_id');
    $hyperpay_password = tweetscheduler_get_setting('hyperpay_password');
    $hyperpay_entity_id = tweetscheduler_get_setting('hyperpay_entity_id');
    
    if (empty($hyperpay_user_id) || empty($hyperpay_password) || empty($hyperpay_entity_id)) {
        return new WP_Error('hyperpay_config', __('HyperPay not configured.', 'tweetscheduler'));
    }
    
    $user = get_user_by('ID', $user_id);
    $order_id = 'TS_' . $user_id . '_' . time();
    
    $payment_data = array(
        'entityId' => $hyperpay_entity_id,
        'amount' => number_format($amount, 2, '.', ''),
        'currency' => $currency,
        'paymentType' => 'DB',
        'merchantTransactionId' => $order_id,
        'customer.email' => $user->user_email,
        'customer.givenName' => $user->display_name,
        'billing.street1' => 'N/A',
        'billing.city' => 'Riyadh',
        'billing.state' => 'Riyadh',
        'billing.country' => 'SA',
        'billing.postcode' => '12345',
        'shopperResultUrl' => $return_url,
        'defaultPaymentMethod' => $payment_method === 'mada' ? 'MADA' : 'VISA',
    );
    
    $response = wp_remote_post('https://test.oppwa.com/v1/checkouts', array(
        'headers' => array(
            'Authorization' => 'Bearer ' . base64_encode($hyperpay_user_id . ':' . $hyperpay_password),
            'Content-Type' => 'application/x-www-form-urlencoded',
        ),
        'body' => http_build_query($payment_data),
        'timeout' => 30,
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error('hyperpay_error', __('HyperPay connection failed.', 'tweetscheduler'));
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (isset($data['id'])) {
        // Store payment session
        tweetscheduler_store_payment_session($order_id, $user_id, $plan_type, $amount, $currency, 'hyperpay', $data);
        
        return array(
            'checkout_id' => $data['id'],
            'payment_url' => 'https://test.oppwa.com/v1/paymentWidgets.js?checkoutId=' . $data['id'],
            'order_id' => $order_id,
        );
    }
    
    return new WP_Error('hyperpay_failed', __('Failed to create HyperPay session.', 'tweetscheduler'));
}

/**
 * Tabby Integration
 */
function tweetscheduler_create_tabby_payment($user_id, $plan_type, $amount, $currency, $return_url, $cancel_url) {
    $tabby_public_key = tweetscheduler_get_setting('tabby_public_key');
    $tabby_secret_key = tweetscheduler_get_setting('tabby_secret_key');
    
    if (empty($tabby_public_key) || empty($tabby_secret_key)) {
        return new WP_Error('tabby_config', __('Tabby not configured.', 'tweetscheduler'));
    }
    
    $user = get_user_by('ID', $user_id);
    $order_id = 'TS_' . $user_id . '_' . time();
    
    $payment_data = array(
        'payment' => array(
            'amount' => number_format($amount, 2, '.', ''),
            'currency' => $currency,
            'description' => sprintf(__('TweetScheduler Pro - %s Plan', 'tweetscheduler'), ucfirst($plan_type)),
            'buyer' => array(
                'phone' => get_user_meta($user_id, 'phone', true) ?: '+966500000000',
                'email' => $user->user_email,
                'name' => $user->display_name,
            ),
            'shipping_address' => array(
                'city' => 'Riyadh',
                'address' => 'N/A',
                'zip' => '12345',
            ),
            'order' => array(
                'tax_amount' => '0.00',
                'shipping_amount' => '0.00',
                'discount_amount' => '0.00',
                'updated_at' => date('c'),
                'reference_id' => $order_id,
                'items' => array(
                    array(
                        'title' => sprintf(__('TweetScheduler Pro - %s Plan', 'tweetscheduler'), ucfirst($plan_type)),
                        'description' => sprintf(__('%s subscription plan', 'tweetscheduler'), ucfirst($plan_type)),
                        'quantity' => 1,
                        'unit_price' => number_format($amount, 2, '.', ''),
                        'reference_id' => $plan_type,
                        'product_url' => home_url('/subscription'),
                        'category' => 'Software',
                    ),
                ),
            ),
            'buyer_history' => array(
                'registered_since' => get_user_meta($user_id, 'user_registered', true),
                'loyalty_level' => 0,
            ),
            'order_history' => array(
                array(
                    'purchased_at' => date('c'),
                    'amount' => number_format($amount, 2, '.', ''),
                    'payment_method' => 'card',
                    'status' => 'new',
                ),
            ),
            'meta' => array(
                'order_id' => $order_id,
                'customer' => $user_id,
            ),
        ),
        'lang' => 'en',
        'merchant_code' => tweetscheduler_get_setting('tabby_merchant_code'),
        'merchant_urls' => array(
            'success' => $return_url,
            'cancel' => $cancel_url,
            'failure' => $cancel_url,
        ),
    );
    
    $response = wp_remote_post('https://api.tabby.ai/api/v2/checkout', array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $tabby_secret_key,
            'Content-Type' => 'application/json',
        ),
        'body' => json_encode($payment_data),
        'timeout' => 30,
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error('tabby_error', __('Tabby connection failed.', 'tweetscheduler'));
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (isset($data['payment']['id'])) {
        // Store payment session
        tweetscheduler_store_payment_session($order_id, $user_id, $plan_type, $amount, $currency, 'tabby', $data);
        
        return array(
            'payment_id' => $data['payment']['id'],
            'payment_url' => $data['payment']['web_url'],
            'order_id' => $order_id,
        );
    }
    
    return new WP_Error('tabby_failed', __('Failed to create Tabby session.', 'tweetscheduler'));
}

/**
 * Store Payment Session
 */
function tweetscheduler_store_payment_session($order_id, $user_id, $plan_type, $amount, $currency, $gateway, $gateway_data) {
    global $wpdb;
    $payments_table = $wpdb->prefix . 'tweetscheduler_payments';
    
    // Create payments table if it doesn't exist
    $wpdb->query("CREATE TABLE IF NOT EXISTS $payments_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        order_id varchar(100) NOT NULL,
        user_id bigint(20) NOT NULL,
        plan_type varchar(20) NOT NULL,
        amount decimal(10,2) NOT NULL,
        currency varchar(3) NOT NULL,
        gateway varchar(20) NOT NULL,
        gateway_data text DEFAULT NULL,
        status varchar(20) DEFAULT 'pending',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY order_id (order_id),
        KEY user_id (user_id),
        KEY status (status)
    ) {$wpdb->get_charset_collate()};");
    
    return $wpdb->insert(
        $payments_table,
        array(
            'order_id' => $order_id,
            'user_id' => $user_id,
            'plan_type' => $plan_type,
            'amount' => $amount,
            'currency' => $currency,
            'gateway' => $gateway,
            'gateway_data' => json_encode($gateway_data),
            'status' => 'pending',
        ),
        array('%s', '%d', '%s', '%f', '%s', '%s', '%s', '%s')
    );
}

/**
 * Handle Payment Success
 */
function tweetscheduler_handle_payment_success($order_id, $gateway_payment_id = null) {
    global $wpdb;
    $payments_table = $wpdb->prefix . 'tweetscheduler_payments';
    
    $payment = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $payments_table WHERE order_id = %s",
        $order_id
    ));
    
    if (!$payment || $payment->status === 'completed') {
        return false;
    }
    
    // Update payment status
    $wpdb->update(
        $payments_table,
        array(
            'status' => 'completed',
            'gateway_payment_id' => $gateway_payment_id,
        ),
        array('order_id' => $order_id),
        array('%s', '%s'),
        array('%s')
    );
    
    // Create/update subscription
    $result = tweetscheduler_create_subscription($payment->user_id, $payment->plan_type, $gateway_payment_id);
    
    if ($result) {
        // Generate invoice
        tweetscheduler_generate_invoice($payment->user_id, $payment->plan_type, $gateway_payment_id, $payment->amount);
        
        // Log analytics
        tweetscheduler_log_analytics($payment->user_id, 'payment_completed', array(
            'order_id' => $order_id,
            'plan_type' => $payment->plan_type,
            'amount' => $payment->amount,
            'gateway' => $payment->gateway,
        ));
        
        return true;
    }
    
    return false;
}

/**
 * Webhook Handlers
 */
function tweetscheduler_handle_stc_webhook() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (isset($data['RefNum']) && isset($data['Status'])) {
        if ($data['Status'] === 'Paid') {
            tweetscheduler_handle_payment_success($data['RefNum'], $data['PaymentId']);
        }
    }
    
    http_response_code(200);
    exit;
}

function tweetscheduler_handle_hyperpay_webhook() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (isset($data['merchantTransactionId']) && isset($data['result']['code'])) {
        // Success codes for HyperPay
        $success_codes = array('000.000.000', '000.000.100', '000.100.110', '000.100.111', '000.100.112');
        
        if (in_array($data['result']['code'], $success_codes)) {
            tweetscheduler_handle_payment_success($data['merchantTransactionId'], $data['id']);
        }
    }
    
    http_response_code(200);
    exit;
}

function tweetscheduler_handle_tabby_webhook() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (isset($data['payment']['order']['reference_id']) && isset($data['payment']['status'])) {
        if ($data['payment']['status'] === 'AUTHORIZED') {
            tweetscheduler_handle_payment_success($data['payment']['order']['reference_id'], $data['payment']['id']);
        }
    }
    
    http_response_code(200);
    exit;
}