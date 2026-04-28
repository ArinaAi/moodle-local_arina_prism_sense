<?php

// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Arina.ai Registration Page
 *
 * Async, email-verified registration flow.
 * Silently collects org data from Moodle ($SITE / $USER / $CFG) and
 * registers with the Arina IOMAD service. Polls for completion and saves
 * org_id, api_key, and org_wallet_owner_id into Moodle config on success.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Detect AJAX before Moodle bootstraps so error handling is JSON, not HTML.
$_arina_action = isset($_REQUEST['action']) ? preg_replace('/[^a-z_]/', '', (string) $_REQUEST['action']) : '';
if ($_arina_action !== '') {
    define('AJAX_SCRIPT', true);
}

define('ARINA_CONTENT_TYPE_JSON', 'Content-Type: application/json');
define('ARINA_ACCEPT_JSON', 'Accept: application/json');
define('ARINA_CARD_HIDDEN_STYLE', 'max-width:540px;display:none');

require_once(__DIR__ . '/../../config.php'); // NOSONAR
require_once($CFG->libdir . '/adminlib.php'); // NOSONAR
require_once(__DIR__ . '/config_api.php'); // NOSONAR

// Only site admins may access this page.
admin_externalpage_setup('local_arina_prism_sense_register');
require_capability('moodle/site:config', context_system::instance());

// ── Collect Moodle data & validate (runs on every request) ────────────────────
global $SITE, $USER, $CFG;

$_arina_missing_labels = [
    'organisation.name'      => 'Site full name',
    'organisation.shortname' => 'Site short name',
    'organisation.city'      => 'City (Site administration → Location settings)',
    'organisation.country'   => 'Country (Site administration → Location settings)',
];

$_arina_site_fields = [
    'organisation.name'      => trim($SITE->fullname ?? ''),
    'organisation.shortname' => trim($SITE->shortname ?? ''),
    'organisation.city'      => trim(get_config('moodle', 'city') ?: ($USER->city ?? '')),
    'organisation.country'   => trim(get_config('moodle', 'country') ?: ($USER->country ?? '')),
];

$_arina_missing_fields = [];
foreach ($_arina_site_fields as $key => $value) {
    if (empty($value)) {
        $_arina_missing_fields[] = $_arina_missing_labels[$key];
    }
}

// ── AJAX dispatch ──────────────────────────────────────────────────────────────
if ($_arina_action !== '') {
    header(ARINA_CONTENT_TYPE_JSON);
    require_sesskey();

    switch ($_arina_action) {
        case 'start_registration':
            arinaHandleStartRegistration($_arina_missing_fields);
            break;
        case 'poll_status':
            arinaHandlePollStatus();
            break;
        case 'resend_email':
            arinaHandleResendEmail();
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'unknown_action']);
    }
    exit;
}

// ── Page render ────────────────────────────────────────────────────────────────
$PAGE->set_url(new moodle_url('/local/arina_prism_sense/register.php'));
$PAGE->set_title('Arina.ai Registration');
$PAGE->set_heading('Register PRISM Sense with Arina.ai');

echo $OUTPUT->header();

// ── Missing fields error ───────────────────────────────────────────────────────
if (!empty($_arina_missing_fields)) {
    $listItems = html_writer::alist($_arina_missing_fields, [], 'ul');
    echo $OUTPUT->notification(
        'Your Moodle site is missing required information. Please update the following before registering:' .
        $listItems,
        'error'
    );
}

// ── Ready to register card (only shown when all fields present) ────────────────
if (empty($_arina_missing_fields)) {
    echo html_writer::start_tag('div', ['class' => 'card mt-3', 'style' => 'max-width:540px']);
    echo html_writer::start_tag('div', ['class' => 'card-body']);
    echo html_writer::tag('h5', 'Register with Arina', ['class' => 'card-title mb-3']);

    echo html_writer::start_tag('dl', ['class' => 'row mb-3']);
    echo html_writer::tag('dt', 'Organisation', ['class' => 'col-sm-4']);
    echo html_writer::tag('dd', s($SITE->fullname), ['class' => 'col-sm-8']);
    echo html_writer::tag('dt', 'Admin email', ['class' => 'col-sm-4']);
    echo html_writer::tag('dd', s($USER->email), ['class' => 'col-sm-8']);
    echo html_writer::end_tag('dl');

    echo html_writer::tag(
        'p',
        'A verification email will be sent to <strong>' . s($USER->email) .
        '</strong>. Keep this page open until registration is complete.',
        ['class' => 'text-muted small mb-3']
    );

    echo html_writer::tag(
        'button',
        'Register with Arina',
        ['id' => 'arina-register-btn', 'class' => 'btn btn-primary', 'type' => 'button']
    );

    echo html_writer::end_tag('div');
    echo html_writer::end_tag('div');
}

