<?php
/**
 * Publish content to Moodle course
 *
 * This endpoint creates a new activity/resource in the Moodle course
 * with the generated lecture content.
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->dirroot . '/lib/filelib.php');
require_once(__DIR__ . '/../lib_azure_storage.php');
require_once(__DIR__ . '/../configurator_azure.php');

define('HTML_DIV_CLOSE', '</div>');
define('HTML_LI_CLOSE', '</li>');
define('HTML_UL_CLOSE', '</ul>');

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

$courseid = $input['courseid'] ?? 0;
$sectionid = $input['sectionid'] ?? 0;
$contentid = $input['contentid'] ?? 0;
$title = $input['title'] ?? 'Lecture Slides';
$content = $input['content'] ?? [];
$type = $input['type'] ?? 'slide-deck';

// Requires login and course access
require_login($courseid);
$context = context_course::instance($courseid);
require_capability('moodle/course:manageactivities', $context);
require_sesskey();

// If contentid is provided and content is empty, fetch from database
if ($contentid > 0 && empty($content)) {
    $content_record = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);
    $generation_data = json_decode($content_record->generationdata, true);
    $content = $generation_data['result'] ?? [];
    if (empty($title) || $title === 'Lecture Slides') {
        $title = $content_record->title;
    }
}

// Get section number from section ID
$modinfo = get_fast_modinfo($courseid);
$sectionnumber = 0;
foreach ($modinfo->get_section_info_all() as $section) {
    if ($section->id == $sectionid) {
        $sectionnumber = $section->section;
        break;
    }
}

if ($sectionnumber === 0 && $sectionid != 0) {
    echo json_encode(['error' => 'Invalid section ID']);
    exit;
}

try {
    // Generate HTML content with interactive slide viewer
    $html_content = '
    <style>
        .lecturebot-slide-viewer {
            max-width: 1000px;
            margin: 20px auto;
            font-family: Arial, sans-serif;
        }
        .slide-container {
            background: white;
            border: 2px solid #ddd;
            border-radius: 12px;
            padding: 40px;
            min-height: 500px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            position: relative;
        }
        .slide {
            display: none;
        }
        .slide.active {
            display: block;
        }
        .slide h2 {
            color: #0f6cbf;
            border-bottom: 3px solid #0f6cbf;
            padding-bottom: 10px;
            margin-bottom: 25px;
            font-size: 28px;
        }
        .slide h3 {
            color: #333;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .slide ul {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        .slide ul li {
            padding: 12px 0 12px 30px;
            position: relative;
            font-size: 18px;
            line-height: 1.6;
            color: #333;
        }
        .slide ul li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #0f6cbf;
            font-weight: bold;
            font-size: 20px;
        }
        .slide-comparison {
            display: flex;
            gap: 30px;
            margin: 20px 0;
        }
        .slide-comparison > div {
            flex: 1;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #0f6cbf;
        }
        .slide-comparison strong {
            display: block;
            color: #0f6cbf;
            margin-bottom: 12px;
            font-size: 18px;
        }
        .lecture-notes {
            background: #fff9e6;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin-top: 30px;
            border-radius: 8px;
        }
        .lecture-notes strong {
            color: #f57c00;
            display: block;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .slide-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
        }
        .slide-nav {
            display: flex;
            gap: 10px;
        }
        .slide-btn {
            background: #0f6cbf;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .slide-btn:hover {
            background: #0a5a9d;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(15, 108, 191, 0.3);
        }
        .slide-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }
        .slide-counter {
            background: #f8f9fa;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            color: #495057;
            font-size: 16px;
        }
        .topic-badge {
            display: inline-block;
            background: #e3f2fd;
            color: #0d47a1;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 15px;
        }
    </style>

    <div class="lecturebot-slide-viewer">
        <h1 style="text-align: center; color: #0f6cbf; margin-bottom: 30px;">' . htmlspecialchars($title) . '</h1>
        
        <div class="slide-container" id="slideContainer">';
    
    $slide_number = 0;
    
    // Check if we have structured text content (Legacy/Text Mode)
    if (isset($content['results']) && !empty($content['results']) && isset($content['results'][0]['content'])) {
        foreach ($content['results'] as $topic_idx => $topic) {
            foreach ($topic['content'] as $slide_idx => $slide) {
                $slide_number++;
                $slide_info = $slide['slide-info']['slide_content'];
                $lecture_notes = $slide['lecture-notes'] ?? '';
                $is_first = $slide_number === 1;
                
                $html_content .= '<div class="slide' . ($is_first ? ' active' : '') .
                    '" data-slide="' . $slide_number . '">';
                $html_content .= '<div class="topic-badge">Topic ' . ($topic_idx + 1) . ': ' .
                    htmlspecialchars($topic['topic']) . HTML_DIV_CLOSE;
                $html_content .= '<h3>' . htmlspecialchars($slide_info['title']) . '</h3>';
                
                // Add content based on slide type
                if (isset($slide_info['content']) && is_array($slide_info['content'])) {
                    $html_content .= '<ul>';
                    foreach ($slide_info['content'] as $item) {
                        $html_content .= '<li>' . htmlspecialchars($item) . HTML_LI_CLOSE;
                    }
                    $html_content .= HTML_UL_CLOSE;
                }
                
                if (isset($slide_info['left-content']) && is_array($slide_info['left-content'])) {
                    $html_content .= '<div class="slide-comparison">';
                    $html_content .= '<div><strong>Left Content:</strong><ul>';
                    foreach ($slide_info['left-content'] as $item) {
                        $html_content .= '<li>' . htmlspecialchars($item) . HTML_LI_CLOSE;
                    }
                    $html_content .= HTML_UL_CLOSE . HTML_DIV_CLOSE;
                    
                    if (isset($slide_info['right-content']) && is_array($slide_info['right-content'])) {
                        $html_content .= '<div><strong>Right Content:</strong><ul>';
                        foreach ($slide_info['right-content'] as $item) {
                            $html_content .= '<li>' . htmlspecialchars($item) . HTML_LI_CLOSE;
                        }
                        $html_content .= HTML_UL_CLOSE . HTML_DIV_CLOSE;
                    }
                    $html_content .= HTML_DIV_CLOSE;
                }
                
                // Add lecture notes
                if (!empty($lecture_notes)) {
                    $html_content .= '<div class="lecture-notes">';
                    $html_content .= '<strong>📝 Lecture Notes:</strong>';
                    $html_content .= '<p>' . nl2br(htmlspecialchars($lecture_notes)) . '</p>';
                    $html_content .= HTML_DIV_CLOSE;
                }
                
                $html_content .= HTML_DIV_CLOSE;
            }
        }
    } else {
        // Fallback to Image-Based Slides for modern content (PPTX)
        if ($contentid > 0) {
            $content_record = $DB->get_record('local_lecturebot_content', ['id' => $contentid], '*', MUST_EXIST);
            $gen_data = json_decode($content_record->generationdata, true);
            $slide_count = $gen_data['slide_count'] ?? 0;
            
            if ($slide_count > 0) {
                // Construct Azure Folder Path
                $tenantId = defined('LECTUREBOT_TENANT_ID') ? LECTUREBOT_TENANT_ID : 'default_tenant';
                $azureFolderId = $tenantId . '/course_' . $content_record->courseid .
                    '_section_' . $content_record->sectionid . '_' . $content_record->timecreated;
                
                $accountName = AZURE_STORAGE_ACCOUNT_NAME;
                $containerName = AZURE_BLOB_CONTAINER_NAME;
                
                // Loop through slides - Skip slide_000.png as it appears to be blank/broken
                for ($i = 1; $i <= $slide_count; $i++) {
                    $slide_number++;
                    $is_first = $slide_number === 1;
                    
                    // Use $i (001, 002...) instead of $i-1 to skip 000
                    $filename = sprintf('slide_%03d.png', $i);
                    $blobName = 'slides/' . $azureFolderId . '/' . $filename;
                    $imgUrl = "https://{$accountName}.blob.core.windows.net/{$containerName}/{$blobName}";
                    
                    $html_content .= '<div class="slide' . ($is_first ? ' active' : '') .
                        '" data-slide="' . $slide_number . '">';
                    $html_content .= '<div style="text-align: center;">';
                    
                    // Clean image tag
                    $html_content .= '<img src="' . $imgUrl . '" alt="Slide ' . $slide_number . '" ' .
                        'style="max-width: 100%; height: auto; box-shadow: ' .
                        '0 4px 8px rgba(0,0,0,0.1); border-radius: 4px;">';
                    
                    $html_content .= HTML_DIV_CLOSE;
                    $html_content .= HTML_DIV_CLOSE;
                }
            } else {
                 $html_content .= '<div class="alert alert-warning">No slides found in generation data.' .
                     HTML_DIV_CLOSE;
            }
        }
    }
    
    $total_slides = $slide_number;
    
    $html_content .= '
        </div>
        
        <div class="slide-controls">
            <div class="slide-nav">
                <button class="slide-btn" id="prevBtn" onclick="changeSlide(-1)">
                    ← Previous
                </button>
                <button class="slide-btn" id="nextBtn" onclick="changeSlide(1)">
                    Next →
                </button>
            </div>
            <div class="slide-counter">
                <span id="currentSlide">1</span> / <span id="totalSlides">' . $total_slides . '</span>
            </div>
        </div>
    </div>

    <script>
        let currentSlide = 1;
        const totalSlides = ' . $total_slides . ';

        function showSlide(n) {
            const slides = document.getElementsByClassName("slide");
            
            if (n > totalSlides) { currentSlide = totalSlides; }
            if (n < 1) { currentSlide = 1; }
            
            for (let i = 0; i < slides.length; i++) {
                slides[i].classList.remove("active");
            }
            
            slides[currentSlide - 1].classList.add("active");
            document.getElementById("currentSlide").textContent = currentSlide;
            
            // Update button states
            document.getElementById("prevBtn").disabled = (currentSlide === 1);
            document.getElementById("nextBtn").disabled = (currentSlide === totalSlides);
        }

        function changeSlide(n) {
            currentSlide += n;
            showSlide(currentSlide);
        }

        // Keyboard navigation
        document.addEventListener("keydown", function(event) {
            if (event.key === "ArrowLeft") {
                changeSlide(-1);
            } else if (event.key === "ArrowRight") {
                changeSlide(1);
            }
        });

        // Initialize
        showSlide(currentSlide);
    </script>';
    
    
    // Get the page module ID
    $pagemodule = $DB->get_record('modules', ['name' => 'page'], '*', MUST_EXIST);
    
    // Create a page resource in Moodle
    $module = new stdClass();
    $module->course = $courseid;
    $module->section = $sectionnumber;
    $module->module = $pagemodule->id;
    $module->modulename = 'page';
    $module->name = $title;
    $module->intro = 'Lecture slides generated by LectureBot';
    $module->introformat = FORMAT_HTML;
    $module->content = $html_content;
    $module->contentformat = FORMAT_HTML;
    $module->visible = 1;
    $module->visibleoncoursepage = 1;
    $module->display = 5;
    $module->printheading = 1;
    $module->printintro = 1;
    
    // Add required fields for add_moduleinfo
    $module->coursemodule = 0;
    $module->instance = 0;
    $module->add = 'page';
    
    // Get course object
    $course = get_course($courseid);
    
    // Add the module to the course
    $moduleinfo = add_moduleinfo($module, $course);
    
    // Generate URL
    $url = new moodle_url('/mod/page/view.php', ['id' => $moduleinfo->coursemodule]);
    
    // Update the database record for this content
    if ($contentid > 0) {
        $update_record = new stdClass();
        $update_record->id = $contentid;
        $update_record->status = 'published';
        $update_record->timepublished = time();
        $update_record->cmid = $moduleinfo->coursemodule;
        $update_record->timemodified = time();
        
        $DB->update_record('local_lecturebot_content', $update_record);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Content published successfully',
        'url' => $url->out(false),
        'moduleid' => $moduleinfo->coursemodule
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to publish content: ' . $e->getMessage()
    ]);
}
