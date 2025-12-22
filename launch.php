<?php
require_once('../../config.php');
require_once($CFG->libdir . '/adminlib.php');

// Ensure Utils is loaded
require_once(__DIR__ . '/classes/Utils.php');

$courseid = required_param('courseid', PARAM_INT);
require_login($courseid);

$PAGE->set_url(new moodle_url('/local/lecturebot/launch.php', ['courseid' => $courseid]));
$PAGE->set_pagelayout('popup'); // Use popup layout for full-screen app
$PAGE->set_title('Generate AI Lecture');
$PAGE->set_heading('Generate AI Lecture');

// Get course sections and context using Utils
// Note: Utils::prepare_context includes sections and sesskey
$context_json = \local_lecturebot\Utils::prepare_context($COURSE, $CFG->wwwroot);

// Get versioned JS URL
$builtjsurl = \local_lecturebot\Utils::get_js_url($CFG->wwwroot, $CFG->dirroot . '/local/lecturebot');

echo $OUTPUT->header();
?>

<!-- React App Container -->
<style>
  /* Reset Moodle styling for full-screen app */
  body {
    overflow: auto !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* Ensure full width and height for React app container */
  #lecturebot-react-root {
    width: 100vw !important;
    height: 100vh !important;
    margin: 0 !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    z-index: 10000 !important;
    background: white !important;
  }
</style>

<div id="lecturebot-react-root">
    <div style="text-align: center; padding: 40px;">
        <div class="spinner-border" role="status">
            <span class="sr-only">Loading...</span>
        </div>
        <p style="margin-top: 20px; color: #6c757d;">Loading LectureBot...</p>
    </div>
</div>

<script>
// Pass Moodle context to React app
window.MOODLE_CONTEXT = <?php echo $context_json; ?>;

// Load and initialize LectureBot
(function() {
    var script = document.createElement('script');
    script.src = '<?php echo $builtjsurl; ?>';
    script.onload = function() {
        if (window.LectureBot && typeof window.LectureBot.init === 'function') {
            window.LectureBot.init();
        } else if (typeof window.initLectureBot === 'function') {
            window.initLectureBot();
        } else {
            console.error('❌ LectureBot init function not found');
            document.getElementById('lecturebot-react-root').innerHTML =
                '<div style="padding: 40px; text-align: center; color: #dc3545;">' +
                '<h3>Error Loading LectureBot</h3>' +
                '<p>Unable to initialize the application. Please refresh the page.</p>' +
                '</div>';
        }
    };
    script.onerror = function() {
        console.error('❌ Failed to load LectureBot JS file');
        document.getElementById('lecturebot-react-root').innerHTML =
            '<div style="padding: 40px; text-align: center; color: #dc3545;">' +
            '<h3>Error Loading LectureBot</h3>' +
            '<p>Failed to load the application script. Please refresh the page.</p>' +
            '</div>';
    };
    document.head.appendChild(script);
})();
</script>

<?php
echo $OUTPUT->footer();
