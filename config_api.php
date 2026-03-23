<?php
/**
 * LectureBot API Configuration
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Capability constants - change here to update across all plugin files.
define('CAPABILITY_GENERATE_CONTENT', 'local/lecturebot:generatecontent');

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

// API Base URL - Change this in .env file for different environments.
// Set to the root host, e.g. https://demo.arina.ai/dev2230 — all service
// paths are appended below, so only this one value needs updating to switch environments.
define('API_BASE_URL', rtrim(getenv('LECTUREBOT_API_BASE_URL') ?: 'https://demo.arina.ai/dev2230', '/'));

// ── Bot / tutorial generation service ────────────────────────────────────────
define('BOT_BASE_URL', API_BASE_URL . '/bots/tutorial_generation');
define('API_GENERATE_PPTX', BOT_BASE_URL . '/generate_pptx');
define('API_GENERATE_VIDEO', BOT_BASE_URL . '/generate_video');
define('API_UPLOAD_PDF', BOT_BASE_URL . '/uploadpdf');
define('API_UPLOAD', BOT_BASE_URL . '/upload');
define('API_STATUS', BOT_BASE_URL . '/status');
define('API_CHECK_STATUS', BOT_BASE_URL . '/check_status');
define('API_START_BATCH_UPLOAD', BOT_BASE_URL . '/start_batch_upload');
define('API_DELETE_DOCUMENT', BOT_BASE_URL . '/delete_document');
define('API_CHECK_BATCH_STATUS', BOT_BASE_URL . '/check_batch_status');
define('API_TRIGGER_GENERATION', BOT_BASE_URL . '/trigger_generation');

// ── Agent / message bus ───────────────────────────────────────────────────────
define('API_CHECK_STATUS_BATCH', API_BASE_URL . '/agents/arina-message-bus-status-service/status/batch');

// ── Asset download gateway ────────────────────────────────────────────────────
define('API_DOWNLOAD_ASSET', API_BASE_URL . '/service/arina-url-gateway-service/api/v1/assets/download');

// ── Feedback service ──────────────────────────────────────────────────────────
define('FEEDBACK_BASE_URL', API_BASE_URL . '/service/arina-customer-feedback-service/api/prism_sense');
define('FEEDBACK_SERVICE_URL', FEEDBACK_BASE_URL . '/feedback');
define('CONTENT_REGEN_FEEDBACK_URL', FEEDBACK_BASE_URL . '/content-regeneration/feedback');

// ── Credit service ────────────────────────────────────────────────────────────
define('CREDIT_SERVICE_URL', API_BASE_URL . '/service/arina-credit-service');

// ── Auth service ──────────────────────────────────────────────────────────────
define('AUTH_SERVICE_URL', API_BASE_URL . '/service/arina_auth_service/validate');

// Default video length (in minutes)
define('DEFAULT_VIDEO_LENGTH', 2);

// API timeout settings (in seconds)
define('API_TIMEOUT', 0); // Infinite timeout for generation (handled by cron)

// Developer Mode (Set to true to bypass external API for testing)
defined('DEVELOPER_MODE') || define('DEVELOPER_MODE', false);
define('API_CONNECT_TIMEOUT', 30); // 30 seconds to establish connection

// Backend PDF Upload - Set to false to disable backend upload for testing

define('ENABLE_BACKEND_PDF_UPLOAD', true);
