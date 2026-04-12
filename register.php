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
 * Presents a simple form that asks the admin for a new password.
 * On submit it calls the Arina Auth Service to:
 *   1. Register a new account  POST /register
 *   2. Generate an API Key     POST /generate-api-key
 *
 * The returned org_id and api_key are then saved into Moodle's global
 * config so the plugin works immediately with no further manual steps.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

// Only site admins may access this page.
admin_externalpage_setup('local_arina_prism_sense_register');
require_capability('moodle/site:config', context_system::instance());

$PAGE->set_url(new moodle_url('/local/arina_prism_sense/register.php'));
$PAGE->set_title('Arina.ai Registration');
$PAGE->set_heading('Register PRISM Sense with Arina.ai');

// ── Auth service base URL ──────────────────────────────────────────────────────
// Update this constant to point to your production endpoint when ready.
define('ARINA_AUTH_BASE_URL', 'https://demo.arina.ai/dev2230/service/arina_auth_service');

// ── Process form submission ────────────────────────────────────────────────────
$error   = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_sesskey();

    $password = optional_param('arina_password', '', PARAM_RAW);

    if (empty(trim($password))) {
        $error = 'Please enter a password for your new Arina.ai account.';
    } else {
        // Build registration payload using the logged-in admin's Moodle profile.
        $email    = $USER->email;
        $username = $USER->username;
        $fullName = fullname($USER);

        // Re-read current config so we know whether to register or just re-key.
        $existingApiKey = get_config('local_arina_prism_sense', 'api_key');
        $alreadyRegistered = !empty($existingApiKey);
        $orgIdFromReg = null;

        if (!$alreadyRegistered) {
            // ── Step 1: Register ─────────────────────────────────────────────
            $registerResponse = sendAuthRequest('/register', [
                'username'  => $username,
                'email'     => $email,
                'password'  => $password,
                'full_name' => $fullName,
            ]);

            if (!$registerResponse['ok']) {
                // If the account already exists on Arina, treat it as registered and proceed.
                $msg = strtolower($registerResponse['message']);
                if (strpos($msg, 'already exists') !== false || strpos($msg, 'already registered') !== false) {
                    $alreadyRegistered = true;
                } else {
                    $error = 'Registration failed: ' . $registerResponse['message'];
                }
            } else {
                $orgIdFromReg = $registerResponse['data']['org_id']
                               ?? $registerResponse['data']['id']
                               ?? $registerResponse['data']['user_id']
                               ?? null;
            }
        }

        if (empty($error)) {
            // ── Step 2: Generate API Key ─────────────────────────────────────
            $apiKeyResponse = sendAuthRequest('/generate-api-key', [
                'username' => $username,
                'password' => $password,
            ]);

            if (!$apiKeyResponse['ok']) {
                $error = 'API Key generation failed: ' . $apiKeyResponse['message'];
            } else {
                // ── Save org_id and api_key into Moodle config ────────────────
                $orgId  = $orgIdFromReg
                          ?? $apiKeyResponse['data']['org_id']
                          ?? $apiKeyResponse['data']['user_id']
                          ?? null;
                $apiKey = $apiKeyResponse['data']['api_key']
                          ?? $apiKeyResponse['data']['key']
                          ?? null;

                if ($orgId) {
                    set_config('org_id', $orgId, 'local_arina_prism_sense');
                }
                if ($apiKey) {
                    set_config('api_key', $apiKey, 'local_arina_prism_sense');
                }

                $success = 'Successfully configured! Your API Key has been saved.';
                if ($orgId) { $success .= " Org ID: <strong>{$orgId}</strong>."; }
                if ($apiKey) { $success .= " API Key: <strong>{$apiKey}</strong>."; }
            }
        }
    }
}

// ── Render page ───────────────────────────────────────────────────────────────
echo $OUTPUT->header();

// Show existing config values so the admin knows what is already set.
$currentOrgId  = get_config('local_arina_prism_sense', 'org_id');
$currentApiKey = get_config('local_arina_prism_sense', 'api_key');

