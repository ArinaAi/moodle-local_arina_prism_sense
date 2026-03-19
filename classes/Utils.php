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
    public static function getCourseSections($courseid)
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
    public static function prepareContext($course, $wwwroot)
    {
        global $USER;
        $sections = self::getCourseSections($course->id);
        $tenantId = CompanyConfig::getTenantId();
        $canApprove = has_capability('local/lecturebot:approvecontent', \context_course::instance($course->id));
        return json_encode([
            'userid' => $USER->id,
            'tenantid' => $tenantId,
            'courseid' => $course->id,
            'coursename' => $course->fullname,
            'sesskey' => sesskey(),
            'wwwroot' => $wwwroot,
            'sections' => $sections,
            'canApprove' => $canApprove
        ]);
    }

    /**
     * Get the versioned URL for the LectureBot JavaScript bundle.
     *
     * @param string $wwwroot Moodle wwwroot
     * @param string $plugindir Plugin directory path
     * @return string Versioned JavaScript URL
     */
    public static function getJsUrl($wwwroot, $plugindir, $filename = 'lecturebot_built.js')
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

    /**
     * Internal helper to perform file download via cURL
     */
    private static function performDownload($url, $outputPath, $headers = [])
    {
        $success = false;
        try {
            $fp = fopen($outputPath, 'w+');
            if ($fp) {
                $ch = curl_init($url);
                $curlOptions = [
                    CURLOPT_FILE => $fp,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT => 600, // 10 minutes for large files
                    CURLOPT_CONNECTTIMEOUT => 30,
                    CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_SSL_VERIFYHOST => 2,
                ];

                if (!empty($headers)) {
                    $curlOptions[CURLOPT_HTTPHEADER] = $headers;
                }

                curl_setopt_array($ch, $curlOptions);

                curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlErrno = curl_errno($ch);
                $curlError = curl_error($ch);
                
                curl_close($ch);
                fclose($fp);

                if ($curlErrno) {
                    mtrace("  - cURL error downloading: $curlError");
                } elseif ($httpCode !== 200) {
                    if (file_exists($outputPath)) {
                        unlink($outputPath);
                    }
                    mtrace("  - Download returned HTTP $httpCode");
                } else {
                    $success = true;
                }
            } else {
                mtrace("  - Could not open output path: $outputPath");
            }
        } catch (\Exception $e) {
            mtrace("  - Error performing download: " . $e->getMessage());
        }

        return $success;
    }

    /**
     * Download File from Azure Blob Storage directly to path
     */
    public static function downloadFileFromAzure($blobName, $outputPath, $containerName)
    {
        try {
            $accountName = AZURE_STORAGE_ACCOUNT_NAME;
            $blobUrl = "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";

            $date = gmdate('D, d M Y H:i:s T');
            $version = '2020-04-08';

            $stringToSign = "GET\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "\n" .
                           "x-ms-date:{$date}\n" .
                           "x-ms-version:{$version}\n" .
                           "/{$accountName}/{$containerName}/{$blobName}";

            $signature = base64_encode(hash_hmac(
                'sha256',
                mb_convert_encoding($stringToSign, "UTF-8"),
                base64_decode(AZURE_STORAGE_ACCOUNT_KEY),
                true
            ));
            $authHeader = "SharedKey {$accountName}:{$signature}";

            $headers = [
                "x-ms-date: {$date}",
                "x-ms-version: {$version}",
                "Authorization: {$authHeader}"
            ];

            return self::performDownload($blobUrl, $outputPath, $headers);

        } catch (\Exception $e) {
            mtrace("  - Error downloading from Azure: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Download file directly from a public URL
     */
    public static function downloadFileFromUrl($url, $outputPath)
    {
        return self::performDownload($url, $outputPath);
    }

    /**
     * Count slides in PPTX file
     */
    public static function countSlidesInPptx($pptxPath)
    {
        $slideCount = 0;
        try {
            $zip = new \ZipArchive();
            if ($zip->open($pptxPath) === true) {
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $filename = $zip->getNameIndex($i);
                    if (preg_match('/ppt\/slides\/slide(\d+)\.xml/', $filename, $matches)) {
                        $slideNumber = (int)$matches[1];
                        $slideCount = max($slideCount, $slideNumber);
                    }
                }
                $zip->close();
            } else {
                mtrace("  - Could not open PPTX zip: $pptxPath");
            }
        } catch (\Exception $e) {
            mtrace("  - Error counting slides: " . $e->getMessage());
        }
        return $slideCount;
    }

    /**
     * Extract blob name from a full Azure Blob URL or relative path
     */
    public static function extractBlobNameFromUrl($url)
    {
        $parsed = parse_url($url);
        if (!$parsed || !isset($parsed['path'])) {
            return null;
        }
        $path = ltrim($parsed['path'], '/');
        
        // If it's a full URL with a host, the first path segment is the container name, so strip it.
        if (isset($parsed['host'])) {
            $parts = explode('/', $path, 2);
            return isset($parts[1]) ? $parts[1] : $path;
        }
        
        // If it's a relative path, assume it's already just the blob name (including folders inside container)
        return $path;
    }

    /**
     * Get and validate JSON input from php://input
     * @return array
     * @throws \moodle_exception
     */
    public static function getJsonInput()
    {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new \moodle_exception('Invalid JSON input', 'local_lecturebot');
        }
        return $input;
    }

    /**
     * Authenticate and validate a course content request
     * @param int $courseid
     * @param int $contentid
     * @param string $capability
     * @return \stdClass The content record
     * @throws \moodle_exception
     */
    public static function validateCourseContentRequest(
        $courseid,
        $contentid,
        $capability = 'moodle/course:manageactivities'
        )
    {
        global $DB;

        if ($courseid <= 0) {
            throw new \moodle_exception('Invalid course ID', 'local_lecturebot');
        }

        if ($contentid <= 0) {
            throw new \moodle_exception('Invalid content ID', 'local_lecturebot');
        }

        require_login($courseid);
        $context = \context_course::instance($courseid);
        require_capability($capability, $context);
        require_sesskey();

        $content = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);

        if ($content->courseid != $courseid) {
            throw new \moodle_exception('Content does not belong to this course', 'local_lecturebot');
        }

        return $content;
    }
}

