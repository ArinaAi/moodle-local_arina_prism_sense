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
require_once(__DIR__ . '/configurator_azure.php');

$courseid = required_param('courseid', PARAM_INT);
require_login($courseid);

// Validate API key before allowing access to the plugin
$apiKey = get_config('local_lecturebot', 'api_key');
$validationFailed = false;
$errorMessage = '';

if (empty($apiKey)) {
    $validationFailed = true;
    $errorMessage = 'API key is not configured. Please add your API key in the plugin settings.';
} else {
    // Validate API key against Arina auth service
    $validateUrl = AUTH_SERVICE_URL;
    
    $ch = curl_init($validateUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ["X-API-Key: {$apiKey}"],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        $validationFailed = true;
        $errorMessage = 'Unable to validate API key. Please check your network connection and try again.';
        error_log("LectureBot API key validation cURL error: {$curlError}");
    } elseif ($httpCode === 401) {
        $validationFailed = true;
        $errorMessage = 'API key is invalid or incorrect. Please check your plugin settings.';
        error_log("LectureBot API key validation failed: HTTP 401 (Invalid API key)");
    } elseif ($httpCode !== 200) {
        $validationFailed = true;
        $errorMessage = "API key validation failed with HTTP {$httpCode}. Please contact your administrator.";
        error_log("LectureBot API key validation failed: HTTP {$httpCode}");
    }
}

$PAGE->set_url(new moodle_url('/local/lecturebot/launch.php', ['courseid' => $courseid]));
$PAGE->set_pagelayout('popup'); // Use popup layout for full-screen app
$PAGE->set_title('Generate AI Lecture');
$PAGE->set_heading('Generate AI Lecture');

// If validation failed, show error page and exit
if ($validationFailed) {
    echo $OUTPUT->header();
    echo '<div style="max-width: 600px; margin: 60px auto; padding: 40px; text-align: center; background:
    #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';
    echo '<div style="color: #dc3545; font-size: 48px; margin-bottom: 20px;">⚠️</div>';
    echo '<h2 style="color: #dc3545; margin-bottom: 20px;">API Key Validation Failed</h2>';
    echo '<p style="font-size: 16px; color: #666; margin: 20px 0; line-height: 1.6;">' .
    htmlspecialchars($errorMessage) . '</p>';
    
    // Show settings link for admins
    $systemContext = context_system::instance();
    if (has_capability('moodle/site:config', $systemContext)) {
        $settingsUrl = new moodle_url('/admin/settings.php', ['section' => 'local_lecturebot']);
        echo '<p style="margin: 30px 0;"><a href="' . $settingsUrl . '" class="btn btn-warning"
        style="margin-right: 10px;">Configure API Key</a></p>';
    } else {
        echo '<p style="color: #888; margin: 20px 0;">
        Please contact your system administrator to configure the API key.</p>';
    }
    
    echo '<p><a href="' . $CFG->wwwroot . '/course/view.php?id=' . $courseid .
    '" class="btn btn-primary">← Return to Course</a></p>';
    echo '</div>';
    echo $OUTPUT->footer();
    exit;
}

// Bootstrap per-company config (resolves tenantid, api_key, org_wallet_owner_id for IOMAD).
// Must be called before prepareContext() so getTenantId() returns the correct value.
\local_lecturebot\CompanyConfig::bootstrap($USER->id);

// Get course sections and context using Utils
// Note: Utils::prepareContext includes sections and sesskey
$context_json = \local_lecturebot\Utils::prepareContext($COURSE, $CFG->wwwroot);

// Get versioned JS URL
$builtjsurl = \local_lecturebot\Utils::getJsUrl($CFG->wwwroot, $CFG->dirroot . '/local/lecturebot', 'teacher.min.js');

echo $OUTPUT->header();
?>

<?php
// Render Teacher App
\local_lecturebot\Utils::renderReactApp(
    $context_json,
    $builtjsurl,
    'LectureBot.init',
    'lecturebot-react-root'
);

echo $OUTPUT->footer();
?>
