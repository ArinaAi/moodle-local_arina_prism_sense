<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Per-company PRISM Sense settings page.
 *
 * Accessible by:
 *  - Site Admin: can select any IOMAD company and edit its config
 *  - Company Manager (managertype=1 in mdl_company_users): locked to their own company only
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

use local_lecturebot\CompanyConfig;

defined('MOODLE_INTERNAL') || die();

global $USER, $DB, $OUTPUT, $PAGE;

// ── Page setup MUST come before require_login() ───────────────────────────────
$PAGE->set_context(context_system::instance());
$PAGE->set_url(new moodle_url('/local/lecturebot/company_settings.php'));
$PAGE->set_title('PRISM Sense — Company Settings');
$PAGE->set_heading('PRISM Sense — Company Settings');
$PAGE->set_pagelayout('admin');

require_login();

// ── Guard: IOMAD must be installed ────────────────────────────────────────────
if (!CompanyConfig::isIomadInstalled()) {
    throw new moodle_exception(
        'errornoiomad',
        'local_lecturebot',
        '',
        null,
        'IOMAD is not installed. This page is only available in an IOMAD Moodle installation.'
    );
}

// ── Determine user role ───────────────────────────────────────────────────────
$isSiteAdmin    = is_siteadmin();
$companyManager = null; // will hold the company_users row if user is a Company Manager

if (!$isSiteAdmin) {
    // Check if this user is a Company Manager (managertype=1) in any company.
    $companyManager = $DB->get_record_select(
        'company_users',
        'userid = ? AND managertype = 1',
        [$USER->id]
    );

    if (!$companyManager) {
        throw new required_capability_exception(
            context_system::instance(),
            'moodle/site:config',
            'nopermissions',
            ''
        );
    }
}

// ── Resolve which company to show ─────────────────────────────────────────────
if ($isSiteAdmin) {
    // Site Admin can pick any company via ?companyid=X
    $selectedCompanyId = optional_param('companyid', 0, PARAM_INT);
} else {
    // Company Manager is locked to their own company
    $selectedCompanyId = (int) $companyManager->companyid;
}

// ── Process form submission ───────────────────────────────────────────────────
$saved = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_sesskey();

    $postCompanyId = required_param('companyid', PARAM_INT);

    // Security: non-admins can only save their own company.
    if (!$isSiteAdmin && $postCompanyId !== (int) $companyManager->companyid) {
        throw new moodle_exception('accessdenied', 'admin');
    }

    $apiKey = optional_param('api_key', '', PARAM_TEXT);

    CompanyConfig::save($postCompanyId, ['api_key' => $apiKey]);
    $selectedCompanyId = $postCompanyId;
    $saved = true;
}

// Update URL with selected company for proper breadcrumb/history
if ($selectedCompanyId) {
    $PAGE->set_url(new moodle_url(
        '/local/lecturebot/company_settings.php',
        ['companyid' => $selectedCompanyId]
    ));
}

// ── Load all companies (for Site Admin dropdown) ───────────────────────────────
$allCompanies = [];
if ($isSiteAdmin) {
    $allCompanies = $DB->get_records('company', null, 'name ASC', 'id, name, shortname, code');
}

// ── Load existing config for selected company ─────────────────────────────────
$existingConfig   = null;
$selectedCompany  = null;
if ($selectedCompanyId) {
    $existingConfig  = CompanyConfig::getForCompany($selectedCompanyId);
    $selectedCompany = $DB->get_record('company', ['id' => $selectedCompanyId], 'id, name, shortname, code');
}

echo $OUTPUT->header();
echo $OUTPUT->heading('PRISM Sense — Per-Company Configuration');

// ── Saved confirmation ────────────────────────────────────────────────────────
if ($saved) {
    echo $OUTPUT->notification(
        'Settings saved successfully for ' . s($selectedCompany->name ?? 'company') . '.',
        'notifysuccess'
    );
}

// ── Site Admin: company picker ────────────────────────────────────────────────
if ($isSiteAdmin && !empty($allCompanies)): ?>
<form method="get" action="" style="margin-bottom:1.5rem;">
    <label for="companyid"><strong>Select Company:</strong></label>
    <select id="companyid" name="companyid" onchange="this.form.submit()" style="margin-left:0.5rem;">
        <option value="">— choose a company —</option>
        <?php foreach ($allCompanies as $co): ?>
        <option value="<?php echo (int)$co->id; ?>"
            <?php echo ($co->id == $selectedCompanyId) ? 'selected' : ''; ?>>
            <?php echo s($co->name); ?>
            <?php if ($co->code): ?>(<?php echo s($co->code); ?>)<?php endif; ?>
        </option>
        <?php endforeach; ?>
    </select>
    <noscript><button type="submit">Go</button></noscript>
</form>
<?php endif;

// ── Config form ───────────────────────────────────────────────────────────────
if ($selectedCompanyId && $selectedCompany): ?>

<div style="max-width:600px;">
    <p>
        <strong>Company:</strong> <?php echo s($selectedCompany->name); ?><br>
        <strong>Arina Tenant ID (from IOMAD Company Code):</strong>
        <?php if ($selectedCompany->code): ?>
            <code><?php echo s($selectedCompany->code); ?></code>
            <small style="color:#666;">— set in IOMAD Company Management → Edit → Code field</small>
        <?php else: ?>
            <span style="color:red;">⚠ Not set — edit the company in IOMAD and enter the Arina Tenant ID
                in the <strong>Code</strong> field.</span>
        <?php endif; ?>
    </p>

    <form method="post" action="">
        <input type="hidden" name="sesskey" value="<?php echo sesskey(); ?>">
        <input type="hidden" name="companyid" value="<?php echo (int)$selectedCompanyId; ?>">

        <div style="margin-bottom:1rem;">
            <label for="api_key"><strong>Arina API Key</strong></label><br>
            <small style="color:#666;">The API key assigned to this company by Arina.</small><br>
            <input type="password"
                   id="api_key"
                   name="api_key"
                   value="<?php echo s($existingConfig->api_key ?? ''); ?>"
                   style="width:100%;max-width:400px;margin-top:0.4rem;padding:0.4rem;"
                   autocomplete="new-password"
                   placeholder="sk-...">
        </div>

        <?php if (!empty($existingConfig->org_wallet_owner_id)): ?>
        <div style="margin-bottom:1rem;">
            <label><strong>Org Wallet UUID</strong> <small>(auto-managed)</small></label><br>
            <code style="color:#666;font-size:0.85em;"><?php echo s($existingConfig->org_wallet_owner_id); ?></code>
        </div>
        <?php endif; ?>

        <button type="submit" class="btn btn-primary">Save Company Settings</button>
    </form>
</div>

<?php elseif ($isSiteAdmin): ?>
<p class="text-muted">Select a company above to configure its settings.</p>
<?php endif;

echo $OUTPUT->footer();
