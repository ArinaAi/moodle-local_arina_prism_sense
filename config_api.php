<?php

/**
 * PRISM Sense API Configuration
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Capability constants - change here to update across all plugin files.
define('CAPABILITY_GENERATE_CONTENT', 'local/arina_prism_sense:generatecontent');

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
            if (!empty($name)) {
                putenv("$name=$value");
                $_ENV[$name] = $value;
            }
        }
    }
}

// API Base URL - Change this in .env file for different environments.
// Set to the root host, e.g. https://demo.arina.ai/dev2230 — all service
// paths are appended below, so only this one value needs updating to switch environments.
define('API_BASE_URL', rtrim(getenv('ARINA_PRISM_SENSE_API_BASE_URL') ?: 'https://app.arina.ai', '/'));

if (isset($CFG->wwwroot)
    && strpos($CFG->wwwroot, 'http://localhost') === 0
    && strpos(API_BASE_URL, 'https://app.arina.ai') !== false) {
    throw new \moodle_exception(
        'Production API cannot be used while debugging is enabled.'
    );
}

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
// Base URL for per-upload retry and delete operations.
// Full URL is built dynamically: API_BATCH_UPLOADS_BASE . '/{org_id}/uploads/{upload_id}[/retry]'
define('API_BATCH_UPLOADS_BASE', BOT_BASE_URL . '/batches');

// ── Agent / message bus ───────────────────────────────────────────────────────
define('API_CHECK_STATUS_BATCH', API_BASE_URL . '/service/arina_message_bus_status_service/status/batch');

// ── Asset download gateway ────────────────────────────────────────────────────
define('API_DOWNLOAD_ASSET', API_BASE_URL . '/service/arina-url-gateway-service/api/v1/assets/download');

// ── Feedback service ──────────────────────────────────────────────────────────
define('FEEDBACK_BASE_URL', API_BASE_URL . '/service/arina-customer-feedback-service/api/prism_sense');
define('FEEDBACK_SERVICE_URL', FEEDBACK_BASE_URL . '/feedback');
define('CONTENT_REGEN_FEEDBACK_URL', FEEDBACK_BASE_URL . '/content-regeneration/feedback');

// ── Credit service ────────────────────────────────────────────────────────────
define('CREDIT_SERVICE_URL', API_BASE_URL . '/service/arina-credit-service');

// ── IOMAD / Org-management service ───────────────────────────────────────────
define('IOMAD_SERVICE_URL', API_BASE_URL . '/service/arina_iomad_service');

// ── Auth service ──────────────────────────────────────────────────────────────
define('AUTH_SERVICE_URL', API_BASE_URL . '/service/arina_auth_service/validate');

// Default video length (in minutes)
define('DEFAULT_VIDEO_LENGTH', 2);

// ── Third-party external services ─────────────────────────────────────────────
define('EXCHANGE_RATES_URL', 'https://open.er-api.com/v6/latest/USD');

// API timeout settings (in seconds)
define('API_TIMEOUT', 0); // Infinite timeout for generation (handled by cron)

// Developer Mode (Set to true to bypass external API for testing)
defined('DEVELOPER_MODE') || define('DEVELOPER_MODE', false);
define('API_CONNECT_TIMEOUT', 30); // 30 seconds to establish connection

// Backend PDF Upload - Set to false to disable backend upload for testing

define('ENABLE_BACKEND_PDF_UPLOAD', true);
