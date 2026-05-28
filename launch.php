<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.
require_once('../../config.php');
require_once($CFG->libdir . '/adminlib.php');

// Ensure Utils is loaded
require_once(__DIR__ . '/classes/Utils.php');
require_once(__DIR__ . '/classes/CompanyConfig.php');
require_once(__DIR__ . '/config_api.php');


$courseid = required_param('courseid', PARAM_INT);
require_login($courseid);

// Bootstrap per-company config FIRST so getApiKey() returns the correct per-company
// value for IOMAD installs (falls back to global config on standalone Moodle).
\local_arina_prism_sense\CompanyConfig::bootstrap($USER->id);

// Validate API key before allowing access to the plugin
$apiKey = \local_arina_prism_sense\CompanyConfig::getApiKey();
$validationFailed = false;
$errorMessage = '';
$isNetworkError = false;

if (empty($apiKey)) {
    $validationFailed = true;
    $errorMessage = 'API key is not configured. Please add your API key in the plugin settings.';
} else {
    // Cache validation result in the user session for 5 minutes to avoid a
    // round-trip to the auth service on every page load.
    $cacheKey    = 'arina_apikey_valid_' . hash('sha256', $apiKey);
    $cachedResult = isset($_SESSION[$cacheKey]) ? $_SESSION[$cacheKey] : null;
    $cacheExpiry  = isset($_SESSION[$cacheKey . '_ts']) ? $_SESSION[$cacheKey . '_ts'] : 0;

    if ($cachedResult === null || (time() - $cacheExpiry) > 300) {
        // Validate API key against Arina auth service
        $validateUrl = AUTH_SERVICE_URL;

        $ch = curl_init($validateUrl);
        curl_setopt_array($ch, [
            CURLOPT_HTTPHEADER     => ["X-API-Key: {$apiKey}"],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,   // fail fast if host is unreachable
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_FOLLOWLOCATION => true,
        ]);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($httpCode === 200) {
            // Valid — cache success.
            $cachedResult = true;
            $_SESSION[$cacheKey]         = true;
            $_SESSION[$cacheKey . '_ts'] = time();
        } elseif ($httpCode === 401) {
            // Confirmed invalid key — cache and block.
            $cachedResult = false;
            $_SESSION[$cacheKey]         = false;
            $_SESSION[$cacheKey . '_ts'] = time();
            error_log('ArinaPrismSense API key validation failed: HTTP 401 (Invalid API key)');
        } else {
            // cURL error, timeout, or unexpected HTTP status.
            // If a prior successful validation is cached, honour it (protects against
            // intermittent network hiccups for users whose key is already known-good).
            // Otherwise treat as a hard failure — we cannot confirm the key is valid.
            if ($cachedResult !== true) {
                $cachedResult = false;  // force block; do NOT persist to session so we retry next load
            }
            error_log('ArinaPrismSense API key validation network error: '
                . "HTTP {$httpCode} curlErr={$curlError}");
        }
    }

    // Block unless we have a confirmed (cached or fresh) valid result.
    if ($cachedResult !== true) {
        $validationFailed = true;
        if ($cachedResult === false && isset($_SESSION[$cacheKey]) && $_SESSION[$cacheKey] === false) {
            $errorMessage = 'API key is invalid or incorrect. Please check your plugin settings.';
        } else {
            $isNetworkError = true;
            $errorMessage = 'The Arina validation service is temporarily unavailable. '
                . 'Please try again in a few minutes.';
        }
    }
}

$PAGE->set_url(new moodle_url('/local/arina_prism_sense/launch.php', ['courseid' => $courseid]));
$PAGE->set_pagelayout('popup'); // Use popup layout for full-screen app
$PAGE->set_title('Professor Co-Pilot');
$PAGE->set_heading('Professor Co-Pilot');

// If validation failed, show error page and exit
if ($validationFailed) {
    echo $OUTPUT->header();
    echo '<div style="max-width: 600px; margin: 60px auto; padding: 40px; text-align: center; background:
    #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';
    echo '<div style="color: #dc3545; font-size: 48px; margin-bottom: 20px;">⚠️</div>';
    echo '<h2 style="color: #dc3545; margin-bottom: 20px;">' .
        ($isNetworkError ? 'Something Went Wrong' : 'API Key Validation Failed') . '</h2>';
    echo '<p style="font-size: 16px; color: #666; margin: 20px 0; line-height: 1.6;">' .
        htmlspecialchars($errorMessage) . '</p>';

    // Show settings link for admins (only when the key itself is the problem)
    $systemContext = context_system::instance();
    if (!$isNetworkError && has_capability('moodle/site:config', $systemContext)) {
        $settingsUrl = new moodle_url('/admin/settings.php', ['section' => 'local_arina_prism_sense']);
        echo '<p style="margin: 30px 0;"><a href="' . $settingsUrl . '" class="btn btn-warning"
        style="margin-right: 10px;">Configure API Key</a></p>';
    } elseif (!$isNetworkError) {
        echo '<p style="color: #888; margin: 20px 0;">
        Please contact your system administrator to configure the API key.</p>';
    }

    echo '<p><a href="' . $CFG->wwwroot . '/course/view.php?id=' . $courseid .
        '" class="btn btn-primary">← Return to Course</a></p>';
    echo '</div>';
    echo $OUTPUT->footer();
    exit;
}

// Get course sections and context using Utils
// Note: Utils::prepareContext includes sections and sesskey
$context_json = \local_arina_prism_sense\Utils::prepareContext($COURSE, $CFG->wwwroot);

// Get versioned JS URL
$builtjsurl = \local_arina_prism_sense\Utils::getJsUrl(
    $CFG->wwwroot,
    $CFG->dirroot . '/local/arina_prism_sense',
    'teacher.min.js'
);

echo $OUTPUT->header();
?>

<?php
// Render Teacher App
\local_arina_prism_sense\Utils::renderReactApp(
    $context_json,
    $builtjsurl,
    'ArinaPrismSense.init',
    'arina_prism_sense-react-root'
);
?>

<?php
// PRISM Sense In-App Guided Tour (Teacher App)
\local_arina_prism_sense\Utils::emitTourIfUnseen(
    $CFG,
    'arina_prism_sense_tour_teacher_seen',
    ['#arina_prism_sense-tour-header', '#arina_prism_sense-tour-sources-panel'],
    'teacher'
);


echo $OUTPUT->footer();

