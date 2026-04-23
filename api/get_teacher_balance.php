<?php
/**
 * API: Get Teacher's Credit Balance
 *
 * Returns the logged-in user's personal wallet balance.
 * Works for both admins (personal wallet, distinct from org wallet) and sub-users.
 * Does NOT require admin capabilities — any logged-in user can check their own balance.
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/cms/CreditServiceClient.php');

require_login();
\local_arina_prism_sense\CompanyConfig::bootstrap($USER->id);

header('Content-Type: application/json');

try {
    $client = new \local_arina_prism_sense\cms\CreditServiceClient();

    // Resolve wallet_id via the cached profile endpoint.
    // Uses a browser cookie as a 24-hour cache. On a miss, calls
    // ensureSubUserRegistered() which will register + provision a wallet if needed.
    try {
        $profile  = $client->getSubUserProfileCached((int) $USER->id);
        $walletId = $profile['wallet_id'] ?? null;
    } catch (\local_arina_prism_sense\cms\CreditServiceException $e) {
        // User not yet registered in Arina — no wallet exists yet.
        $walletId = null;
    }

    if (empty($walletId)) {
        echo json_encode([
            'success' => true,
            'data' => [
                'available_balance' => 0,
                'current_balance'   => 0,
                'reserved_credits'  => 0,
                'has_wallet'        => false,
            ]
        ]);
        exit;
    }

    // Fetch balance using the resolved wallet_id directly.
    $response = $client->getWalletBalance($walletId);

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
