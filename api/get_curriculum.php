<?php
/**
 * API endpoint to fetch curriculum from a section's Page activity
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/modinfolib.php');

header('Content-Type: application/json');

try {
    // Get parameters
    $courseid = required_param('courseid', PARAM_INT);
    $sectionid = required_param('sectionid', PARAM_INT);
    
    // Require login and capability
    require_login($courseid);
    $context = context_course::instance($courseid);
    require_capability('moodle/course:update', $context);
    
    // Get course module info
    $modinfo = get_fast_modinfo($courseid);
    
    // Find the section
    $sectioninfo = null;
    foreach ($modinfo->get_section_info_all() as $section) {
        if ($section->id == $sectionid) {
            $sectioninfo = $section;
            break;
        }
    }
    
    if (!$sectioninfo) {
        throw new moodle_exception('Section not found');
    }
    
    // Get curriculum from first Page activity or Label (text and media area) in the section
    $curriculumContent = '';
    
    // Get section number for comparison
    $sectionnumber = $sectioninfo->section;
    
    // Get all course modules in this section
    if (!empty($sectioninfo->sequence)) {
        $cmids = explode(',', $sectioninfo->sequence);
        
        foreach ($cmids as $cmid) {
            $cm = $modinfo->get_cm($cmid);
            
            // Check for Page activity
            if ($cm->modname == 'page' && $cm->uservisible) {
                $page = $DB->get_record('page', ['id' => $cm->instance]);
                if ($page && !empty($page->content)) {
                    $curriculumContent = strip_tags($page->content);
                    $curriculumContent = trim($curriculumContent);
                    break;
                }
            }elseif ($cm->modname == 'label' && $cm->uservisible) {
                $label = $DB->get_record('label', ['id' => $cm->instance]);
                if ($label && !empty($label->intro)) {
                    $curriculumContent = strip_tags($label->intro);
                    $curriculumContent = trim($curriculumContent);
                    break;
                }
            }
        }
    }
    
    // If no page found, check section summary as fallback
    if (empty($curriculumContent) && !empty($sectioninfo->summary)) {
        $curriculumContent = strip_tags($sectioninfo->summary);
        $curriculumContent = trim($curriculumContent);
    }
    
    // Return the curriculum even if empty (let frontend handle the message)
    echo json_encode([
        'status' => 'success',
        'curriculum' => $curriculumContent
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}