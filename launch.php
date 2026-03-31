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
?>

<?php
// PRISM Sense In-App Guided Tour (Teacher App)
// Must be injected BEFORE $OUTPUT->footer() to stay inside the HTML document.
// Shepherd.js is loaded dynamically at runtime to avoid Moodle stripping CDN script tags.
?>
<script>
    (function () {
        var STORAGE_KEY = 'lecturebot_tour_teacher_seen';
        var SHEPHERD_JS = '<?php echo $CFG->wwwroot; ?>/local/lecturebot/js/shepherd-tour.min.js';

        function injectStyles() {
            if (!document.getElementById('shepherd-theme-teacher')) {
                var style = document.createElement('style');
                style.id = 'shepherd-theme-teacher';
                style.textContent = [
                    // Entry animation
                    '@keyframes prism-tour-in{from{opacity:0;transform:translateY(8px)}' +
                    'to{opacity:1;transform:translateY(0)}}',
                    // Card — must sit above React root (z-index: 99999)
                    '.shepherd-element{max-width:400px;z-index:100001!important;border-radius:14px!important;',
                    'box-shadow:0 8px 32px rgba(0,0,0,0.18)!important;animation:prism-tour-in .22s ease-out!important}',
                    // Clip inside the card without clipping the popper arrow
                    '.shepherd-content{border-radius:14px!important;overflow:hidden!important}',
                    // Arrow: use clip-path triangles per placement — no diamond artifact
                    '.shepherd-arrow::before{transform:none!important}',
                    // Push arrow further out from the card edge
                    '.shepherd-element[data-popper-placement^=right]>.shepherd-arrow{margin-left:-6px!important}',
                    '.shepherd-element[data-popper-placement^=left]>.shepherd-arrow{margin-right:-6px!important}',
                    '.shepherd-element[data-popper-placement^=bottom]>.shepherd-arrow{margin-top:-6px!important}',
                    '.shepherd-element[data-popper-placement^=top]>.shepherd-arrow{margin-bottom:-6px!important}',
                    '.shepherd-element[data-popper-placement^=right]>.shepherd-arrow::before{',
                    'clip-path:polygon(0 50%,100% 0,100% 100%)!important;',
                    'background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important}',
                    '.shepherd-element[data-popper-placement^=left]>.shepherd-arrow::before{',
                    'clip-path:polygon(100% 50%,0 0,0 100%)!important;',
                    'background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important}',
                    '.shepherd-element[data-popper-placement^=bottom]>.shepherd-arrow::before{',
                    'clip-path:polygon(50% 0,0 100%,100% 100%)!important;',
                    'background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important}',
                    '.shepherd-element[data-popper-placement^=top]>.shepherd-arrow::before{',
                    'clip-path:polygon(50% 100%,0 0,100% 0)!important;',
                    'background:#0a5a9d!important}',
                    // Header
                    '.shepherd-header{background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important;',
                    'border-radius:0!important;padding:14px 18px!important;align-items:center}',
                    '.shepherd-title{color:#fff!important;font-weight:700!important;' +
                    'font-size:.975rem!important;flex:1}',
                    '.shepherd-cancel-icon{color:rgba(255,255,255,.75)!important;font-size:1.1rem!important}',
                    '.shepherd-cancel-icon:hover{color:#fff!important}',
                    // Progress counter badge
                    '.prism-step-counter{font-size:.72rem;font-weight:500;color:rgba(255,255,255,.7);',
                    'background:rgba(255,255,255,.15);border-radius:20px;' +
                    'padding:2px 9px;margin-right:8px;white-space:nowrap}',
                    // Body
                    '.shepherd-text{font-size:.895rem;line-height:1.6;color:#1f2937;padding:18px 20px 12px}',
                    // Footer
                    '.shepherd-footer{padding:4px 16px 16px;gap:8px;border-top:none}',
                    // Primary button (Next)
                    '.shepherd-button-primary{background:linear-gradient(135deg,#0f6cbf 0%,#0a5a9d 100%)!important;',
                    'border-radius:20px!important;font-weight:600!important;' +
                    'padding:8px 20px!important;color:#fff!important;transition:opacity .15s}',
                    '.shepherd-button-primary:hover{opacity:.88!important}',
                    // Arrow on Next buttons only (not Done)
                    '.shepherd-button-primary.prism-btn-next::after{content:" →"}',
                    // Secondary button (Skip)
                    '.shepherd-button-secondary{border:1px solid #d1d5db!important;border-radius:20px!important;',
                    'font-weight:500!important;padding:8px 20px!important;' +
                    'color:#374151!important;background:#fff!important}',
                    '.shepherd-button-secondary:hover{background:#f3f4f6!important}',
                    // Target element highlight
                    '.prism-tour-active{outline:2.5px solid #0f6cbf!important;outline-offset:4px!important;',
                    'border-radius:6px!important;transition:outline .15s ease}'
                ].join('');
                document.head.appendChild(style);
            }
        }

        function loadShepherd(callback) {
            if (window.Shepherd) { callback(); return; }
            injectStyles();
            var script = document.createElement('script');
            script.src = SHEPHERD_JS;
            script.onload = callback;
            script.onerror = function () { console.warn('[PRISM Sense] Could not load Shepherd.js'); };
            document.head.appendChild(script);
        }

        // Helper: only attach to an element if it exists in the DOM.
        // If missing, the step floats in the centre instead of causing a black overlay.
        function attachTo(selector, side) {
            var el = document.querySelector(selector);
            return el ? { element: selector, on: side } : undefined;
        }

        // Remove the highlight ring from any previously highlighted element
        function clearHighlight() {
            var prev = document.querySelector('.prism-tour-active');
            if (prev) prev.classList.remove('prism-tour-active');
        }

        // Inject the "Step X of N" counter into the Shepherd header
        function updateProgress(tour, step) {
            var steps = tour.steps;
            var current = steps.indexOf(step) + 1;
            var total = steps.length;
            // Remove old counter
            var old = document.querySelector('.prism-step-counter');
            if (old) old.remove();
            // Insert before the title
            var titleEl = document.querySelector('.shepherd-title');
            if (titleEl) {
                var badge = document.createElement('span');
                badge.className = 'prism-step-counter';
                badge.textContent = current + ' / ' + total;
                titleEl.parentNode.insertBefore(badge, titleEl);
            }
        }

        function buildTour() {
            var tour = new Shepherd.Tour({
                useModalOverlay: false,   // Disabled: overlay causes black screen when anchors are missing
                defaultStepOptions: {
                    cancelIcon: { enabled: true },
                    scrollTo: { behavior: 'smooth', block: 'center' },
                    buttons: [
                        {
                            text: 'Skip tour',
                            classes: 'shepherd-button-secondary',
                            action: function () { tour.cancel(); }
                        },
                        {
                            text: 'Next',
                            classes: 'shepherd-button-primary prism-btn-next',
                            action: function () { tour.next(); }
                        }
                    ],
                    when: {
                        show: function () {
                            var step = this;
                            // Highlight target element
                            clearHighlight();
                            var cfg = step.options && step.options.attachTo;
                            if (cfg && cfg.element) {
                                var el = document.querySelector(cfg.element);
                                if (el) el.classList.add('prism-tour-active');
                            }
                            // Update progress counter
                            updateProgress(tour, step);
                        }
                    }
                }
            });

            tour.on('cancel', function () {
                clearHighlight();
                localStorage.setItem(STORAGE_KEY, '1');
            });
            tour.on('complete', function () {
                clearHighlight();
                localStorage.setItem(STORAGE_KEY, '1');
            });

            tour.addStep({
                id: 'welcome',
                title: 'Welcome to PRISM Sense',
                text: 'This quick tour shows you how to turn your course materials' +
                    ' into AI-powered lectures in just a few steps.',
                attachTo: attachTo('#lecturebot-tour-header', 'bottom'),
                buttons: [
                    { text: 'Skip tour', classes: 'shepherd-button-secondary', action: function () { tour.cancel(); } },
                    {
                        text: 'Let\'s go',
                        classes: 'shepherd-button-primary prism-btn-next',
                        action: function () { tour.next(); }
                    }
                ]
            });

            tour.addStep({
                id: 'sources-panel',
                title: 'Sources',
                text: 'All your uploaded course materials (PDFs, documents) are managed here.' +
                    ' Sources are the raw input for AI content generation.',
                attachTo: attachTo('#lecturebot-tour-sources-panel', 'right')
            });

            tour.addStep({
                id: 'add-source',
                title: 'Manage Sources',
                text: 'Click here to upload a PDF or document.' +
                    ' Once uploaded, PRISM Sense uses it to generate your lecture content.',
                attachTo: attachTo('#lecturebot-tour-add-source-btn', 'right')
            });

            tour.addStep({
                id: 'content-dock',
                title: 'Content Types',
                text: 'Choose what you want to generate — a <strong>Slide Deck</strong>' +
                    ' or a <strong>Video Lecture</strong>.' +
                    ' Click a button to start generating AI content for the selected course section.',
                attachTo: attachTo('#lecturebot-tour-content-dock', 'right')
            });

            tour.addStep({
                id: 'preview',
                title: 'Preview',
                text: 'This is where you review generated content before it goes live.' +
                    ' Browse through the slides or watch the video,' +
                    ' then approve it here to mark it ready for publishing.',
                attachTo: attachTo('#lecturebot-tour-center-col', 'bottom')
            });

            tour.addStep({
                id: 'content-list',
                title: 'Generated Content',
                text: 'All generated content for this course is listed here.' +
                    ' Once you have reviewed it in the preview panel,' +
                    ' publish it to make it available to students — or unpublish it at any time.',
                attachTo: attachTo('#lecturebot-tour-right-col', 'left')
            });

            tour.addStep({
                id: 'credits',
                title: 'Credit Balance',
                text: 'Each content generation uses credits from your Arina AI balance.' +
                    ' Your current balance is displayed here.',
                attachTo: attachTo('#lecturebot-tour-credit-badge', 'bottom'),
                buttons: [
                    { text: 'Done', classes: 'shepherd-button-primary', action: function () { tour.complete(); } }
                ]
            });

            return tour;
        }

        function startTour() {
            loadShepherd(function () {
                var tour = buildTour();
                tour.start();
            });
        }

        // Expose for manual re-trigger
        window.startLecturebotTour = startTour;

        // Auto-start for first-time users: poll until React app has mounted
        if (!localStorage.getItem(STORAGE_KEY)) {
            var attempts = 0;
            var maxAttempts = 40; // 10 seconds max
            var interval = setInterval(function () {
                attempts++;
                var header = document.getElementById('lecturebot-tour-header');
                var sourcesPanel = document.getElementById('lecturebot-tour-sources-panel');
                if (header && sourcesPanel) {
                    clearInterval(interval);
                    setTimeout(startTour, 800); // Wait for animations to settle
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                }
            }, 250);
        }
    })();
</script>

<?php
echo $OUTPUT->footer();
?>