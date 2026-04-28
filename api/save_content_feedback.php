<?php

/**
 * Save user feedback for content regeneration via Arina Feedback Service
 *
 * Forwards structured regeneration feedback to the external
 * Arina Customer Feedback Service REST API.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once __DIR__ . '/../../../config.php';

use local_arina_prism_sense\CompanyConfig;

require_once __DIR__ . '/../config_api.php';

// User must be logged in
require_login();
CompanyConfig::bootstrap($USER->id);
require_sesskey();

header('Content-Type: application/json');

/**
 * Map a video_length value (string of minutes) to the API mode label.
 *
 * Values come from the CurriculumModal radio group:
 *   '5'  → Express
 *   '15' → Standard
 *   '30' → Extensive
 *   '45' → Deep Dive
 *
 * @param string|null $videoLength The stored video_length value
 * @return string The corresponding mode label
 */
function mapVideoLengthToMode(?string $videoLength): string
{
    $map = [
        '5' => 'Express',
        '15' => 'Standard',
        '30' => 'Extensive',
    ];
    return $map[$videoLength] ?? 'Standard';
}

try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!$input || !isset($input['contentid'])) {
        throw new invalid_parameter_exception('Invalid request: Missing content ID');
    }

    $contentid = (int) $input['contentid'];

    // Load content record to get course info, video_length, and verify access
    $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentid], '*', MUST_EXIST);

    $context = context_course::instance($content->courseid);
    require_capability(CAPABILITY_GENERATE_CONTENT, $context);

    // ----------------------------------------------------------------
    // 1. Read all feedback fields
    // ----------------------------------------------------------------
    $selectedCategories = $input['selected_categories'] ?? [];
    $topicsNeedingDepth = $input['topics_needing_depth'] ?? [];
    $topicsOverexplained = $input['topics_overexplained'] ?? [];
    $extraTopics = $input['extra_topics'] ?? [];
    $missingSubtopics = $input['missing_subtopics'] ?? [];
    $reorderedFlow = $input['reordered_flow'] ?? [];

    // feedback_type = comma-joined selected category IDs (e.g. "topics_need_depth,confusing_flow")
    $feedbackType = !empty($selectedCategories)
        ? implode(',', $selectedCategories)
        : ($input['feedback_type'] ?? 'structured');

    // mode = derived from video_length stored on the content record
    // generationdata is JSON; video_length may also be a top-level column
    $videoLength = null;
    if (!empty($content->generationdata)) {
        $genData = json_decode($content->generationdata, true);
        $videoLength = $genData['video_length'] ?? null;
    }
    // Fall back to direct column if available
    if ($videoLength === null && isset($content->video_length)) {
        $videoLength = $content->video_length;
    }
    // Also allow the caller to override it explicitly
    if (!empty($input['video_length'])) {
        $videoLength = $input['video_length'];
    }

    $mode = mapVideoLengthToMode($videoLength);

    // ----------------------------------------------------------------
    // 2. Build JSON payload for the Arina Content-Regen Feedback API
    // ----------------------------------------------------------------
    $payload = [
        'tenant_id' => CompanyConfig::getOrgId() ?: '0',   // key kept as-is until Python backend is updated
        'user_id' => (string) $USER->id,
        'contentid' => (string) $contentid,
        'feedback_type' => $feedbackType,
        'mode' => $mode,
        'generation_type' => 'slide-regen',
        'topics_needing_depth' => $topicsNeedingDepth,
        'topics_overexplained' => $topicsOverexplained,
        'extra_topics' => $extraTopics,
        'missing_subtopics' => $missingSubtopics,
        'reordered_flow' => $reorderedFlow,
        'selected_categories' => $selectedCategories,
    ];

    // ----------------------------------------------------------------
    // 3. POST to Arina Feedback Service
    // ----------------------------------------------------------------
    $apiKey = CompanyConfig::getApiKey();
    $ch = curl_init(CONTENT_REGEN_FEEDBACK_URL);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-Api-key: ' . $apiKey,
        ],
    ]);

    $responseBody = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        error_log('Content Regen Feedback cURL error: ' . $curlError);
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'error' => 'Could not reach feedback service: ' . $curlError,
        ]);
        exit;
    }

    if ($httpCode === 201) {
        $apiResponse = json_decode($responseBody, true);
        $feedbackId = $apiResponse['id'] ?? null;

        error_log(sprintf(
            'Content regen feedback saved. Service ID: %s, ContentID: %d, User: %d, Mode: %s',
            $feedbackId,
            $contentid,
            $USER->id,
            $mode
        ));

        echo json_encode([
            'success' => true,
            'feedback_id' => $feedbackId,
            'message' => 'Feedback saved successfully',
        ]);
    } else {
        error_log(sprintf(
            'Content Regen Feedback Service returned HTTP %d. Body: %s',
            $httpCode,
            substr($responseBody, 0, 500)
        ));
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => "Feedback service returned HTTP {$httpCode}.",
        ]);
    }
} catch (Exception $e) {
    error_log('ArinaPrismSense Content Feedback Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