// ── Pending UI (hidden; shown by JS after clicking Register) ───────────────────
echo html_writer::start_tag('div', [
    'id'    => 'arina-pending-ui',
    'class' => 'card mt-3',
    'style' => ARINA_CARD_HIDDEN_STYLE,
]);
echo html_writer::start_tag('div', ['class' => 'card-body text-center py-4']);
echo html_writer::tag('div', '', ['class' => 'spinner-border text-primary mb-3', 'role' => 'status']);
echo html_writer::tag('p', '', ['id' => 'arina-status-text', 'class' => 'mb-1 fw-bold']);
echo html_writer::tag('p', '', ['id' => 'arina-step-text', 'class' => 'text-muted small mb-3']);
echo html_writer::tag(
    'button',
    'Resend Email (60s)',
    [
        'id'       => 'arina-resend-btn',
        'class'    => 'btn btn-outline-secondary btn-sm me-2',
        'type'     => 'button',
        'disabled' => 'disabled',
    ]
);
echo html_writer::tag(
    'a',
    'Start Over',
    ['id' => 'arina-startover-link', 'href' => '#', 'class' => 'btn btn-link btn-sm text-muted']
);
echo html_writer::end_tag('div');
echo html_writer::end_tag('div');

// ── Success UI (hidden; shown by JS on complete) ───────────────────────────────
$settingsUrl = new moodle_url('/admin/settings.php', ['section' => 'local_arina_prism_sense']);
echo html_writer::start_tag('div', [
    'id'    => 'arina-success-ui',
    'class' => 'card mt-3 border-success',
    'style' => ARINA_CARD_HIDDEN_STYLE,
]);
echo html_writer::start_tag('div', ['class' => 'card-body']);
echo html_writer::tag('h5', '&#x2705; Registration complete!', ['class' => 'card-title text-success']);
echo html_writer::tag('p', 'Your plugin is now connected to Arina.', ['class' => 'card-text']);
echo html_writer::link($settingsUrl, '&larr; Back to Plugin Settings', ['class' => 'btn btn-primary mt-2']);
echo html_writer::end_tag('div');
echo html_writer::end_tag('div');

// ── Error UI (hidden; shown by JS on failure) ──────────────────────────────────
echo html_writer::start_tag('div', [
    'id'    => 'arina-error-ui',
    'class' => 'card mt-3 border-danger',
    'style' => ARINA_CARD_HIDDEN_STYLE,
]);
echo html_writer::start_tag('div', ['class' => 'card-body']);
echo html_writer::tag('h5', 'Registration failed', ['class' => 'card-title text-danger']);
echo html_writer::tag('p', '', ['id' => 'arina-error-message', 'class' => 'card-text text-danger']);
echo html_writer::tag(
    'button',
    'Try Again',
    ['class' => 'btn btn-outline-danger mt-2', 'type' => 'button', 'onclick' => 'window.location.reload()']
);
echo html_writer::end_tag('div');
echo html_writer::end_tag('div');

// ── Back link ──────────────────────────────────────────────────────────────────
echo html_writer::tag(
    'p',
    html_writer::link($settingsUrl, '&larr; Back to Plugin Settings', ['class' => 'd-inline-block']),
    ['class' => 'mt-3']
);

// ── Inline JavaScript ──────────────────────────────────────────────────────────
$jsSesskeyVal  = json_encode(sesskey());
$jsAjaxUrl     = json_encode((new moodle_url('/local/arina_prism_sense/register.php'))->out(false));
$jsAdminEmail  = json_encode($USER->email);

