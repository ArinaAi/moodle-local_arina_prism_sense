<?php
/**
 * API: Get Teacher's Credit Balance
 *
 * Returns the logged-in teacher's sub-user wallet balance.
 * Does NOT require admin capabilities — any logged-in user can check their own balance.
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/cms/CreditServiceClient.php');

require_login();

header('Content-Type: application/json');

try {
    // 1. Determine which wallet UUID to use based on user role
    $uuid = null;
    $client = new \local_lecturebot\cms\CreditServiceClient();

    if (has_capability('moodle/site:config', context_system::instance())) {
        // User is a site admin. Use the organization\'s main wallet.
        $uuid = get_config('local_lecturebot', 'org_wallet_owner_id');
        
        // Ensure org wallet exists
        if (empty($uuid)) {
            $uuid = $client->generateV4UUID();
            set_config('org_wallet_owner_id', $uuid, 'local_lecturebot');
            $client->createWallet($uuid, 'ORGANIZATION');
        }
    } else {
        // Normal teacher. Use their specific sub-user wallet UUID.
        $uuid = get_user_preferences('lecturebot_wallet_sub_user_id', null, $USER->id);
    }

    if (empty($uuid)) {
        // No wallet has been created for this user yet
        echo json_encode([
            'success' => true,
            'data' => [
                'available_balance' => 0,
                'current_balance' => 0,
                'reserved_credits' => 0,
                'has_wallet' => false,
            ]
        ]);
        exit;
    }

    // 2. Fetch balance from credit service using the owner UUID
    $client = new \local_lecturebot\cms\CreditServiceClient();
    $response = $client->getBalance($uuid);

    if ($response['status'] >= 200 && $response['status'] < 300) {
        $balanceData = $response['data'];

        echo json_encode([
            'success' => true,
            'data' => [
                'available_balance' => isset($balanceData['available_balance']) ?
                    (float)$balanceData['available_balance'] : 0,
                'current_balance' => isset($balanceData['current_balance']) ?
                    (float)$balanceData['current_balance'] : 0,
                'reserved_credits' => isset($balanceData['reserved_credits']) ?
                    (float)$balanceData['reserved_credits'] : 0,
                'has_wallet' => true,
            ]
        ]);
    } else {
        // Wallet UUID exists but credit service returned an error (e.g. wallet deleted externally)
        http_response_code($response['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch balance from credit service',
            'error' => $response['data']
        ]);
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
