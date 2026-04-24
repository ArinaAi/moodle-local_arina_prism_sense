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
namespace local_arina_prism_sense;

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/../config_api.php'); // NOSONAR — required for AUTH_SERVICE_URL constant

class Utils
{
    /**
     * Get course sections for the ArinaPrismSense modal.
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
     * Prepare Moodle context data for the ArinaPrismSense React app.
     *
     * @param object $course Course object
     * @param string $wwwroot Moodle wwwroot
     * @return string JSON encoded context
     */
    public static function prepareContext($course, $wwwroot)
    {
        global $USER;
        $sections = self::getCourseSections($course->id);
        $orgId = CompanyConfig::getOrgId();
        $canApprove = has_capability('local/arina_prism_sense:approvecontent', \context_course::instance($course->id));
        return json_encode([
            'userid'     => $USER->id,
            'orgid'      => $orgId,
            'courseid'   => $course->id,
            'coursename' => $course->fullname,
            'sesskey'    => sesskey(),
            'wwwroot'    => $wwwroot,
            'sections'   => $sections,
            'canApprove' => $canApprove,
        ]);
    }

    /**
     * Get the versioned URL for the ArinaPrismSense JavaScript bundle.
     *
     * @param string $wwwroot Moodle wwwroot
     * @param string $plugindir Plugin directory path
     * @return string Versioned JavaScript URL
     */
    public static function getJsUrl($wwwroot, $plugindir, $filename = 'arina_prism_sense_built.js')
    {
        $filesToCheck = [
            '/amd/build/' . $filename,
            '/amd/build/arina_prism_sense_built.js',
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

        return $wwwroot . '/local/arina_prism_sense' . $path . '?v=' . $jsversion;
    }

    /**
     * Renders the React application container and scripts.
     *
     * @param string $contextJson JSON encoded Moodle context
     * @param string $jsUrl URL to the bundled JavaScript file
     * @param string $initFunction Name of the initialization function to call (e.g. 'ArinaPrismSense.init')
     * @param string $rootId ID of the DOM element to mount the app
     */
    public static function renderReactApp(
        $contextJson,
        $jsUrl,
        $initFunction = 'ArinaPrismSense.init',
        $rootId = 'arina_prism_sense-react-root'
    ) {
        // Safe defaults for styles
        $spinnerColor = '#0b57d0';
        ?>
        <style>
            html,
            body {
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: #f0f4f9 !important;
            }

            #page-header,
            #page-footer,
            .fixed-top,
            body>header,
            body>footer {
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

        <?php
        // React and ReactDOM must be loaded as globals BEFORE the app bundle,
        // because webpack.config.js declares them as externals:
        //   externals: { 'react': 'React', 'react-dom': 'ReactDOM' }
        // Without these globals the bundle crashes silently and the spinner never clears.
        //
        // SRI (integrity="sha384-...") is intentionally omitted here.
        // Reason: unpkg serves files directly from immutable npm tarballs, so the
        // content for a pinned exact version (e.g. react@18.2.0) never changes.
        // Adding SRI with a semver range (@18) would be unsafe — if unpkg resolved
        // @18 to a newer patch release the hash would mismatch and break the app.
        // The safe approach is: pin to an exact version + no SRI (immutable source).
        // If a stricter CSP is needed in future, lock to an exact version AND add SRI.
        ?>
        <script src="https://unpkg.com/react@18.2.0/umd/react.production.min.js" crossorigin></script>
        <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js" crossorigin></script>

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

            (function () {
                function loadScript(url, onLoad) {
                    var s = document.createElement('script');
                    s.src = url;
                    s.onload = onLoad;
                    s.onerror = function () { onLoad(); }; // Always continue — never let a chunk block the app
                    document.head.appendChild(s);
                }

                function runInit() {
                    var initParts = '<?php echo $initFunction; ?>'.split('.');
                    var fn = window;
                    for (var i = 0; i < initParts.length; i++) {
                        fn = fn[initParts[i]];
                        if (!fn) break;
                    }
                    if (typeof fn === 'function') {
                        fn();
                    } else {
                        setTimeout(function () {
                            var retryFn = window;
                            var parts = '<?php echo $initFunction; ?>'.split('.');
                            for (var i = 0; i < parts.length; i++) {
                                retryFn = retryFn[parts[i]];
                                if (!retryFn) break;
                            }
                            if (typeof retryFn === 'function') { retryFn(); }
                        }, 500);
                    }
                }

                <?php
                // Resolve the vendor chunk path on disk.
                // If it exists, chain-load it before the app bundle so MUI/Emotion are available.
                // If it doesn't exist (e.g. local dev without a full rebuild), load the app directly.
                global $CFG;
                $vendorDiskPath = $CFG->dirroot . '/local/arina_prism_sense/amd/build/vendor.min.js';
                if (file_exists($vendorDiskPath)) :
                    $vendorUrl = $CFG->wwwroot . '/local/arina_prism_sense/amd/build/vendor.min.js?v=' .
                        filemtime($vendorDiskPath);
                    ?>
                    // vendor.min.js found — load shared chunk first, then the app bundle.
                    loadScript('<?php echo $vendorUrl; ?>', function () {
                        loadScript('<?php echo $jsUrl; ?>', runInit);
                    });
                <?php else : ?>
                    // vendor.min.js not present — load app bundle directly (dev environment or pre-splitChunks build).
                    loadScript('<?php echo $jsUrl; ?>', runInit);
                <?php endif; ?>
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
     * Download a file from Azure via the Auth Service (SAS URL gateway).
     * No Azure credentials required — the Auth Service handles SAS generation.
     *
     * @param string $blobName      Blob path within the container
     * @param string $outputPath    Local file path to write to
     * @param string $containerName Azure container name
     * @param string $apiKey        Arina API key
     * @return bool True on success, false on failure
     */
    public static function downloadFileViaAuthService(
        string $blobName,
        string $outputPath,
        string $containerName,
        string $apiKey
    ): bool {
        $authUrl = AUTH_SERVICE_URL
            . '?container=' . urlencode($containerName)
            . '&blob_path=' . urlencode($blobName);

        mtrace("  - [AuthService] Fetching SAS URL for: {$blobName}");

        $ch = curl_init($authUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER     => ["X-API-Key: {$apiKey}"],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response  = curl_exec($ch);
        $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($httpCode !== 200 || empty($response)) {
            mtrace("  - [AuthService] Failed to fetch SAS URL. HTTP {$httpCode}. Error: {$curlError}");
            return false;
        }

        $responseData = json_decode($response, true);
        if (!isset($responseData['url'])) {
            mtrace('  - [AuthService] Response did not contain a SAS URL.');
            return false;
        }

        mtrace('  - [AuthService] SAS URL obtained, downloading file...');
        return self::performDownload($responseData['url'], $outputPath);
    }

    /**
     * Download File from Azure Blob Storage directly to path
     *
     * @deprecated Use downloadFileViaAuthService() instead — no Azure credentials required.
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
                        $slideNumber = (int) $matches[1];
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
            throw new \moodle_exception('Invalid JSON input', 'local_arina_prism_sense');
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
    ) {
        global $DB;

        if ($courseid <= 0) {
            throw new \moodle_exception('Invalid course ID', 'local_arina_prism_sense');
        }

        if ($contentid <= 0) {
            throw new \moodle_exception('Invalid content ID', 'local_arina_prism_sense');
        }

        require_login($courseid);
        $context = \context_course::instance($courseid);
        require_capability($capability, $context);
        require_sesskey();

        $content = $DB->get_record('local_arina_prism_sense_content', ['id' => $contentid], '*', MUST_EXIST);

        if ($content->courseid != $courseid) {
            throw new \moodle_exception('Content does not belong to this course', 'local_arina_prism_sense');
        }

        return $content;
    }
    /**
     * Emits the PRISM Sense guided-tour script block.
     *
     * The script is ALWAYS emitted so that window.startArinaPrismSenseTour() is
     * always defined on the page (the "Retake Tour" button needs it).
     * The autoStart flag controls whether the tour kicks off automatically:
     *  - false  → user has already seen the tour; manual retrigger only.
     *  - true   → first visit; tour starts automatically after the React app mounts.
     *
     * Call this from any PHP page that should show a guided tour:
     *   \local_arina_prism_sense\Utils::emitTourIfUnseen($CFG, 'pref_key', ['#sel'], 'teacher');
     *
     * @param \stdClass $cfg       Moodle $CFG global.
     * @param string    $prefKey  User-preference key (e.g. arina_prism_sense_tour_teacher_seen).
     * @param string[]  $pollFor  CSS selectors the engine waits for before auto-starting.
     * @param string    $tourName Tour identifier matching lib/tour_steps_NAME.json.
     * @return void
     */
    public static function emitTourIfUnseen($cfg, $prefKey, $pollFor, $tourName)
    {
        // autoStart is false when the user has already seen the tour.
        // prism-tour.js checks cfg.autoStart and skips the poll loop when false,
        // but window.startArinaPrismSenseTour() is always registered for manual retrigger.
        $alreadySeen = (bool) get_user_preferences($prefKey, 0);
        $autoStart   = $alreadySeen ? 'false' : 'true';

        $stepsFile = $cfg->dirroot . '/local/arina_prism_sense/lib/tour_steps_' . $tourName . '.json';
        $steps = json_decode(file_get_contents($stepsFile), true);
        $stepsJson = json_encode($steps, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $pollJson = json_encode($pollFor, JSON_UNESCAPED_SLASHES);
        $wwwroot = $cfg->wwwroot;
        $sesskeyVal = sesskey();

        echo '<script>' . "\n";
        echo 'window.PRISM_TOUR_CONFIG = {' . "\n";
        echo "    shepherdJs  : '{$wwwroot}/local/arina_prism_sense/js/shepherd-tour.min.js',\n";
        echo "    markSeenUrl : '{$wwwroot}/local/arina_prism_sense/api/mark_tour_seen.php',\n";
        echo "    sesskey     : '{$sesskeyVal}',\n";
        echo "    prefKey     : '{$prefKey}',\n";
        echo "    autoStart   : {$autoStart},\n";
        echo "    pollFor     : {$pollJson},\n";
        echo "    steps       : {$stepsJson}\n";
        echo '}' . ";\n";
        echo '</script>' . "\n";
        echo '<script src="' . $wwwroot . '/local/arina_prism_sense/lib/prism-tour.js"></script>' . "\n";
    }

    /**
     * Get site admins and IOMAD company managers (if applicable) for a given user.
     *
     * @param int $userid The user ID.
     * @return array Array of user objects to notify.
     */
    public static function getAdminsAndCompanyManagers($userid)
    {
        global $DB, $CFG;
        $managers = [];

        // 1. Get site admins
        $siteAdminsStr = isset($CFG->siteadmins) ? $CFG->siteadmins : '';
        $adminIds = array_filter(array_map('intval', explode(',', $siteAdminsStr)));
        if (!empty($adminIds)) {
            list($adminInSql, $adminParams) = $DB->get_in_or_equal($adminIds);
            $sql = "SELECT * FROM {user} WHERE id {$adminInSql} AND deleted = 0 AND suspended = 0";
            $adminUsers = $DB->get_records_sql($sql, $adminParams);
            if ($adminUsers) {
                foreach ($adminUsers as $au) {
                    $managers[$au->id] = $au;
                }
            }
        }

        // 2. If IOMAD is installed, get company managers
        $iomadInstalled = class_exists('\local_arina_prism_sense\CompanyConfig')
            && \local_arina_prism_sense\CompanyConfig::isIomadInstalled();
        if ($iomadInstalled) {
            $iomadManagers = self::fetchIomadManagers($userid, $managers);
            $managers = array_replace($managers, $iomadManagers);
        }

        return array_values($managers);
    }

    /**
     * Fetch IOMAD company managers for a given user, excluding already-known admins.
     *
     * @param int   $userid   The user whose companies to inspect
     * @param array $existing Already-collected managers (to avoid duplicates)
     * @return array New manager user objects keyed by user ID
     */
    private static function fetchIomadManagers($userid, $existing)
    {
        global $DB;
        $result = [];
        $userCompanies = $DB->get_records('company_users', ['userid' => $userid]);
        if (!$userCompanies) {
            return $result;
        }
        foreach ($userCompanies as $company) {
            $companyManagers = $DB->get_records(
                'company_users',
                ['companyid' => $company->companyid, 'manager' => 1]
            );
            if (!$companyManagers) {
                continue;
            }
            foreach ($companyManagers as $cm) {
                if (isset($existing[$cm->userid]) || isset($result[$cm->userid])) {
                    continue;
                }
                $user = $DB->get_record(
                    'user',
                    ['id' => $cm->userid, 'deleted' => 0, 'suspended' => 0]
                );
                if ($user) {
                    $result[$user->id] = $user;
                }
            }
        }
        return $result;
    }
}