echo <<<JSCRIPT
<script>
(function () {
    'use strict';

    var POLL_INTERVAL   = 5000;
    var RESEND_COOLDOWN = 60;
    var SESSKEY         = $jsSesskeyVal;
    var AJAX_URL        = $jsAjaxUrl;
    var ADMIN_EMAIL     = $jsAdminEmail;

    var STATUS_LABELS = {
        'pending_verification': 'Waiting for email verification\u2026',
        'email_verified':       'Email verified! Setting up your organisation\u2026',
        'creating_org':         'Creating organisation\u2026',
        'creating_manager':     'Setting up manager account\u2026',
        'registering_auth':     'Registering authentication\u2026',
        'generating_api_key':   'Generating API key\u2026',
        'provisioning_wallet':  'Provisioning credit wallet\u2026',
        'complete':             'Registration complete!',
        'failed':               'Registration failed.'
    };

    var pollTimer   = null;
    var resendTimer = null;

    var registerCard   = document.getElementById('arina-register-btn') &&
                         document.getElementById('arina-register-btn').closest('.card');
    var registerBtn    = document.getElementById('arina-register-btn');
    var pendingUI      = document.getElementById('arina-pending-ui');
    var successUI      = document.getElementById('arina-success-ui');
    var errorUI        = document.getElementById('arina-error-ui');
    var statusText     = document.getElementById('arina-status-text');
    var stepText       = document.getElementById('arina-step-text');
    var resendBtn      = document.getElementById('arina-resend-btn');
    var startoverLink  = document.getElementById('arina-startover-link');
    var errorMessage   = document.getElementById('arina-error-message');

    function buildUrl(action) {
        return AJAX_URL + '?action=' + encodeURIComponent(action) +
               '&sesskey=' + encodeURIComponent(SESSKEY);
    }

    function postAction(action, body) {
        return fetch(buildUrl(action), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body || {})
        }).then(function (r) { return r.json(); });
    }

    function showPendingUI() {
        if (registerCard) { registerCard.style.display = 'none'; }
        pendingUI.style.display  = '';
        successUI.style.display  = 'none';
        errorUI.style.display    = 'none';
        statusText.textContent   = STATUS_LABELS['pending_verification'];
        stepText.textContent     = '';
    }

    function showSuccessUI() {
        pendingUI.style.display = 'none';
        successUI.style.display = '';
    }

    function showErrorUI(message) {
        pendingUI.style.display      = 'none';
        errorUI.style.display        = '';
        errorMessage.textContent     = message || 'An unexpected error occurred.';
    }

    function updateStatusText(status, step, totalSteps) {
        statusText.textContent = STATUS_LABELS[status] || status;
        stepText.textContent   = (step && totalSteps) ? ('Step ' + step + ' of ' + totalSteps) : '';
    }

    function startPolling(sessionId) {
        if (pollTimer) { clearInterval(pollTimer); }
        pollTimer = setInterval(function () {
            postAction('poll_status', { session_id: sessionId })
                .then(function (res) {
                    if (res.status === 'complete') {
                        clearInterval(pollTimer);
                        localStorage.removeItem('arina_reg_session_id');
                        showSuccessUI();
                    } else if (res.status === 'failed') {
                        clearInterval(pollTimer);
                        localStorage.removeItem('arina_reg_session_id');
                        showErrorUI(res.message);
                    } else if (res.status === 'expired') {
                        clearInterval(pollTimer);
                        localStorage.removeItem('arina_reg_session_id');
                        showErrorUI('Session expired. Please register again.');
                    } else {
                        updateStatusText(res.status, res.step, res.total_steps);
                    }
                })
                .catch(function () { /* network hiccup \u2014 keep polling */ });
        }, POLL_INTERVAL);
    }

    function startResendTimer() {
        if (resendTimer) { clearInterval(resendTimer); }
        var seconds = RESEND_COOLDOWN;
        resendBtn.disabled    = true;
        resendBtn.textContent = 'Resend Email (' + seconds + 's)';
        resendTimer = setInterval(function () {
            seconds--;
            if (seconds <= 0) {
                clearInterval(resendTimer);
                resendBtn.disabled    = false;
                resendBtn.textContent = 'Resend Email';
            } else {
                resendBtn.textContent = 'Resend Email (' + seconds + 's)';
            }
        }, 1000);
    }

    // Register button
    if (registerBtn) {
        registerBtn.addEventListener('click', function () {
            registerBtn.disabled    = true;
            registerBtn.textContent = 'Starting\u2026';
            postAction('start_registration', {}).then(function (res) {
                if (res.success) {
                    localStorage.setItem('arina_reg_session_id', res.session_id);
                    showPendingUI();
                    startPolling(res.session_id);
                    startResendTimer();
                } else {
                    registerBtn.disabled    = false;
                    registerBtn.textContent = 'Register with Arina';
                    alert(res.message || res.error || 'Failed to start registration.');
                }
            });
        });
    }

    // Resend button
    if (resendBtn) {
        resendBtn.addEventListener('click', function () {
            postAction('resend_email', { email: ADMIN_EMAIL }).then(function (res) {
                if (res.error === 'expired') {
                    if (pollTimer) { clearInterval(pollTimer); }
                    localStorage.removeItem('arina_reg_session_id');
                    showErrorUI('Session expired. Please register again.');
                    return;
                }
                if (res.error === 'already_registered') {
                    showErrorUI('This account is already registered. Please contact support.');
                    return;
                }
                // Show toast
                var toast = document.createElement('div');
                toast.className   = 'alert alert-success mt-2 py-1 px-2 small';
                toast.textContent = 'Verification email resent!';
                pendingUI.querySelector('.card-body').appendChild(toast);
                setTimeout(function () { toast.remove(); }, 3000);
                startResendTimer();
            });
        });
    }

    // Start Over link
    if (startoverLink) {
        startoverLink.addEventListener('click', function (e) {
            e.preventDefault();
            if (pollTimer)  { clearInterval(pollTimer); }
            if (resendTimer) { clearInterval(resendTimer); }
            localStorage.removeItem('arina_reg_session_id');
            window.location.reload();
        });
    }

    // On page load — resume an in-progress session if one exists
    var savedSessionId = localStorage.getItem('arina_reg_session_id');
    if (savedSessionId) {
        showPendingUI();
        startPolling(savedSessionId);
        startResendTimer();
    }
}());
</script>
JSCRIPT;

