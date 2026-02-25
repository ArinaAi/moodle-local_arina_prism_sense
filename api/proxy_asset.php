<?php
/**
 * Moodle-side proxy for BFF assets (slide images, etc.)
 *
 * Fetches the requested asset from the BFF using the X-Api-key header
 * and streams the response back to the browser. This allows <img> tags
 * and other browser-side resources to authenticate without exposing the
 * API key in the URL.
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// NO_DEBUG_DISPLAY: suppress any PHP/Moodle debug output that would corrupt binary response
define('NO_DEBUG_DISPLAY', true);

// Buffer all output so we can discard anything Moodle prints before we send our image
ob_start();

require_once __DIR__ . '/../../../config.php';
require_once __DIR__ . '/../config_api.php';

require_login(null, false);

$blobPath      = required_param('blob_path', PARAM_TEXT);
$containerName = required_param('container', PARAM_TEXT);

$apiKey = get_config('local_lecturebot', 'api_key');
if (empty($apiKey)) {
    ob_end_clean();
    http_response_code(500);
    error_log('LectureBot proxy_asset: API key is not configured.');
    exit;
}

// Build the BFF URL (api_key goes in the header, not the query string)
$bffUrl = LECTUREBOT_API_DOWNLOAD_ASSET
    . '?blob_path=' . urlencode($blobPath)
    . '&container=' . urlencode($containerName);

$ch = curl_init($bffUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,   // Follow HTTP→HTTPS 301 redirects
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_HTTPHEADER     => ["X-Api-key: {$apiKey}"],
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
]);

$body       = curl_exec($ch);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$mimeType   = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$curlErrNo  = curl_errno($ch);
$curlErrMsg = curl_error($ch);
curl_close($ch);

// Discard everything Moodle may have buffered before we send binary data
ob_end_clean();

if ($curlErrNo) {
    error_log('LectureBot proxy_asset cURL error: ' . $curlErrMsg . ' | URL: ' . $bffUrl);
    http_response_code(502);
    exit;
}

if ($httpCode !== 200) {
    error_log('LectureBot proxy_asset: BFF returned HTTP ' . $httpCode . ' | URL: ' . $bffUrl);
    http_response_code($httpCode);
    exit;
}

// Send the image to the browser
header('Content-Type: ' . ($mimeType ?: 'image/png'));
header('Content-Length: ' . strlen($body));
header('Cache-Control: public, max-age=3600');
echo $body;
exit;
