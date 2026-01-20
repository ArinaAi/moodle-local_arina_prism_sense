<?php
/**
 * LectureBot API Configuration
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// API Base URL - Change this for different environments
define('LECTUREBOT_API_BASE_URL', 'https://bots.arina.ai/tutorial_generation');

// API Endpoints
define('LECTUREBOT_API_GENERATE_PPTX', LECTUREBOT_API_BASE_URL . '/generate_pptx');
define('LECTUREBOT_API_GENERATE_VIDEO', LECTUREBOT_API_BASE_URL . '/generate_video');
define('LECTUREBOT_API_UPLOAD_PDF', LECTUREBOT_API_BASE_URL . '/uploadpdf');
define('LECTUREBOT_API_UPLOAD', LECTUREBOT_API_BASE_URL . '/upload');
define('LECTUREBOT_API_STATUS', LECTUREBOT_API_BASE_URL . '/status');
define('LECTUREBOT_API_CHECK_STATUS', LECTUREBOT_API_BASE_URL . '/check_status');

// Default video length (in minutes)
define('LECTUREBOT_DEFAULT_VIDEO_LENGTH', 2);

// API timeout settings (in seconds)
define('LECTUREBOT_API_TIMEOUT', 0); // Infinite timeout for generation (handled by cron)

// Developer Mode (Set to true to bypass external API for testing)
defined('DEVELOPER_MODE') || define('DEVELOPER_MODE', false);
define('LECTUREBOT_API_CONNECT_TIMEOUT', 30); // 30 seconds to establish connection

// Backend PDF Upload - Set to false to disable backend upload for testing

define('LECTUREBOT_ENABLE_BACKEND_PDF_UPLOAD', true);
