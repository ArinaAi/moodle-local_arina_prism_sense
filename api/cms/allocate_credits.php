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

$targetUserId = (int)$input['target_user_id'];
$amount = (float)$input['amount'];
$action = $input['action']; // 'distribute' or 'recall'

if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Amount must be greater than zero']);
    exit;
}

try {
    global $USER;
    $client = new \local_lecturebot\cms\CreditServiceClient();
    
    // Org Wallet: resolve owner UUID -> wallet ID
    $orgUuid = $client->getOrInitializeOrgWallet();
    $orgWalletId = $client->resolveWalletId($orgUuid);
    
    // Target Wallet: JIT creation if needed, returns wallet ID directly
    $targetWalletId = $client->getOrInitializeSubUserWallet($targetUserId);
    
    // Determine direction
    if ($action === 'distribute') {
        $sourceWalletId = $orgWalletId;
        $targetWalletIds = [$targetWalletId];
    } elseif ($action === 'recall') {
        $sourceWalletId = $targetWalletId;
        $targetWalletIds = [$orgWalletId];
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action. Must be distribute or recall']);
        exit;
    }

    // Use org owner UUID as the performed_by identifier (Arina API expects UUIDs, not Moodle integer IDs)
    $response = $client->allocateCredits($sourceWalletId, $targetWalletIds, $amount, $orgUuid);
    
    if ($response['status'] >= 200 && $response['status'] < 300) {
        echo json_encode([
            'success' => true,
            'message' => 'Credits successfully allocated'
        ]);
    } else {
        http_response_code($response['status']);
        echo json_encode([
            'success' => false,
            'message' => 'Allocation failed via Arina Credit Service',
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
