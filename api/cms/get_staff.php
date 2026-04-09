<?php
/**
 * CMS API: Get Staff Members
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/CreditServiceClient.php');

// Require login; allow Site Admins and IOMAD Company Managers.
// requireCmsAccess() also bootstraps CompanyConfig so getCompanyId() is ready.
require_login();
\local_arina_prism_sense\CompanyConfig::requireCmsAccess();

header('Content-Type: application/json');

try {
    global $DB, $CFG;
    $client = new \local_arina_prism_sense\cms\CreditServiceClient();

    // ── 1. Org wallet + hierarchy ─────────────────────────────────────────────
    $orgUuid    = $client->getOrInitializeOrgWallet();
    $orgWalletId = $client->resolveWalletId($orgUuid);
    $hierarchyRes = $client->getHierarchy($orgWalletId);

    $subWallets = [];
    if (
        $hierarchyRes['status'] >= 200 && $hierarchyRes['status'] < 300
        && !empty($hierarchyRes['data']['child_wallets'])
    ) {
        foreach ($hierarchyRes['data']['child_wallets'] as $child) {
            $walletId       = $child['wallet_id'] ?? null;
            $reservedCredits = 0;

            if ($walletId) {
                $balRes = $client->getWalletBalance($walletId);
                if ($balRes['status'] >= 200 && $balRes['status'] < 300 && !empty($balRes['data'])) {
                    $reservedCredits = (float) ($balRes['data']['reserved_credits'] ?? 0);
                }
            }

            $subWallets[$child['owner_id']] = [
                'wallet_id'       => $walletId,
                'balance'         => isset($child['balance']) ? (float) $child['balance'] : 0,
                'reserved_credits' => $reservedCredits,
            ];
        }
    }

    // ── 2. Determine scope: company-scoped (Company Manager) or site-wide (Admin) ──
    $scopedCompanyId = \local_arina_prism_sense\CompanyConfig::getCompanyId();
    $isCompanyManager = !is_siteadmin() && $scopedCompanyId !== null;

    // ── 3. Build Moodle user lists ────────────────────────────────────────────
    $teachers   = [];
    $adminUsers = [];

    if ($isCompanyManager) {
        // Company Manager: fetch only users who belong to this IOMAD company
        // and hold a teacher/editing-teacher role anywhere on site.
        // Site admins are excluded — they belong to the global scope, not a company.
        $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.email, u.department
                FROM {user} u
                JOIN {company_users} cu ON cu.userid = u.id
                JOIN {role_assignments} ra ON ra.userid = u.id
                JOIN {role} r ON r.id = ra.roleid
                WHERE u.deleted = 0
                  AND u.suspended = 0
                  AND cu.companyid = :companyid
                  AND r.shortname IN ('editingteacher', 'teacher')";

        $teachers = $DB->get_records_sql($sql, ['companyid' => $scopedCompanyId]);
        // adminUsers stays empty — company managers don't see site admins.
    } else {
        // Site Admin: original site-wide query, excluding site admins from the
        // teacher list (they are returned separately in $adminUsers).
        $siteAdmins = isset($CFG->siteadmins) ? $CFG->siteadmins : '';
        $adminIds   = array_filter(array_map('intval', explode(',', $siteAdmins)));

        $excludeClause = '';
        $params        = [];
        if (!empty($adminIds)) {
            list($inSql, $params) = $DB->get_in_or_equal($adminIds, SQL_PARAMS_QM, 'param', false);
            $excludeClause = "AND u.id {$inSql}";
        }

        $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.email, u.department
                FROM {user} u
                JOIN {role_assignments} ra ON ra.userid = u.id
                JOIN {role} r ON r.id = ra.roleid
                WHERE u.deleted = 0 AND u.suspended = 0
                  AND r.shortname IN ('editingteacher', 'teacher')
                  {$excludeClause}";

        $teachers = $DB->get_records_sql($sql, $params);

        if (!empty($adminIds)) {
            list($adminInSql, $adminParams) = $DB->get_in_or_equal($adminIds, SQL_PARAMS_QM, 'aparam');
            $adminSql   = "SELECT u.id, u.firstname, u.lastname, u.email, u.department
                           FROM {user} u
                           WHERE u.deleted = 0 AND u.suspended = 0 AND u.id {$adminInSql}";
            $adminUsers = $DB->get_records_sql($adminSql, $adminParams);
        }
    }

    // ── 4. Helper: build a single staff row ───────────────────────────────────
    $buildRow = function ($user, $isAdmin) use ($subWallets) {
        $uuid            = get_user_preferences('arina_prism_sense_wallet_sub_user_id', null, $user->id);
        $balance         = 0;
        $reservedCredits = 0;
        $status          = 'pending';
        $walletId        = null;

        if ($uuid && isset($subWallets[$uuid])) {
            $status          = 'active';
            $balance         = $subWallets[$uuid]['balance'];
            $walletId        = $subWallets[$uuid]['wallet_id'];
            $reservedCredits = $subWallets[$uuid]['reserved_credits'];
        }

        $defaultDepartment = $isAdmin ? 'Administrator' : 'Faculty';
        return [
            'id'               => $user->id,
            'uuid'             => $uuid,
            'wallet_id'        => $walletId,
            'name'             => fullname($user),
            'email'            => $user->email,
            'department'       => !empty($user->department) ? $user->department : $defaultDepartment,
            'status'           => $status,
            'balance'          => $balance,
            'reserved_credits' => $reservedCredits,
            'is_admin'         => $isAdmin,
        ];
    };

    // ── 5. Assemble response ──────────────────────────────────────────────────
    $staffData = [];

    // Site admins first (only visible to site-wide admins)
    foreach ($adminUsers as $admin) {
        $staffData[] = $buildRow($admin, true);
    }

    foreach ($teachers as $t) {
        $staffData[] = $buildRow($t, false);
    }

    echo json_encode(['success' => true, 'data' => $staffData]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
