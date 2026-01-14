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

/**
 * LectureBot plugin for Moodle.
 *
 * @package    local_lecturebot
 * @copyright  2024
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once(__DIR__ . '/classes/Utils.php');

use local_lecturebot\Utils;

/**
 * Generate JavaScript code for button creation and event handlers.
 *
 * @param string $wwwroot Moodle wwwroot
 * @return string JavaScript code
 */
function local_lecturebot_get_button_js($wwwroot)
{
    $buttontext = get_string('generatelecture', 'local_lecturebot');
    
    // Minified logic to inject button
    return <<<JS
        (function() {
            function initLectureBotAdmin() {
                // Remove existing button if any
                const existingBtn = document.querySelector(".lecturebot-course-button");
                if (existingBtn) existingBtn.remove();

                // Find injection target
                const targetElement = document.querySelector(".page-header-actions") ||
                                    document.querySelector(".page-header-headings") ||
                                    document.querySelector("#page-header .d-flex") ||
                                    document.querySelector(".header-maxwidth") ||
                                    document.querySelector("header");

                if (targetElement) {
                    console.log("LectureBot: Found admin target", targetElement);
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "btn btn-primary lecturebot-course-button";
                    button.innerHTML = "{$buttontext}";
                    button.style.cssText = "margin-top: 10px; margin-right: 15px; background: #0f6cbf;" +
                        " border-color: #0f6cbf; color: white;" +
                        " font-weight: 600; padding: 8px 16px; border-radius: 4px; display: inline-block; cursor: pointer;";

                    button.addEventListener("click", function() {
                        if (window.MOODLE_CONTEXT && window.MOODLE_CONTEXT.courseid) {
                            window.location.href = "{$wwwroot}/local/lecturebot/launch.php?courseid=" +
                                window.MOODLE_CONTEXT.courseid;
                        } else {
                            console.error("❌ MOODLE_CONTEXT not available");
                            alert("Unable to open LectureBot. Please refresh the page and try again.");
                        }
                    });

                    // Prefer prepending to actions
                    if (targetElement.classList.contains('page-header-actions')) {
                        targetElement.prepend(button);
                    } else {
                        targetElement.appendChild(button);
                    }
                } else {
                     console.log("LectureBot: No admin target element found");
                }
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", initLectureBotAdmin);
            } else {
                initLectureBotAdmin();
            }
        })();
JS;
}

/**
 * Generate JavaScript code for student button creation.
 *
 * @param string $wwwroot Moodle wwwroot
 * @return string JavaScript code
 */
function local_lecturebot_get_student_button_js($wwwroot)
{
    $buttontext = get_string('courseplayer', 'local_lecturebot'); // We need to add this string too
    if (empty($buttontext) || $buttontext == '[[courseplayer]]') {
        $buttontext = 'Start Course';
    }
    
    return <<<JS
        (function() {
            function initLectureBotStudent() {
                // Remove existing button if any
                const existingBtn = document.querySelector(".lecturebot-student-button");
                if (existingBtn) existingBtn.remove();

                // Find injection target - Student view might differ
                const targetElement = document.querySelector(".page-header-actions") ||
                                    document.querySelector(".page-header-headings") ||
                                    document.querySelector("#page-header .d-flex") ||
                                    document.querySelector(".header-maxwidth") ||
                                    document.querySelector("header");

                if (targetElement) {
                    console.log("LectureBot: Found student target", targetElement);
                    const button = document.createElement("a");
                    button.className = "btn btn-primary lecturebot-student-button"; // Changed to btn-primary
                    button.innerHTML = '<i class="fa fa-play-circle" aria-hidden="true"></i> ' + "{$buttontext}";
                    button.href = "#";
                    // Matched colors: background: #0f6cbf; border-color: #0f6cbf; color: white;
                    button.style.cssText = "margin-top: 10px; margin-right: 10px; background: #0f6cbf; " +
                        "border-color: #0f6cbf; color: white; " +
                        "font-weight: 600; padding: 8px 16px; border-radius: 4px; " +
                        "display: inline-block; cursor: pointer;";

                    button.addEventListener("click", function(e) {
                        e.preventDefault();
                        if (window.MOODLE_CONTEXT && window.MOODLE_CONTEXT.courseid) {
                            window.location.href = "{$wwwroot}/local/lecturebot/student_view.php?courseid=" +
                                window.MOODLE_CONTEXT.courseid;
                        } else {
                            console.error("❌ MOODLE_CONTEXT not available");
                        }
                    });

                    // Prepend or Append?
                    // If page-header-actions, append to behave like other actions
                    if (targetElement.classList.contains('page-header-actions')) {
                         targetElement.insertBefore(button, targetElement.firstChild);
                    } else {
                         targetElement.appendChild(button);
                    }
                } else {
                    console.log("LectureBot: No student target element found");
                }
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", initLectureBotStudent);
            } else {
                initLectureBotStudent();
            }
        })();
JS;
}

/**
 * Check if user can access LectureBot on current page.
 *
 * @return bool True if user has access
 */
