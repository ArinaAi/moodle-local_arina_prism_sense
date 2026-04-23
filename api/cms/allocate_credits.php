<?php
/**
 * CMS API: Allocate Credits
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
require_login();
\local_arina_prism_sense\CompanyConfig::requireCmsAccess();

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
    $client = new \local_arina_prism_sense\cms\CreditServiceClient();

    // Org Wallet: resolve owner UUID -> wallet ID
    // The allocation API requires actual wallet IDs, not owner UUIDs
    $orgUuid = $client->getOrInitializeOrgWallet();
    $orgWalletId = $client->resolveWalletId($orgUuid);

    // Resolve the org admin's Arina user_id — this is the owner_id stored on the
    // org wallet by the IOMAD registration service, required as performed_by_user_id.
    // (On the IOMAD-provisioned setup, $orgUuid from config is NOT the wallet owner_id.)
    $adminProfile      = $client->getSubUserProfile((int) $USER->id);
    $performedByUserId = $adminProfile['user_id'] ?? $orgUuid;

    // Register sub-user in Arina (idempotent) and resolve wallet_id.
    // 200 = newly created (wallet_id in response); 409 = already exists (falls back to profile API).
    $subUserProfile = $client->ensureSubUserRegistered($targetUserId);
    $targetWalletId = $subUserProfile['wallet_id'];

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
        // performed_by_user_id must be the org wallet owner UUID (the source wallet's owner).
        $response = $client->allocateCredits($orgWalletId, [$targetWalletId], $amount, $performedByUserId);
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

        // --- Check Organization Balance Threshold ---
        if ($action === 'distribute') {
            try {
                // The wallet balance could have been reduced during distribution.
                $orgBalanceRes = $client->getWalletBalance($orgWalletId);
                if ($orgBalanceRes['status'] >= 200 && $orgBalanceRes['status'] < 300) {
                    $newBalance = floatval($orgBalanceRes['data']['available_balance'] ?? 0);

                    // Count subwallets for dynamic threshold (100 * n)
                    $hierarchyRes = $client->getHierarchy($orgWalletId);
                    $subWalletCount = 0;
                    if (
                        $hierarchyRes['status'] >= 200 &&
                        $hierarchyRes['status'] < 300 &&
                        !empty($hierarchyRes['data']['child_wallets'])
                    ) {
                        $subWalletCount = count($hierarchyRes['data']['child_wallets']);
                    }
                    $subWalletCount = max(1, $subWalletCount); // Avoid 0 threshold if no subwallets
                    $thresholdAmount = 100.0 * $subWalletCount;

                    $safeId = substr(preg_replace('/[^a-zA-Z0-9]/', '', $orgWalletId), 0, 10);
                    $cacheKey = 'low_credits_org_' . $safeId;
                    $lastState = get_config('local_arina_prism_sense', $cacheKey) ?: 'ok';
                    $currentState = 'ok';
                    $isZero = false;

                    if ($newBalance <= 0) {
                        $currentState = 'zero';
                        $isZero = true;
                    } elseif ($newBalance < $thresholdAmount) {
                        $currentState = 'low';
                    }

                    if ($currentState !== 'ok' && $lastState !== $currentState) {
                        require_once(__DIR__ . '/../../classes/EmailNotifier.php');
                        $admins = \local_arina_prism_sense\Utils::getAdminsAndCompanyManagers($USER->id);
                        foreach ($admins as $adminObj) {
                            \local_arina_prism_sense\EmailNotifier::sendLowCreditsAdmins(
                                $adminObj,
                                $newBalance,
                                $thresholdAmount,
                                $isZero
                            );
                        }
                        set_config($cacheKey, $currentState, 'local_arina_prism_sense');
                    } elseif ($currentState === 'ok' && $lastState !== 'ok') {
                        set_config($cacheKey, 'ok', 'local_arina_prism_sense');
                    }
                }
            } catch (\Throwable $e) {
                // Log and silently continue so the JSON response doesn't break
                error_log("LectureBot: Error checking org credits threshold: " . $e->getMessage());
            }
        }
        // --- End Threshold Check ---

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
