<?php
/**
 * Lightweight session-check endpoint.
 *
 * Used by the React frontend to verify the Moodle session is still valid
 * before opening modals or loading media. Returns HTTP 200 + JSON on success.
 * If the session has expired, Moodle's require_login() throws and the response
 * will contain the standard Moodle AJAX error (errorcode: requireloginerror)
 * which apiFetch detects and redirects to the login page.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');

header('Content-Type: application/json');

require_login();

// Release the session lock immediately — this endpoint does no writes.
\core\session\manager::write_close();

echo json_encode(['success' => true]);