echo $OUTPUT->footer();

// ── Action Handlers ────────────────────────────────────────────────────────────

/**
 * Handle action=start_registration
 * POST /organisation/moodle/register → 202 with session_id
 */
function arinaHandleStartRegistration(array $missingFields): void
{
    if (!empty($missingFields)) {
        echo json_encode(['success' => false, 'error' => 'missing_fields', 'fields' => $missingFields]);
        return;
    }

    global $SITE, $USER, $CFG;

    $payload = [
        'organisation' => [
            'name'       => $SITE->fullname,
            'shortname'  => $SITE->shortname,
            'city'       => get_config('moodle', 'city') ?: ($USER->city ?? ''),
            'country'    => get_config('moodle', 'country') ?: ($USER->country ?? ''),
            'moodle_url' => $CFG->wwwroot,
        ],
        'manager' => [
            'username'       => $USER->username,
            'firstname'      => $USER->firstname,
            'lastname'       => $USER->lastname,
            'email'          => $USER->email,
            'moodle_user_id' => (int) $USER->id,
        ],
    ];

    $url = rtrim(IOMAD_SERVICE_URL, '/') . '/organisation/moodle/register';
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [ARINA_CONTENT_TYPE_JSON, ARINA_ACCEPT_JSON],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $raw      = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    echo json_encode(arinaBuildRegistrationResult(
        json_decode($raw, true) ?? [],
        $httpCode,
        $curlErr,
        $USER->email
    ));
}

/**
 * Build the JSON-serialisable result array for a registration API call.
 *
 * @param array  $data      Decoded API response body
 * @param int    $httpCode  HTTP status from the upstream service
 * @param string $curlErr   Non-empty string on cURL transport failure
 * @param string $userEmail Admin e-mail (included in the success payload)
 * @return array
 */
