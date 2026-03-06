<?php
/**
 * CMS API: Get Organization-Wide Reserved Credits
 *
 * Returns total reserved credits across the organization and all sub-users (staff).
 * This shows credits currently locked in pending operations.
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
    $client = new \local_lecturebot\cms\CreditServiceClient();
    
    // Get org owner UUID (this is the external ID used by Credit Service)
    $orgUuid = $client->getOrInitializeOrgWallet();
    
    // Fetch organization-wide reserved credits
    $response = $client->getOrgReservedCredits($orgUuid);
    
    if ($response['status'] >= 200 && $response['status'] < 300) {
        $data = $response['data'];
        
        // For the Overview dashboard, we only show total staff reserved
        // (children_reserved = sum of all sub-user wallet reserved credits)
        echo json_encode([
            'success' => true,
            'data' => [
                'staff_reserved' => isset($data['children_reserved'])
                    ? (float)$data['children_reserved']
                    : 0,
                'total_reserved' => isset($data['total_reserved'])
                    ? (float)$data['total_reserved']
                    : 0,
            ]
        ]);
    } else {
        http_response_code($response['status']);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch reserved credits from Arina Credit Service',
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