function local_lecturebot_can_access()
{
    global $PAGE, $COURSE;

    $isCourseView = strpos($PAGE->pagetype, 'course-view') === 0;
    $canUpdate = has_capability(
        'moodle/course:update',
        context_course::instance($COURSE->id)
    );

    return $isCourseView && $canUpdate;
}

/**
 * Check if user can access Student View.
 *
 * @return bool True if user has access
 */
function local_lecturebot_can_access_student()
{
    global $PAGE, $COURSE, $USER;

    $isCourseView = strpos($PAGE->pagetype, 'course-view') === 0;
    
    // Check if course is valid
    if (!isset($COURSE->id) || $COURSE->id == 1) { // 1 is frontpage
        return false;
    }

    $context = context_course::instance($COURSE->id);

    // Allow if they can update (Teacher) OR are enrolled (Student)
    // is_enrolled(context, user, withcapability, onlyactive)
    $isEnrolled = is_enrolled($context, $USER, '', true);
    
    // Also allow managers/teachers who might not be "enrolled" but have update rights
    $canUpdate = has_capability('moodle/course:update', $context);

    return $isCourseView && ($isEnrolled || $canUpdate);
}

/**
 * Inject JavaScript to add button in correct position with proper styling.
 */
function local_lecturebot_before_footer()
{
    global $COURSE, $CFG;

    if (defined('AJAX_SCRIPT') && AJAX_SCRIPT) {
        return;
    }

    // Use Utils class to prepare context if we are going to inject anything
    $contextPrepared = false;
    $jsToInject = '';

    // 1. Teacher Button
    if (local_lecturebot_can_access()) {
        if (!$contextPrepared) {
            $moodlecontext = Utils::prepare_context($COURSE, $CFG->wwwroot);
            $jsToInject .= "\n window.MOODLE_CONTEXT = {$moodlecontext};\n";
            $contextPrepared = true;
        }
        $jsToInject .= local_lecturebot_get_button_js($CFG->wwwroot);
    }

    // 2. Student Button
    // We show this to students, AND teachers (so they can preview)
    $canAccessStudent = local_lecturebot_can_access_student();
    
    if ($canAccessStudent) {
        if (!$contextPrepared) {
            $moodlecontext = Utils::prepare_context($COURSE, $CFG->wwwroot);
            $jsToInject .= "\n window.MOODLE_CONTEXT = {$moodlecontext};\n";
            $contextPrepared = true;
        }
        $jsToInject .= local_lecturebot_get_student_button_js($CFG->wwwroot);
    }

    if ($jsToInject !== '') {
        echo '<script>';
        echo $jsToInject;
        echo '</script>';
    }

    // Modern Login Page Styling
    if (local_lecturebot_is_login_page()) {
        echo '<style>' . local_lecturebot_get_login_css() . '</style>';
        echo '<script>' . local_lecturebot_get_login_js() . '</script>';
    }
}

/**
 * Check if current page is the login page.
 *
 * @return bool True if on login page
 */
function local_lecturebot_is_login_page()
{
    global $PAGE;
    return $PAGE->pagetype === 'login-index';
}

/**
 * Get modern login page CSS.
 *
 * @return string CSS code
 */
function local_lecturebot_get_login_css()
{
    return local_lecturebot_get_login_base_css()
         . local_lecturebot_get_login_form_css()
         . local_lecturebot_get_login_button_css();
}

/**
 * Get base login page CSS (hide elements, background, card styling).
 *
 * @return string CSS code
 */
function local_lecturebot_get_login_base_css()
{
    return <<<CSS
        /* ===== LOGIN PAGE BASE STYLES ===== */
        
        /* Hide Cookies Notice Button */
        .btn-cookies,
        button[data-action="cookiesnotice"],
        #page-login-index button:contains("Cookies"),
        #page-login-index .btn:contains("Cookies"),
        #page-login-index button.btn-secondary {
            display: none !important;
        }
        
        /* Hide Question Mark Help Icon */
        body.pagelayout-login #usernavigation,
        body.pagelayout-login [data-region="drawer-toggle"],
        body.pagelayout-login .btn-footer-popover,
        body.pagelayout-login button[data-action="footer-popover"] {
            display: none !important;
        }
        
        /* Modern Background Gradient */
        body.pagelayout-login {
            background: linear-gradient(135deg, #f5f7fa 0%, #7b7c7dff 100%) !important;
            min-height: 100vh;
        }
        
        /* Modern Login Card */
        #page-login-index .card,
        #page-login-index .login-container,
        #page-login-index #region-main > .card {
            border-radius: 12px !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
                        0 10px 20px rgba(0, 0, 0, 0.08) !important;
            border: none !important;
            padding: 48px 40px !important;
            max-width: 420px !important;
            margin: 40px auto !important;
            background: #ffffff !important;
        }
        
        /* Typography - Headings */
        #page-login-index h2,
        #page-login-index .login-heading {
            font-size: 28px !important;
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin-bottom: 8px !important;
            letter-spacing: -0.02em !important;
        }
        
        /* Remove any default card background patterns */
        #page-login-index .card-body {
            background: transparent !important;
        }
        
        /* Logo Enhancement (if present) */
        #page-login-index .login-container .logo img,
        #page-login-index .logo img {
            max-height: 48px !important;
            margin-bottom: 32px !important;
            filter: brightness(0.95) !important;
        }
