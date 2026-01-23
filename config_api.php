<?php
/**
 * LectureBot API Configuration
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Load environment variables from .env file
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if (!empty($name) && !isset($_ENV[$name])) {
                putenv("$name=$value");
                $_ENV[$name] = $value;
            }
        }
    }
}

// API Base URL - Change this in .env file for different environments
define('LECTUREBOT_API_BASE_URL', getenv('LECTUREBOT_API_BASE_URL') ?: 'https://bots.arina.ai/tutorial_generation');

// API Endpoints
define('LECTUREBOT_API_GENERATE_PPTX', LECTUREBOT_API_BASE_URL . '/generate_pptx');
define('LECTUREBOT_API_GENERATE_VIDEO', LECTUREBOT_API_BASE_URL . '/generate_video');
define('LECTUREBOT_API_UPLOAD_PDF', LECTUREBOT_API_BASE_URL . '/uploadpdf');
define('LECTUREBOT_API_UPLOAD', LECTUREBOT_API_BASE_URL . '/upload');
define('LECTUREBOT_API_STATUS', LECTUREBOT_API_BASE_URL . '/status');
define('LECTUREBOT_API_CHECK_STATUS', LECTUREBOT_API_BASE_URL . '/check_status');
define('LECTUREBOT_API_START_BATCH_UPLOAD', LECTUREBOT_API_BASE_URL . '/start_batch_upload');
define('LECTUREBOT_API_CHECK_BATCH_STATUS', LECTUREBOT_API_BASE_URL . '/check_batch_status');

// Default video length (in minutes)
define('LECTUREBOT_DEFAULT_VIDEO_LENGTH', 2);

// API timeout settings (in seconds)
define('LECTUREBOT_API_TIMEOUT', 0); // Infinite timeout for generation (handled by cron)

// Developer Mode (Set to true to bypass external API for testing)
defined('DEVELOPER_MODE') || define('DEVELOPER_MODE', false);
define('LECTUREBOT_API_CONNECT_TIMEOUT', 30); // 30 seconds to establish connection

// Backend PDF Upload - Set to false to disable backend upload for testing

define('LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD', true);
