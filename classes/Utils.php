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
    public static function get_js_url($wwwroot, $plugindir)
    {
        $filesToCheck = [
            '/amd/build/lecturebot_built.js',
            '/amd/build/lecturebot.min.js',
            '/amd/build/lecturebot.js'
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
            // Fallback to original path if nothing found
            $path = '/amd/build/lecturebot_built.js';
        }
        
        return $wwwroot . '/local/lecturebot' . $path . '?v=' . $jsversion;
    }
}

