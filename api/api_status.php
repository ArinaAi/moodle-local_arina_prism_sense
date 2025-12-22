<?php
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/filelib.php');

// Define constants to avoid duplication
define('CONTENT_TYPE_JSON', 'Content-Type: application/json');
define('EXTERNAL_API_URL', 'https://bots.arina.ai/tutorial_generation/start');

// Define custom exceptions
class CurlException extends Exception
{

}
class ApiException extends Exception
{

}

try {
    $courseid = required_param('courseid', PARAM_INT);
    require_login($courseid);

    // Check permissions
    $context = context_course::instance($courseid);
    require_capability('moodle/course:update', $context);

    // Call the external bot status API
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => EXTERNAL_API_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            CONTENT_TYPE_JSON,
        ]
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new CurlException('CURL Error: ' . $error);
    }

    if ($http_code !== 200) {
        throw new ApiException('External API returned: ' . $http_code);
    }

    // Return the external API response
    header(CONTENT_TYPE_JSON);
    echo $response;

} catch (CurlException $e) {
    http_response_code(500);
    header(CONTENT_TYPE_JSON);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'curl_error'
    ]);
} catch (ApiException $e) {
    http_response_code(502);
    header(CONTENT_TYPE_JSON);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'api_error'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    header(CONTENT_TYPE_JSON);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'type' => 'general_error'
    ]);
}
