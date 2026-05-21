<?php

/**
 * Proxy: check whether Weaviate content has been duplicated for a course.
 *
 * Returns { content_ready: bool, uploads_required: bool } from the IOMAD service.
 * When uploads_required=false the frontend skips the PDF-upload flow entirely and
 * calls generate_content.php with uploads_required=false.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../config.php'); // NOSONAR
require_once(__DIR__ . '/../config_api.php'); // NOSONAR

use local_arina_prism_sense\CompanyConfig;

$courseid = required_param('courseid', PARAM_INT);
require_login($courseid, false);
require_sesskey();

$context = context_course::instance($courseid);
require_capability(CAPABILITY_GENERATE_CONTENT, $context);

CompanyConfig::bootstrap($USER->id);

$PAGE->set_context($context);
session_write_close();

header('Content-Type: application/json');

try {
    $orgId = CompanyConfig::getOrgId();
    if (empty($orgId)) {
        // No org configured — treat as normal (uploads required).
        echo json_encode(['content_ready' => false, 'uploads_required' => true]);
        exit;
    }

    $apiKey = CompanyConfig::getApiKey();
    if (empty($apiKey)) {
        echo json_encode(['content_ready' => false, 'uploads_required' => true]);
        exit;
    }

    $statusUrl = IOMAD_SERVICE_URL . '/weaviate/course-content-status?' . http_build_query([
        'org_id'    => $orgId,
        'course_id' => $courseid,
    ], '', '&', PHP_QUERY_RFC3986);

    $ch = curl_init($statusUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER     => [
            'X-Api-Key: ' . $apiKey,
            'Accept: application/json',
        ],
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError || $httpCode !== 200) {
        // Network or upstream error — safe fallback: treat as normal upload flow.
        error_log('ArinaPrismSense get_course_content_status: upstream error ' .
            "HTTP $httpCode curlErr=$curlError");
        echo json_encode(['content_ready' => false, 'uploads_required' => true]);
        exit;
    }

    $data = json_decode($response, true);
    if (!is_array($data) || !isset($data['uploads_required'])) {
        error_log('ArinaPrismSense get_course_content_status: unexpected response: ' . $response);
        echo json_encode(['content_ready' => false, 'uploads_required' => true]);
        exit;
    }

    echo json_encode([
        'content_ready'    => (bool) ($data['content_ready']    ?? false),
        'uploads_required' => (bool) ($data['uploads_required'] ?? true),
    ]);
} catch (Exception $e) {
    error_log('ArinaPrismSense get_course_content_status: ' . $e->getMessage());
    // On any exception fall back to the safe default so existing flow is unaffected.
    echo json_encode(['content_ready' => false, 'uploads_required' => true]);
}