function arinaBuildRegistrationResult(array $data, int $httpCode, string $curlErr, string $userEmail): array
{
    if ($curlErr) {
        return ['success' => false, 'error' => 'network', 'message' => 'Network error: ' . $curlErr];
    }

    if ($httpCode === 202) {
        return [
            'success'     => true,
            'session_id'  => $data['session_id'],
            'admin_email' => $userEmail,
        ];
    }

    $errorMap = [
        409 => [
            'error'   => 'pending',
            'message' => 'A registration is already in progress for this email. Check your inbox or use Resend.',
        ],
        422 => [
            'error'   => 'validation',
            'message' => $data['detail'] ?? $data['message'] ?? 'Validation error.',
        ],
    ];

    $fallbackDetail = $data['detail'] ?? $data['message'] ?? "HTTP $httpCode";
    $errInfo = $errorMap[$httpCode] ?? ['error' => 'network', 'message' => "HTTP $httpCode: $fallbackDetail"];
    return array_merge(['success' => false], $errInfo);
}

/**
 * Handle action=poll_status
 * GET /organisation/registration-status/{session_id}
 * On complete: saves org_id, api_key, org_wallet_owner_id to Moodle config.
 */
function arinaHandlePollStatus(): void
{
    $input     = json_decode(file_get_contents('php://input'), true) ?? [];
    $sessionId = preg_replace('/[^a-f0-9\-]/i', '', (string) ($input['session_id'] ?? ''));

    if (empty($sessionId)) {
        echo json_encode(['success' => false, 'error' => 'missing_session_id']);
        return;
    }

    $url = rtrim(IOMAD_SERVICE_URL, '/') . '/organisation/registration-status/' . rawurlencode($sessionId);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [ARINA_ACCEPT_JSON],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $raw      = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    arinaEmitPollResponse($httpCode, json_decode($raw, true) ?? []);
}

/**
 * Output the JSON response for a poll-status API call.
 * Persists org credentials to Moodle config when status is 'complete'.
 *
 * @param int   $httpCode HTTP status returned by the upstream service
 * @param array $data     Decoded API response body
 */
function arinaEmitPollResponse(int $httpCode, array $data): void
{
    if ($httpCode === 404) {
        echo json_encode([
            'success' => false,
            'status'  => 'expired',
            'message' => 'Session expired. Please start over.',
        ]);
        return;
    }

    $status = $data['status'] ?? 'unknown';

    if ($status === 'complete') {
        $orgId  = $data['org_id']  ?? null;
        $apiKey = $data['api_key'] ?? null;
        if ($orgId) {
            set_config('org_id', $orgId, 'local_arina_prism_sense');
        }
        if ($apiKey) {
            set_config('api_key', $apiKey, 'local_arina_prism_sense');
        }
        if ($orgId) {
            set_config('org_wallet_owner_id', $orgId, 'local_arina_prism_sense');
        }
        echo json_encode(['success' => true, 'status' => 'complete']);
        return;
    }

    if ($status === 'failed') {
        $msg = $data['error_message'] ?? $data['message'] ?? 'Registration failed. Please try again.';
        echo json_encode(['success' => false, 'status' => 'failed', 'message' => $msg]);
        return;
    }

    echo json_encode([
        'success'     => true,
        'status'      => $status,
        'step'        => $data['step']        ?? null,
        'total_steps' => $data['total_steps'] ?? null,
    ]);
}

/**
 * Handle action=resend_email
 * POST /organisation/resend-verification
 */
function arinaHandleResendEmail(): void
{
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);

    if (!$email) {
        echo json_encode(['success' => false, 'error' => 'invalid_email']);
        return;
    }

    $url = rtrim(IOMAD_SERVICE_URL, '/') . '/organisation/resend-verification';
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['email' => $email]),
        CURLOPT_HTTPHEADER     => [ARINA_CONTENT_TYPE_JSON, ARINA_ACCEPT_JSON],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    arinaEmitResendResponse($httpCode);
}

/**
 * Output the JSON response for a resend-verification API call.
 *
 * @param int $httpCode HTTP status returned by the upstream service
 */
function arinaEmitResendResponse(int $httpCode): void
{
    $responseMap = [
        202 => ['success' => true],
        403 => ['success' => false, 'error' => 'already_registered'],
        404 => ['success' => false, 'error' => 'expired'],
    ];

    $response = $responseMap[$httpCode]
        ?? ['success' => false, 'error' => 'network', 'message' => "HTTP $httpCode"];
    echo json_encode($response);
}
