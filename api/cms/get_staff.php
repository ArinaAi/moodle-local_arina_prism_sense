<?php
/**
 * CMS API: Get Staff Members
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/CreditServiceClient.php');

// Require login and admin cap
require_login();
$context = context_system::instance();
require_capability('moodle/site:config', $context);

header('Content-Type: application/json');

try {
    global $DB;
    $client = new \local_lecturebot\cms\CreditServiceClient();

    // 1. Fetch Org Wallet ID and Hierarchy (to get balances of all subusers)
    $orgUuid = $client->getOrInitializeOrgWallet();

    // Resolve owner UUID -> wallet ID (hierarchy API requires wallet_id)
    $orgWalletId = $client->resolveWalletId($orgUuid);
    $hierarchyRes = $client->getHierarchy($orgWalletId);

    $subWallets = [];
    if (
        $hierarchyRes['status'] >= 200 && $hierarchyRes['status'] <
        300 && !empty($hierarchyRes['data']['child_wallets'])
    ) {
        foreach ($hierarchyRes['data']['child_wallets'] as $child) {
            $walletId = $child['wallet_id'] ?? null;
            $reservedCredits = 0;

            // Fetch detailed balance to get reserved_credits
            if ($walletId) {
                $balRes = $client->getWalletBalance($walletId);
                if ($balRes['status'] >= 200 && $balRes['status'] < 300 && !empty($balRes['data'])) {
                    $reservedCredits = (float) ($balRes['data']['reserved_credits'] ?? 0);
                }
            }

            $subWallets[$child['owner_id']] = [
                'wallet_id' => $walletId,
                'balance' => isset($child['balance']) ? (float) $child['balance'] : 0,
                'reserved_credits' => $reservedCredits,
            ];
        }
    }

    // 2. Fetch all Moodle teachers (excluding site admins)
    $siteAdmins = isset($CFG->siteadmins) ? $CFG->siteadmins : '';
    $excludeIds = array_filter(explode(',', $siteAdmins));

    $excludeClause = '';
    $params = [];
    if (!empty($excludeIds)) {
        list($inSql, $params) = $DB->get_in_or_equal($excludeIds, SQL_PARAMS_QM, 'param', false); // false = NOT IN
        $excludeClause = "AND u.id {$inSql}";
    }

    $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.email, u.department
            FROM {user} u
            JOIN {role_assignments} ra ON ra.userid = u.id
            JOIN {role} r ON r.id = ra.roleid
            WHERE u.deleted = 0 AND u.suspended = 0 AND r.shortname IN ('editingteacher', 'teacher')
            {$excludeClause}";

    $teachers = $DB->get_records_sql($sql, $params);

    $staffData = [];
    if ($teachers) {
        foreach ($teachers as $t) {
            $uuid = get_user_preferences('lecturebot_wallet_sub_user_id', null, $t->id);

            $balance = 0;
            $reservedCredits = 0;
            $status = 'pending'; // no wallet yet
            $walletId = null;

            if ($uuid && isset($subWallets[$uuid])) {
                $status = 'active';
                $balance = $subWallets[$uuid]['balance'];
                $walletId = $subWallets[$uuid]['wallet_id'];
                $reservedCredits = $subWallets[$uuid]['reserved_credits'];
            }

            $staffData[] = [
                'id' => $t->id,  // Moodle ID
                'uuid' => $uuid,   // Credit Service Owner ID
                'wallet_id' => $walletId,
                'name' => fullname($t),
                'email' => $t->email,
                'department' => !empty($t->department) ? $t->department : 'Faculty',
                'status' => $status,
                'balance' => $balance,
                'reserved_credits' => $reservedCredits,
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $staffData
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
