<?php
/**
 * CMS API: Allocate Credits
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['target_user_id']) || !isset($input['amount']) || !isset($input['action'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields: target_user_id, amount, action']);
    exit;
}

$targetUserId = (int) $input['target_user_id'];
$amount = (float) $input['amount'];
$action = $input['action']; // 'distribute' or 'recall'

if ($amount <= 0 || floor($amount) != $amount) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Amount must be a whole number greater than zero']);
    exit;
}

try {
    global $USER;
    $client = new \local_lecturebot\cms\CreditServiceClient();

    // Org Wallet: resolve owner UUID -> wallet ID
    // The allocation API requires actual wallet IDs, not owner UUIDs
    $orgUuid = $client->getOrInitializeOrgWallet();
    $orgWalletId = $client->resolveWalletId($orgUuid);

    // Target Wallet: JIT creation if needed, returns wallet ID directly
    $targetWalletId = $client->getOrInitializeSubUserWallet($targetUserId);

    // Determine direction and authorization
    if ($action === 'distribute') {
        // For distribute, check if the organization has sufficient balance
        $orgBalanceRes = $client->getWalletBalance($orgWalletId);
        if ($orgBalanceRes['status'] >= 200 && $orgBalanceRes['status'] < 300) {
            $availableBalance = floatval($orgBalanceRes['data']['available_balance'] ?? 0);
            if ($availableBalance < $amount) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => "Insufficient organization balance!"
                ]);
                exit;
            }
        }

        // Perform allocation: org -> sub-user
        $response = $client->allocateCredits($orgWalletId, [$targetWalletId], $amount, $orgUuid);
    } elseif ($action === 'recall') {
        // For recall, check if staff has sufficient balance before calling the API
        $staffBalanceRes = $client->getWalletBalance($targetWalletId);
        if ($staffBalanceRes['status'] >= 200 && $staffBalanceRes['status'] < 300) {
            $availableBalance = floatval($staffBalanceRes['data']['available_balance'] ?? 0);
            if ($availableBalance < $amount) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => "Insufficient balance!"
                ]);
                exit;
            }
        }

        // Use the dedicated reclaim endpoint: POST /wallets/{sub_wallet_id}/reclaim
        $response = $client->reclaimCredits($targetWalletId, $amount, 'Admin recall via CMS dashboard');
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action. Must be distribute or recall']);
        exit;
    }

    if ($response['status'] >= 200 && $response['status'] < 300) {
        $successMessage = ($action === 'recall') ? 'Credits successfully reclaimed' : 'Credits successfully allocated';
        echo json_encode([
            'success' => true,
            'message' => $successMessage
        ]);
    } else {
        $backendError = '';
        // Extract specific error detail if available
        if (isset($response['data']['detail'])) {
            if (is_string($response['data']['detail'])) {
                $backendError = $response['data']['detail'];
            } elseif (is_array($response['data']['detail'])) {
                $errorMsgs = [];
                foreach ($response['data']['detail'] as $errObj) {
                    if (isset($errObj['msg'])) {
                        $errorMsgs[] = $errObj['msg'];
                    } elseif (is_string($errObj)) {
                        $errorMsgs[] = $errObj;
                    }
                }
                if (!empty($errorMsgs)) {
                    $backendError = implode(', ', $errorMsgs);
                } else {
                    $backendError = json_encode($response['data']['detail']);
                }
            }
        } elseif (is_string($response['data'])) {
            $backendError = $response['data'];
        }

        // Map technical backend errors to user-friendly messages
        $errorMessage = 'Allocation failed. Please try again or contact support.';
        if (stripos($backendError, 'Insufficient active batch credits') !== false) {
            if ($action === 'recall') {
                $errorMessage = "Cannot recall credits:
                The user's allocated credits have already been consumed or have expired.";
            } else {
                $errorMessage = "Cannot distribute credits: The organization's credit
                batches have been fully consumed or have expired. Please add more credits.";
            }
        } elseif (stripos($backendError, 'greater than 0') !== false) {
            $errorMessage = "Please enter a valid credit amount greater than 0.";
        } elseif (!empty($backendError)) {
            // Fallback for other backend errors
            $errorMessage = $backendError;
        }

        http_response_code($response['status']);
        echo json_encode([
            'success' => false,
            'message' => $errorMessage
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
