<?php
/**
 * CMS API: Purchase Credits (Mock/Stub for Razorpay)
 *
 * Creates an acquisition in the Arina Credit Service and auto-confirms it,
 * simulating a completed purchase without an actual payment gateway.
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

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // In a real scenario, the frontend should send the exact package_id.
    $packageId = isset($input['package_id']) ? $input['package_id'] : null;
    $couponCode = isset($input['coupon_code']) ? trim($input['coupon_code']) : null;

    // If no package_id is provided, return an error.
    // We no longer create mock packages on the fly for production flow.
    if (!$packageId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Package ID is required']);
        exit;
    }

    $client = new \local_lecturebot\cms\CreditServiceClient();

    // 1. Resolve the Org Wallet
    $orgOwnerUuid = $client->getOrInitializeOrgWallet();
    $walletRes = $client->getWalletByOwner($orgOwnerUuid);

    // If wallet doesn't exist yet, create it
    if ($walletRes['status'] == 404) {
        $createRes = $client->createWallet($orgOwnerUuid, 'ORGANIZATION');
        if ($createRes['status'] < 200 || $createRes['status'] >= 300) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create organization wallet',
                'details' => $createRes['data']
            ]);
            exit;
        }
        $walletId = $createRes['data']['id'];
    } elseif ($walletRes['status'] >= 200 && $walletRes['status'] < 300) {
        $walletId = $walletRes['data']['id'];
    } else {
        http_response_code($walletRes['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Could not resolve organization wallet',
            'details' => $walletRes['data']
        ]);
        exit;
    }
    
    // If no package_id provided from frontend, we must look up a valid package
    // If no package_id is provided, return an error.
    // We no longer create mock packages on the fly for production flow.
    if (!$packageId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Package ID is required']);
        exit;
    }

    // 2. Create the acquisition using the Org Owner UUID as user_id
    $acqRes = $client->createAcquisition($orgOwnerUuid, $packageId, $couponCode);
    if ($acqRes['status'] < 200 || $acqRes['status'] >= 300) {
        http_response_code($acqRes['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to create acquisition',
            'details' => $acqRes['data']
        ]);
        exit;
    }

    $acquisitionId = $acqRes['data']['id'] ?? $acqRes['data']['acquisition_id'] ?? null;
    if (!$acquisitionId) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Acquisition created but no ID was returned',
            'details' => $acqRes['data']
        ]);
        exit;
    }

    // Return the acquisition details to the frontend so it can initiate the payment gateway (e.g. Razorpay)
    $amountPaid = $acqRes['data']['amount_paid'] ?? 0;
    $currency = $acqRes['data']['currency'] ?? 'INR';
    $status = $acqRes['data']['status'] ?? 'PENDING_PAYMENT';

    echo json_encode([
        'success' => true,
        'message' => 'Acquisition initiated successfully. Proceed to payment.',
        'data' => [
            'acquisition_id' => $acquisitionId,
            'amount_payable' => $amountPaid,
            'currency' => $currency,
            'status' => $status,
            'package_id' => $packageId,
            'wallet_id' => $walletId
        ]
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
