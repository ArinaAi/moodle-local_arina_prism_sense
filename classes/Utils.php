<?php
namespace local_lecturebot;

defined('MOODLE_INTERNAL') || die();

class Utils
{
    /**
     * Get course sections for the LectureBot modal.
     *
     * @param int $courseid Course ID
     * @return array Array of section information
     */
    public static function get_course_sections($courseid)
    {
        $sections = [];
        $modinfo = get_fast_modinfo($courseid);
        foreach ($modinfo->get_section_info_all() as $section) {
            if ($section->section > 0) {
                $sections[] = [
                    'id' => $section->id,
                    'name' => format_string($section->name ?: "Section {$section->section}"),
                    'section' => $section->section
                ];
            }
        }
        return $sections;
    }

    /**
     * Prepare Moodle context data for the LectureBot React app.
     *
     * @param object $course Course object
     * @param string $wwwroot Moodle wwwroot
     * @return string JSON encoded context
     */
    public static function prepare_context($course, $wwwroot)
    {
        $sections = self::get_course_sections($course->id);
        return json_encode([
            'courseid' => $course->id,
            'coursename' => $course->fullname,
            'sesskey' => sesskey(),
            'wwwroot' => $wwwroot,
            'sections' => $sections
        ]);
    }

    /**
     * Get the versioned URL for the LectureBot JavaScript bundle.
     *
     * @param string $wwwroot Moodle wwwroot
     * @param string $plugindir Plugin directory path
     * @return string Versioned JavaScript URL
     */
    public static function get_js_url($wwwroot, $plugindir, $filename = 'lecturebot_built.js')
    {
        $filesToCheck = [
            '/amd/build/' . $filename,
            '/amd/build/lecturebot_built.js',
        ];

        $jsversion = time(); // Default fallback
        $path = '';

        foreach ($filesToCheck as $file) {
            if (file_exists($plugindir . $file)) {
                $jsversion = filemtime($plugindir . $file);
                $path = $file;
                break;
            }
        }

        if (empty($path)) {
            // Fallback to filename even if not found (let browser 404)
            $path = '/amd/build/' . $filename;
        }

        return $wwwroot . '/local/lecturebot' . $path . '?v=' . $jsversion;
    }

    /**
     * Renders the React application container and scripts.
     *
     * @param string $contextJson JSON encoded Moodle context
     * @param string $jsUrl URL to the bundled JavaScript file
     * @param string $initFunction Name of the initialization function to call (e.g. 'LectureBot.init')
     * @param string $rootId ID of the DOM element to mount the app
     */
    public static function renderReactApp(
        $contextJson,
        $jsUrl,
        $initFunction = 'LectureBot.init',
        $rootId = 'lecturebot-react-root'
    )
    {
        // Safe defaults for styles
        $spinnerColor = '#0b57d0';
        ?>
        <style>
          html, body {
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: #f0f4f9 !important;
          }
          #page-header, #page-footer, .fixed-top, body > header, body > footer {
            display: none !important;
          }
          #<?php echo $rootId; ?> {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 99999 !important;
            background: #f0f4f9;
          }
        </style>
        
        <div id="<?php echo $rootId; ?>">
            <div style="display: flex; justify-content: center; align-items: center;
                        height: 100vh; flex-direction: column;">
                <div class="spinner-border" role="status"
                     style="width: 3rem; height: 3rem; color: <?php echo $spinnerColor; ?>;">
                    <span class="sr-only">Loading...</span>
                </div>
                <p style="margin-top: 20px; color: #6c757d; font-family: sans-serif;">Loading Application...</p>
            </div>
        </div>

        <script>
        window.MOODLE_CONTEXT = <?php echo $contextJson; ?>;
        
        (function() {
            var script = document.createElement('script');
            script.src = '<?php echo $jsUrl; ?>';
            script.onload = function() {
                var initParts = '<?php echo $initFunction; ?>'.split('.');
                var fn = window;
                for (var i = 0; i < initParts.length; i++) {
                    fn = fn[initParts[i]];
                    if (!fn) break;
                }

                if (typeof fn === 'function') {
                    fn();
                } else {
                    // Fallback retry
                    console.log('Waiting for init function...');
                    setTimeout(function() {
                         var retryFn = window;
                         for (var i = 0; i < initParts.length; i++) {
                            retryFn = retryFn[initParts[i]];
                            if (!retryFn) break;
                        }
                        if (typeof retryFn === 'function') {
                            retryFn();
                        } else {
                            console.error('❌ Failed to find init function: <?php echo $initFunction; ?>');
                        }
                    }, 500);
                }
            };
            script.onerror = function() {
                console.error('❌ Failed to load JS file');
            };
            document.head.appendChild(script);
        })();
        </script>
        <?php
    }
}

