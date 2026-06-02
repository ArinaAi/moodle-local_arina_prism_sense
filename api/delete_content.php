<?php

/**
 * Soft-delete generated content and (for video) remove files from the Azure
 * bucket via the backend delete_video API.
 *
 * The database record is preserved with isdeleted = 1 so it can be audited
 * or restored later. No rows are physically removed.
 *
 * @package    local_arina_prism_sense
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../config_api.php');

use local_arina_prism_sense\CompanyConfig;
use local_arina_prism_sense\exception\content_deletion_exception;
use local_arina_prism_sense\exception\curl_execution_exception;
use local_arina_prism_sense\exception\api_http_exception;

$contentid = required_param('contentid', PARAM_INT);
require_login();

header('Content-Type: application/json');

try {
    // Load the content record.
    $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentid], '*', MUST_EXIST);

    // Permission check.
    $context = context_course::instance($content->courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);
    require_sesskey();

    $generationData = json_decode($content->generationdata, true) ?: [];

    // ── Video: delete files from Azure bucket via backend API ─────────────────
    $bucketDeletionResult = null;
    if ($content->contenttype === 'video') {
        CompanyConfig::bootstrap($USER->id);
        $orgId = CompanyConfig::getOrgId();

        if (empty($orgId)) {
            throw new content_deletion_exception('Organisation ID is not configured. Cannot delete video from bucket.');
        }

        $language   = $generationData['language']    ?? 'en';
        $regenCount = $generationData['regen_count']  ?? 0;

        $deleteUrl = API_DELETE_VIDEO
            . '?organization_id=' . urlencode($orgId)
            . '&course_id='       . urlencode((string) $content->courseid)
            . '&chapter_id='      . urlencode((string) $content->sectionid)
            . '&regen_count='     . urlencode((string) $regenCount)
            . '&language='        . urlencode($language);

        $apiKey = CompanyConfig::getApiKey();

        $ch = curl_init($deleteUrl);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $apiResponse = curl_exec($ch);
        $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError   = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log('ArinaPrismSense delete_video curl error for content ' . $contentid . ': ' . $curlError);
            throw new curl_execution_exception('Failed to connect to video deletion service: ' . $curlError);
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            error_log(
                'ArinaPrismSense delete_video HTTP ' . $httpCode .
                ' for content ' . $contentid . ': ' . $apiResponse
            );
            throw new api_http_exception('Video deletion service returned HTTP ' . $httpCode);
        }

        $bucketDeletionResult = json_decode($apiResponse, true);
        error_log('ArinaPrismSense: delete_video bucket response for content ' . $contentid . ': ' . $apiResponse);
    }

    // ── Soft-delete: mark the record instead of removing it ──────────────────
    $DB->update_record(
        'local_arina_prism_sense_content',
        (object) [
            'id'           => $contentid,
            'isdeleted'    => 1,
            'timemodified' => time(),
        ]
    );

    error_log('ArinaPrismSense: Soft-deleted content ' . $contentid . ' (type: ' . $content->contenttype . ')');

    echo json_encode([
        'status'          => 'success',
        'message'         => 'Content deleted successfully.',
        'contentid'       => $contentid,
        'bucket_deletion' => $bucketDeletionResult,
    ]);
} catch (Exception $e) {
    error_log('ArinaPrismSense delete_content error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error'  => $e->getMessage(),
    ]);
}
