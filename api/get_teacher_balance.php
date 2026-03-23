<?php
/**
 * API: Get Teacher's Credit Balance
 *
 * Returns the logged-in user's personal wallet balance.
 * Works for both admins (personal wallet, distinct from org wallet) and sub-users.
 * Does NOT require admin capabilities — any logged-in user can check their own balance.
 *
 * @package    local_lecturebot
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/cms/CreditServiceClient.php');

require_login();

header('Content-Type: application/json');

try {
    // 1. Get this user's personal wallet UUID (same key for admins and sub-users)
    $uuid = null;
    $client = new \local_lecturebot\cms\CreditServiceClient();

    // All users — admins and sub-users alike — use their personal lecturebot_wallet_sub_user_id.
    // An admin's personal wallet is created JIT on first allocation from the org wallet,
    // so it may not exist yet (uuid will be empty → return has_wallet: false below).
    $uuid = get_user_preferences('lecturebot_wallet_sub_user_id', null, $USER->id);

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