CSS;
}

/**
 * Get login form CSS (labels, inputs, form groups).
 *
 * @return string CSS code
 */
function local_lecturebot_get_login_form_css()
{
    return <<<CSS
        /* ===== LOGIN FORM STYLES ===== */
        
        /* Form Labels */
        #page-login-index label {
            font-size: 14px !important;
            font-weight: 500 !important;
            color: #374151 !important;
            margin-bottom: 6px !important;
            display: block !important;
        }
        
        /* Modern Input Fields */
        #page-login-index input[type="text"],
        #page-login-index input[type="password"],
        #page-login-index input#username,
        #page-login-index input#password {
            height: 48px !important;
            border: 1.5px solid #d1d5db !important;
            border-radius: 8px !important;
            padding: 0 16px !important;
            font-size: 15px !important;
            transition: all 0.2s ease !important;
            background: #ffffff !important;
            width: 100% !important;
        }
        
        /* Input Focus State */
        #page-login-index input[type="text"]:focus,
        #page-login-index input[type="password"]:focus,
        #page-login-index input#username:focus,
        #page-login-index input#password:focus {
            outline: none !important;
            border-color: #0f6cbf !important;
            box-shadow: 0 0 0 3px rgba(15, 108, 191, 0.1) !important;
        }
        
        /* Input Hover State */
        #page-login-index input[type="text"]:hover:not(:focus),
        #page-login-index input[type="password"]:hover:not(:focus) {
            border-color: #9ca3af !important;
        }
        
        /* Form Group Spacing */
        #page-login-index .form-group {
            margin-bottom: 20px !important;
            position: relative !important;
        }
        
        /* Password Eye Icon Position */
        #page-login-index button[data-passwordunmask] {
            position: absolute !important;
            right: 12px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 32px !important;
            height: 32px !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: transparent !important;
            cursor: pointer !important;
            z-index: 10 !important;
        }
        
        /* Adjust password input padding for eye icon */
        #page-login-index input#password {
            padding-right: 48px !important;
        }
CSS;
}

/**
 * Get login button CSS (primary button, forgot password link).
 *
 * @return string CSS code
 */
function local_lecturebot_get_login_button_css()
{
    return <<<CSS
        /* ===== LOGIN BUTTON STYLES ===== */
        
        /* Modern Login Button */
        #page-login-index .btn-primary,
        #page-login-index #loginbtn,
        #page-login-index button[type="submit"] {
            height: 48px !important;
            background: #0f6cbf !important;
            border: none !important;
            border-radius: 8px !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            color: #ffffff !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            width: 100% !important;
            margin-top: 8px !important;
        }
        
        /* Button Hover Effect */
        #page-login-index .btn-primary:hover,
        #page-login-index #loginbtn:hover {
            background: #0d5aa7 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(15, 108, 191, 0.3) !important;
        }
        
        /* Button Active State */
        #page-login-index .btn-primary:active,
        #page-login-index #loginbtn:active {
            transform: translateY(0) !important;
        }
        
        /* Forgot Password Link */
        #page-login-index .forgetpass a,
        #page-login-index .login-forgot a {
            color: #0f6cbf !important;
            text-decoration: none !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            transition: color 0.2s ease !important;
        }
        
        #page-login-index .forgetpass a:hover {
            color: #0d5aa7 !important;
            text-decoration: underline !important;
        }
CSS;
}


/**
 * Get JavaScript to fix dynamic login page elements.
 * TEMPORARY: For testing purposes only.
 *
 * @return string JavaScript code
 */
function local_lecturebot_get_login_js()
{
    return <<<JS
        // Fix login page elements after DOM loads
        (function() {
            function fixLoginPage() {
                // 1. Hide cookies notice button (button.btn-secondary)
                const buttons = document.querySelectorAll('#page-login-index button.btn-secondary');
                buttons.forEach(function(btn) {
                    if (btn.textContent.includes('Cookies')) {
                        btn.style.display = 'none';
                    }
                });
                
                // 2. Fix eye button positioning using the wrapper
                const passwordWrapper = document.querySelector('.toggle-sensitive-wrapper');
                const passwordField = document.querySelector('input#password');
                
                if (passwordWrapper && passwordField) {
                    // Make wrapper use flexbox to put input and button side by side
                    passwordWrapper.style.display = 'flex';
                    passwordWrapper.style.alignItems = 'center';
                    passwordWrapper.style.gap = '8px';
                    
                    // Make password field take remaining space
                    passwordField.style.flex = '1';
                    passwordField.style.width = 'auto';
                }
            }
            
            setTimeout(fixLoginPage, 100);
        })();
JS;
}

