<?php
/**
 * File Processor for Excel/CSV Uploads
 * 
 * @package TweetScheduler
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Process Uploaded File
 */
function tweetscheduler_process_uploaded_file($file_path, $user_id) {
    if (!file_exists($file_path)) {
        return new WP_Error('file_not_found', __('File not found.', 'tweetscheduler'));
    }
    
    $file_info = pathinfo($file_path);
    $extension = strtolower($file_info['extension']);
    
    switch ($extension) {
        case 'csv':
            return tweetscheduler_process_csv_file($file_path, $user_id);
            
        case 'xlsx':
        case 'xls':
            return tweetscheduler_process_excel_file($file_path, $user_id);
            
        default:
            return new WP_Error('unsupported_format', __('Unsupported file format. Please upload CSV or Excel files only.', 'tweetscheduler'));
    }
}

/**
 * Process CSV File
 */
function tweetscheduler_process_csv_file($file_path, $user_id) {
    $tweets = array();
    $errors = array();
    $row_number = 0;
    
    if (($handle = fopen($file_path, 'r')) !== FALSE) {
        // Skip header row
        $header = fgetcsv($handle, 1000, ',');
        $row_number++;
        
        // Validate header
        $expected_columns = array('content', 'scheduled_time');
        $optional_columns = array('media_urls', 'hashtags');
        
        if (!$header || count(array_intersect($expected_columns, array_map('strtolower', $header))) < count($expected_columns)) {
            fclose($handle);
            return new WP_Error('invalid_header', __('CSV file must contain at least "content" and "scheduled_time" columns.', 'tweetscheduler'));
        }
        
        // Map column indices
        $column_map = array();
        foreach ($header as $index => $column) {
            $column_map[strtolower(trim($column))] = $index;
        }
        
        while (($data = fgetcsv($handle, 1000, ',')) !== FALSE) {
            $row_number++;
            
            try {
                $tweet_data = tweetscheduler_parse_tweet_row($data, $column_map, $row_number);
                if ($tweet_data) {
                    $tweets[] = $tweet_data;
                }
            } catch (Exception $e) {
                $errors[] = array(
                    'row' => $row_number,
                    'error' => $e->getMessage(),
                );
            }
        }
        
        fclose($handle);
    } else {
        return new WP_Error('file_read_error', __('Could not read the CSV file.', 'tweetscheduler'));
    }
    
    return array(
        'tweets' => $tweets,
        'errors' => $errors,
        'total_rows' => $row_number - 1, // Exclude header
        'valid_tweets' => count($tweets),
        'error_count' => count($errors),
    );
}

/**
 * Process Excel File
 */
function tweetscheduler_process_excel_file($file_path, $user_id) {
    // Check if PhpSpreadsheet is available
    if (!class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
        // Try to include PhpSpreadsheet if available
        $spreadsheet_path = ABSPATH . 'wp-content/plugins/tweetscheduler/vendor/autoload.php';
        if (file_exists($spreadsheet_path)) {
            require_once $spreadsheet_path;
        } else {
            return new WP_Error('missing_library', __('Excel processing library not available. Please use CSV format instead.', 'tweetscheduler'));
        }
    }
    
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file_path);
        $worksheet = $spreadsheet->getActiveSheet();
        $highestRow = $worksheet->getHighestRow();
        $highestColumn = $worksheet->getHighestColumn();
        
        $tweets = array();
        $errors = array();
        
        // Get header row
        $header = array();
        for ($col = 'A'; $col <= $highestColumn; $col++) {
            $header[] = strtolower(trim($worksheet->getCell($col . '1')->getValue()));
        }
        
        // Validate header
        $expected_columns = array('content', 'scheduled_time');
        if (count(array_intersect($expected_columns, $header)) < count($expected_columns)) {
            return new WP_Error('invalid_header', __('Excel file must contain at least "content" and "scheduled_time" columns.', 'tweetscheduler'));
        }
        
        // Map column indices
        $column_map = array();
        foreach ($header as $index => $column) {
            $column_map[$column] = $index;
        }
        
        // Process data rows
        for ($row = 2; $row <= $highestRow; $row++) {
            try {
                $data = array();
                for ($col = 'A'; $col <= $highestColumn; $col++) {
                    $data[] = $worksheet->getCell($col . $row)->getValue();
                }
                
                $tweet_data = tweetscheduler_parse_tweet_row($data, $column_map, $row);
                if ($tweet_data) {
                    $tweets[] = $tweet_data;
                }
            } catch (Exception $e) {
                $errors[] = array(
                    'row' => $row,
                    'error' => $e->getMessage(),
                );
            }
        }
        
        return array(
            'tweets' => $tweets,
            'errors' => $errors,
            'total_rows' => $highestRow - 1, // Exclude header
            'valid_tweets' => count($tweets),
            'error_count' => count($errors),
        );
        
    } catch (Exception $e) {
        return new WP_Error('excel_processing_error', sprintf(__('Error processing Excel file: %s', 'tweetscheduler'), $e->getMessage()));
    }
}

