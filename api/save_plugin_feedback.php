<?php
/**
 * Save plugin feedback via Arina Feedback Service
 *
 * Forwards the feedback (and optional screenshot) to the external
 * Arina Feedback Service REST API instead of writing directly to
 * PostgreSQL / Azure Blob Storage.
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once __DIR__ . '/../../../config.php';

use local_lecturebot\CompanyConfig;

require_once __DIR__ . '/../config_api.php';

use local_lecturebot\exception\ValidationException;

// User must be logged in
require_login();
CompanyConfig::bootstrap($USER->id);
require_sesskey();

header('Content-Type: application/json');

/**
 * Map frontend category IDs to the values expected by the Arina Feedback Service.
 *
 * @param array $issueTypes Array of frontend category IDs
 * @return array Remapped category values
 */
function mapToApiCategories(array $issueTypes): array
{
    $map = [
        'generation'       => 'content_creation_issue',
        'workflow'         => 'usability_problem',
        'feature_requests' => 'enhancement_idea',
        'billing'          => 'subscription_and_billing',
    ];

    $mapped = [];
    foreach ($issueTypes as $type) {
        if (isset($map[$type])) {
            $mapped[] = $map[$type];
        } else {
            // Pass through unknown values so the API can validate them
            $mapped[] = $type;
        }
    }
    return $mapped;
}

try {
    // ----------------------------------------------------------------
    // 1. Parse & validate incoming form data
    // ----------------------------------------------------------------
    $hasFile        = isset($_FILES['screenshot']) && $_FILES['screenshot']['error'] !== UPLOAD_ERR_NO_FILE;
    $userId         = isset($_POST['user_id'])         ? trim($_POST['user_id'])         : null;
    $ownerId        = isset($_POST['owner_id'])         ? trim($_POST['owner_id'])         : null;
    $issueTypes     = isset($_POST['issue_types'])     ? $_POST['issue_types']           : null;
    $issueDesc      = isset($_POST['issue_description']) ? $_POST['issue_description']   : null;

    if (!$userId) {
        throw new ValidationException('Missing required field: user_id');
    }
    if (!$issueTypes) {
        throw new ValidationException('Missing required field: issue_types');
    }
    if (!$issueDesc || trim($issueDesc) === '') {
        throw new ValidationException('Missing required field: issue_description');
    }

    // issue_types may arrive JSON-encoded (array sent as JSON string)
    if (is_string($issueTypes)) {
        $issueTypes = json_decode($issueTypes, true);
    }
    if (!is_array($issueTypes) || empty($issueTypes)) {
        throw new ValidationException('issue_types must be a non-empty array');
    }

    // ----------------------------------------------------------------
    // 2. Remap category IDs to API values
    // ----------------------------------------------------------------
    $reportCategories = mapToApiCategories($issueTypes);

    // ----------------------------------------------------------------
    // 3. Build multipart/form-data body for cURL
    //    CURLFile handles proper multipart encoding for file uploads.
    // ----------------------------------------------------------------
    // 3. Validate optional screenshot up-front (before building body)
    // ----------------------------------------------------------------
    $screenshotTmpPath = null;
    $screenshotMime    = null;
    $screenshotName    = null;

    if ($hasFile && $_FILES['screenshot']['error'] === UPLOAD_ERR_OK) {
        $file     = $_FILES['screenshot'];
        $finfo    = finfo_open(FILEINFO_MIME_TYPE);
        $detectedMime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!in_array($detectedMime, $allowedMimes)) {
            throw new ValidationException('Invalid screenshot type. Allowed: png, jpeg, jpg, webp.');
        }
        if ($file['size'] > 1 * 1024 * 1024) {
            throw new ValidationException('Screenshot too large. Maximum size is 1 MB.');
        }

        $screenshotTmpPath = $file['tmp_name'];
        $screenshotMime    = $detectedMime;
        $screenshotName    = $file['name'];
    }

    // ----------------------------------------------------------------
    // 4. Build a raw multipart/form-data body.
    //
    //    PHP's cURL cannot send repeated identical keys when using an
    //    associative array for CURLOPT_POSTFIELDS, and FastAPI does NOT
    //    understand the bracket notation (report_categories[0]=...).
    //    The only correct approach is to construct the multipart body
    //    manually so we can add one part per category.
    // ----------------------------------------------------------------
    $boundary = '----LectureBotBoundary' . bin2hex(random_bytes(8));
    $eol      = "\r\n";
    $body     = '';

    // Helper closure to add a plain text field
    $addField = function (string $name, string $value) use (&$body, $boundary, $eol): void {
        $body .= "--{$boundary}{$eol}";
        $body .= "Content-Disposition: form-data; name=\"{$name}\"{$eol}{$eol}";
        $body .= "{$value}{$eol}";
    };

    $addField('tenant_id', $ownerId);
    $addField('user_id', $userId);
    $addField('description', trim($issueDesc));

    // Repeat report_categories for each value — FastAPI reads them as a list
    foreach ($reportCategories as $cat) {
        $addField('report_categories', $cat);
    }

    // Add file part if present
    if ($screenshotTmpPath !== null) {
        $fileContents = file_get_contents($screenshotTmpPath);
        $body .= "--{$boundary}{$eol}";
        $body .= "Content-Disposition: form-data; name=\"screenshot\"; filename=\"{$screenshotName}\"{$eol}";
        $body .= "Content-Type: {$screenshotMime}{$eol}{$eol}";
        $body .= $fileContents . $eol;
    }

    $body .= "--{$boundary}--{$eol}";

    // ----------------------------------------------------------------
    // 5. Execute cURL request to Arina Feedback Service
    // ----------------------------------------------------------------
    $apiKey = CompanyConfig::getApiKey();
    $ch = curl_init(LECTUREBOT_FEEDBACK_SERVICE_URL);

    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER     => [
            "Content-Type: multipart/form-data; boundary={$boundary}",
            'Content-Length: ' . strlen($body),
            'X-Api-key: ' . $apiKey,
        ],
    ]);

    $responseBody = curl_exec($ch);
    $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError    = curl_error($ch);
    curl_close($ch);

    // ----------------------------------------------------------------
    // 5. Handle response
    // ----------------------------------------------------------------
    if ($curlError) {
        error_log('Feedback Service cURL error: ' . $curlError);
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'error'   => 'Could not reach feedback service: ' . $curlError,
        ]);
        exit;
    }

    // 201 = Created (success), anything else is an error
    if ($httpCode === 201) {
        $apiResponse = json_decode($responseBody, true);
        error_log(sprintf(
            'Plugin feedback submitted successfully. Service ID: %s, User: %s, Tenant: %s',
            $apiResponse['id'] ?? 'unknown',
            $userId,
            $ownerId
        ));
        echo json_encode([
            'success'     => true,
            'feedback_id' => $apiResponse['id'] ?? null,
            'message'     => 'Feedback submitted successfully',
        ]);
    } else {
        error_log(sprintf(
            'Feedback Service returned HTTP %d. Body: %s',
            $httpCode,
            substr($responseBody, 0, 500)
        ));
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error'   => "Feedback service returned HTTP {$httpCode}.",
        ]);
    }

} catch (ValidationException $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
} catch (Exception $e) {
    error_log('Error in save_plugin_feedback: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ]);
}
