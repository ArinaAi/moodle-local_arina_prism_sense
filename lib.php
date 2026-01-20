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
            $moodlecontext = Utils::prepareContext($COURSE, $CFG->wwwroot);
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
            $moodlecontext = Utils::prepareContext($COURSE, $CFG->wwwroot);
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
        
        /* Modern Background with subtle pattern */
        body.pagelayout-login {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%) !important;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        
        /* Decorative floating circles */
        body.pagelayout-login::before,
        body.pagelayout-login::after {
            content: '';
            position: fixed;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            animation: float 20s ease-in-out infinite;
            pointer-events: none;
        }
        
        body.pagelayout-login::before {
            width: 400px;
            height: 400px;
            top: -100px;
            right: -100px;
            animation-delay: 0s;
        }
        
        body.pagelayout-login::after {
            width: 300px;
            height: 300px;
            bottom: -50px;
            left: -50px;
            animation-delay: -10s;
        }
        
        @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(20px, -30px) rotate(5deg); }
            50% { transform: translate(-10px, 20px) rotate(-5deg); }
            75% { transform: translate(15px, 10px) rotate(3deg); }
        }
        
        /* Modern Login Card with glassmorphism */
        #page-login-index .card,
        #page-login-index .login-container,
        #page-login-index #region-main > .card {
            border-radius: 20px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
                        0 2px 8px rgba(0, 0, 0, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            padding: 48px 40px 40px !important;
            max-width: 420px !important;
            margin: 40px auto !important;
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            animation: slideUp 0.6s ease-out;
            position: relative;
            z-index: 10;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Typography - Headings (hidden, we'll use custom) */
        #page-login-index h2,
        #page-login-index .login-heading {
            display: none !important;
        }
        
        /* Remove any default card background patterns */
        #page-login-index .card-body {
            background: transparent !important;
        }
        
        /* Logo Enhancement */
        #page-login-index .login-container .logo img,
        #page-login-index .logo img {
            max-height: 56px !important;
            margin-bottom: 16px !important;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)) !important;
            transition: transform 0.3s ease !important;
        }
        
        #page-login-index .logo img:hover {
            transform: scale(1.05) !important;
        }
        
        /* Custom Welcome Section Styles */
        .lecturebot-welcome-section {
            text-align: center;
            margin-bottom: 28px;
            animation: fadeIn 0.8s ease-out 0.3s both;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .lecturebot-welcome-title {
            font-size: 26px;
            font-weight: 700;
            color: #1a1a2e;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
        }
        
        .lecturebot-welcome-subtitle {
            font-size: 15px;
            color: #6b7280;
            margin: 0;
            font-weight: 400;
        }
        
        /* Divider line */
        .lecturebot-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 24px 0;
        }
        
        /* Footer Styles */
        .lecturebot-login-footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #f0f0f0;
            animation: fadeIn 0.8s ease-out 0.5s both;
        }
        
        .lecturebot-footer-text {
            font-size: 12px;
            color: #9ca3af;
            margin: 0 0 4px 0;
        }
        
        .lecturebot-footer-brand {
            font-size: 13px;
            color: #6b7280;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .lecturebot-footer-brand svg {
            width: 14px;
            height: 14px;
        }
        
        /* Feature highlights */
        .lecturebot-features {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 16px;
            animation: fadeIn 0.8s ease-out 0.6s both;
        }
        
        .lecturebot-feature {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #6b7280;
        }
        
        .lecturebot-feature svg {
            width: 14px;
            height: 14px;
            color: #10b981;
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
        }
        
        /* Password wrapper - use relative positioning for absolute button */
        #page-login-index .toggle-sensitive-wrapper {
            position: relative !important;
            display: block !important;
            width: 100% !important;
        }
        
        /* Modern Password Input */
        #page-login-index input#password {
            width: 100% !important;
            padding-right: 50px !important;
        }
        
        /* Password Eye Icon - positioned inside the input */
        #page-login-index .toggle-sensitive-wrapper button,
        #page-login-index button[data-passwordunmask] {
            position: absolute !important;
            right: 10px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 36px !important;
            height: 36px !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: transparent !important;
            cursor: pointer !important;
            z-index: 10 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #6b7280 !important;
            border-radius: 4px !important;
            transition: background 0.2s, color 0.2s !important;
        }
        
        #page-login-index .toggle-sensitive-wrapper button:hover,
        #page-login-index button[data-passwordunmask]:hover {
            background: rgba(0, 0, 0, 0.05) !important;
            color: #374151 !important;
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
                
                // 2. The password eye button positioning is now handled by CSS
                // No JS modification needed for .toggle-sensitive-wrapper
                
                // 3. Add Welcome Section - use Moodle's actual selectors
                const loginLogo = document.getElementById('loginlogo') || document.querySelector('.login-logo');
                const loginForm = document.querySelector('.loginform');
                
                if (!document.querySelector('.lecturebot-welcome-section')) {
                    const welcomeSection = document.createElement('div');
                    welcomeSection.className = 'lecturebot-welcome-section';
                    welcomeSection.innerHTML = `
                        <h1 class="lecturebot-welcome-title">Welcome Back</h1>
                        <p class="lecturebot-welcome-subtitle">Sign in to continue your learning journey</p>
                    `;
                    
                    // Insert after the logo container
                    if (loginLogo) {
                        loginLogo.insertAdjacentElement('afterend', welcomeSection);
                    } else if (loginForm) {
                        // Fallback: insert at beginning of loginform
                        loginForm.insertAdjacentElement('afterbegin', welcomeSection);
                    }
                }
                
                // 4. Add Footer with branding
                const forgetPass = document.querySelector('.login-form-forgotpassword, .forgetpass');
                if (forgetPass && !document.querySelector('.lecturebot-login-footer')) {
                    const footer = document.createElement('div');
                    footer.className = 'lecturebot-login-footer';
                    footer.innerHTML = `
                        <p class="lecturebot-footer-text">Secure learning environment</p>
                        <div class="lecturebot-footer-brand">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                            Powered by Arina AI
                        </div>
                        <div class="lecturebot-features">
                            <span class="lecturebot-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                AI-Powered
                            </span>
                            <span class="lecturebot-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                Interactive
                            </span>
                            <span class="lecturebot-feature">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                                Personalized
                            </span>
                        </div>
                    `;
                    forgetPass.insertAdjacentElement('afterend', footer);
                }
            }
            
            setTimeout(fixLoginPage, 100);
        })();
JS;
}