if ($currentOrgId || $currentApiKey) {
    echo $OUTPUT->notification(
        'Currently configured — Org ID: <strong>' . ($currentOrgId ?: '(not set)') . '</strong> · ' .
        'API Key: <strong>' . ($currentApiKey ? '••••' . substr($currentApiKey, -6) : '(not set)') . '</strong>',
        'info'
    );
}

if ($error) {
    echo $OUTPUT->notification($error, 'error');
}
if ($success) {
    echo $OUTPUT->notification($success, 'success');
}

// Registration form.
echo html_writer::start_tag('div', ['class' => 'card mt-3', 'style' => 'max-width:520px']);
echo html_writer::start_tag('div', ['class' => 'card-body']);
echo html_writer::tag('h5', 'Register with Arina.ai', ['class' => 'card-title']);
echo html_writer::tag(
    'p',
    'Your Moodle username (<strong>' . s($USER->username) . '</strong>) and email ' .
    '(<strong>' . s($USER->email) . '</strong>) will be submitted to the Arina Auth Service. ' .
    'Choose a password for your new Arina.ai account.',
    ['class' => 'card-text']
);

$formAction = new moodle_url('/local/arina_prism_sense/register.php');
echo html_writer::start_tag('form', ['method' => 'POST', 'action' => $formAction]);
echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]);

echo html_writer::start_tag('div', ['class' => 'form-group mb-3']);
echo html_writer::tag('label', 'Choose a Password', ['for' => 'arina_password', 'class' => 'form-label fw-bold']);
echo html_writer::empty_tag('input', [
    'type'        => 'password',
    'class'       => 'form-control',
    'id'          => 'arina_password',
    'name'        => 'arina_password',
    'placeholder' => 'At least 8 characters',
    'required'    => 'required',
    'autocomplete' => 'new-password',
]);
echo html_writer::tag(
    'small',
    'This password is used to generate your API key. Store it safely.',
    ['class' => 'form-text text-muted']
);
echo html_writer::end_tag('div');

$buttonLabel = ($currentApiKey)
    ? 'Re-generate API Key'
    : 'Register & Generate API Key';

echo html_writer::tag(
    'button',
    $buttonLabel,
    ['type' => 'submit', 'class' => 'btn btn-primary']
);

echo html_writer::end_tag('form');
echo html_writer::end_tag('div');
echo html_writer::end_tag('div');

// Back link.
$settingsUrl = new moodle_url('/admin/settings.php', ['section' => 'local_arina_prism_sense']);
echo html_writer::tag(
    'p',
    html_writer::link($settingsUrl, '← Back to Plugin Settings', ['class' => 'mt-3 d-inline-block'])
);

echo $OUTPUT->footer();

// ── Helper: HTTP POST to Arina Auth Service ────────────────────────────────────

/**
 * Makes a JSON POST request to the Arina Auth Service.
 *
 * @param string $path   Endpoint path, e.g. '/register'
 * @param array  $body   Associative array to send as JSON body
 * @return array{ok: bool, message: string, data: array}
 */
function sendAuthRequest(string $path, array $body): array
{
    $url     = ARINA_AUTH_BASE_URL . $path;
    $payload = json_encode($body);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $raw      = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    $response = ['ok' => false, 'message' => '', 'data' => []];

    if ($curlErr) {
        $response['message'] = 'Network error: ' . $curlErr;
    } else {
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $response['message'] = "Unexpected response (HTTP {$httpCode}): " . $raw;
        } else {
            // Treat any 2xx as success.
            if ($httpCode >= 200 && $httpCode < 300) {
                $response['ok'] = true;
                $response['message'] = 'OK';
            } else {
                $response['message'] = $decoded['message']
                    ?? $decoded['detail']
                    ?? $decoded['error']
                    ?? "HTTP {$httpCode}";
            }
            $response['data'] = $decoded;
        }
    }

    return $response;
}