/**
 * Parse Tweet Row Data
 */
function tweetscheduler_parse_tweet_row($data, $column_map, $row_number) {
    // Get content
    $content_index = isset($column_map['content']) ? $column_map['content'] : 0;
    $content = isset($data[$content_index]) ? trim($data[$content_index]) : '';
    
    if (empty($content)) {
        throw new Exception(sprintf(__('Row %d: Content is required.', 'tweetscheduler'), $row_number));
    }
    
    // Validate content length
    if (strlen($content) > 280) {
        throw new Exception(sprintf(__('Row %d: Content exceeds 280 characters.', 'tweetscheduler'), $row_number));
    }
    
    // Get scheduled time
    $time_index = isset($column_map['scheduled_time']) ? $column_map['scheduled_time'] : 1;
    $scheduled_time = isset($data[$time_index]) ? trim($data[$time_index]) : '';
    
    if (empty($scheduled_time)) {
        throw new Exception(sprintf(__('Row %d: Scheduled time is required.', 'tweetscheduler'), $row_number));
    }
    
    // Parse and validate scheduled time
    $parsed_time = tweetscheduler_parse_datetime($scheduled_time);
    if (!$parsed_time) {
        throw new Exception(sprintf(__('Row %d: Invalid date/time format. Use YYYY-MM-DD HH:MM or similar.', 'tweetscheduler'), $row_number));
    }
    
    // Check if time is in the future
    if (strtotime($parsed_time) <= time()) {
        throw new Exception(sprintf(__('Row %d: Scheduled time must be in the future.', 'tweetscheduler'), $row_number));
    }
    
    // Get optional fields
    $media_urls = '';
    if (isset($column_map['media_urls'])) {
        $media_index = $column_map['media_urls'];
        $media_urls = isset($data[$media_index]) ? trim($data[$media_index]) : '';
    }
    
    $hashtags = '';
    if (isset($column_map['hashtags'])) {
        $hashtags_index = $column_map['hashtags'];
        $hashtags = isset($data[$hashtags_index]) ? trim($data[$hashtags_index]) : '';
    }
    
    // Process media URLs
    $processed_media = array();
    if (!empty($media_urls)) {
        $urls = array_map('trim', explode(',', $media_urls));
        foreach ($urls as $url) {
            if (filter_var($url, FILTER_VALIDATE_URL)) {
                $processed_media[] = $url;
            }
        }
    }
    
    // Process hashtags
    $processed_hashtags = array();
    if (!empty($hashtags)) {
        $tags = array_map('trim', explode(',', $hashtags));
        foreach ($tags as $tag) {
            $tag = ltrim($tag, '#'); // Remove # if present
            if (!empty($tag)) {
                $processed_hashtags[] = '#' . $tag;
            }
        }
    }
    
    return array(
        'content' => $content,
        'scheduled_time' => $parsed_time,
        'media_urls' => !empty($processed_media) ? json_encode($processed_media) : null,
        'hashtags' => !empty($processed_hashtags) ? json_encode($processed_hashtags) : null,
        'row_number' => $row_number,
    );
}

/**
 * Parse DateTime from Various Formats
 */
function tweetscheduler_parse_datetime($datetime_string) {
    $formats = array(
        'Y-m-d H:i:s',
        'Y-m-d H:i',
        'Y/m/d H:i:s',
        'Y/m/d H:i',
        'd-m-Y H:i:s',
        'd-m-Y H:i',
        'd/m/Y H:i:s',
        'd/m/Y H:i',
        'm-d-Y H:i:s',
        'm-d-Y H:i',
        'm/d/Y H:i:s',
        'm/d/Y H:i',
        'Y-m-d',
        'Y/m/d',
        'd-m-Y',
        'd/m/Y',
        'm-d-Y',
        'm/d/Y',
    );
    
    foreach ($formats as $format) {
        $date = DateTime::createFromFormat($format, $datetime_string);
        if ($date !== false) {
            // If no time specified, set to current time + 1 hour
            if (strpos($format, 'H:i') === false) {
                $date->setTime(date('H') + 1, date('i'));
            }
            return $date->format('Y-m-d H:i:s');
        }
    }
    
    // Try strtotime as fallback
    $timestamp = strtotime($datetime_string);
    if ($timestamp !== false) {
        return date('Y-m-d H:i:s', $timestamp);
    }
    
    return false;
}

/**
 * Validate File Before Processing
 */
function tweetscheduler_validate_upload_file($file_path) {
    $errors = array();
    
    // Check file exists
    if (!file_exists($file_path)) {
        $errors[] = __('File not found.', 'tweetscheduler');
        return $errors;
    }
    
    // Check file size (5MB max)
    $file_size = filesize($file_path);
    if ($file_size > 5 * 1024 * 1024) {
        $errors[] = __('File size exceeds 5MB limit.', 'tweetscheduler');
    }
    
    // Check file type
    $file_info = pathinfo($file_path);
    $extension = strtolower($file_info['extension']);
    $allowed_extensions = array('csv', 'xlsx', 'xls');
    
    if (!in_array($extension, $allowed_extensions)) {
        $errors[] = __('Invalid file type. Only CSV and Excel files are allowed.', 'tweetscheduler');
    }
    
    // Check if file is readable
    if (!is_readable($file_path)) {
        $errors[] = __('File is not readable.', 'tweetscheduler');
    }
    
    return $errors;
}

/**
 * Generate Sample CSV Template
 */
function tweetscheduler_generate_sample_csv() {
    $filename = 'tweetscheduler-template.csv';
    $file_path = wp_upload_dir()['path'] . '/' . $filename;
    
    $sample_data = array(
        array('content', 'scheduled_time', 'media_urls', 'hashtags'),
        array(
            'Just launched our new feature! Check it out 🚀',
            date('Y-m-d H:i:s', strtotime('+1 hour')),
            'https://example.com/image1.jpg',
            '#launch, #newfeature, #excited'
        ),
        array(
            'Good morning everyone! Hope you have a great day ahead ☀️',
            date('Y-m-d H:i:s', strtotime('+2 hours')),
            '',
            '#goodmorning, #motivation'
        ),
        array(
            'Behind the scenes of our latest project. Hard work pays off! 💪',
            date('Y-m-d H:i:s', strtotime('+3 hours')),
            'https://example.com/image2.jpg, https://example.com/image3.jpg',
            '#behindthescenes, #hardwork, #team'
        ),
    );
    
    $file = fopen($file_path, 'w');
    foreach ($sample_data as $row) {
        fputcsv($file, $row);
    }
    fclose($file);
    
    return array(
        'file_path' => $file_path,
        'file_url' => wp_upload_dir()['url'] . '/' . $filename,
        'filename' => $filename,
    );
}

/**
 * Clean Up Temporary Files
 */
function tweetscheduler_cleanup_temp_files() {
    $upload_dir = wp_upload_dir()['path'];
    $files = glob($upload_dir . '/tweetscheduler-temp-*');
    
    foreach ($files as $file) {
        if (is_file($file) && (time() - filemtime($file)) > 3600) { // 1 hour old
            unlink($file);
        }
    }
}

// Schedule cleanup
if (!wp_next_scheduled('tweetscheduler_cleanup_temp_files')) {
    wp_schedule_event(time(), 'hourly', 'tweetscheduler_cleanup_temp_files');
}
add_action('tweetscheduler_cleanup_temp_files', 'tweetscheduler_cleanup_temp_files');

/**
 * AJAX Handler for File Processing
 */
function tweetscheduler_ajax_process_file() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'tweetscheduler_nonce')) {
        wp_send_json_error(__('Security check failed.', 'tweetscheduler'));
    }
    
    $user_id = get_current_user_id();
    if (!$user_id) {
        wp_send_json_error(__('User not logged in.', 'tweetscheduler'));
    }
    
    $file_url = esc_url_raw($_POST['file_url']);
    if (empty($file_url)) {
        wp_send_json_error(__('File URL is required.', 'tweetscheduler'));
    }
    
    // Download file to temp location
    $temp_file = download_url($file_url);
    if (is_wp_error($temp_file)) {
        wp_send_json_error(__('Failed to download file.', 'tweetscheduler'));
    }
    
    // Validate file
    $validation_errors = tweetscheduler_validate_upload_file($temp_file);
    if (!empty($validation_errors)) {
        unlink($temp_file);
        wp_send_json_error(implode(' ', $validation_errors));
    }
    
    // Process file
    $result = tweetscheduler_process_uploaded_file($temp_file, $user_id);
    
    // Clean up temp file
    unlink($temp_file);
    
    if (is_wp_error($result)) {
        wp_send_json_error($result->get_error_message());
    }
    
    wp_send_json_success($result);
}
add_action('wp_ajax_tweetscheduler_process_file', 'tweetscheduler_ajax_process_file');

/**
 * AJAX Handler for Sample CSV Download
 */
function tweetscheduler_ajax_download_sample() {
    $sample = tweetscheduler_generate_sample_csv();
    wp_send_json_success($sample);
}
add_action('wp_ajax_tweetscheduler_download_sample', 'tweetscheduler_ajax_download_sample');
add_action('wp_ajax_nopriv_tweetscheduler_download_sample', 'tweetscheduler_ajax_download_sample');