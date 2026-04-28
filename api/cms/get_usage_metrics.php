<?php

/**
 * CMS API: Get Usage Metrics (Aggregated service usage)
 *
 * @package    local_arina_prism_sense
 * @copyright  2026 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/get_wallet_helper.php');

// Require login; allow Site Admins and IOMAD Company Managers.
require_login();
\local_arina_prism_sense\CompanyConfig::requireCmsAccess();

header('Content-Type: application/json');

try {
    $client = new \local_arina_prism_sense\cms\CreditServiceClient();

    // 1-2. Fetch Org Owner UUID and resolve the actual wallet ID
    $walletId = local_arina_prism_sense_get_wallet_id_or_exit($client);

    // 3. Fetch all child-wallet transactions so sub-user (teacher) usage is
    //    included in the chart alongside any org-level consumption.
    //    Fetching up to 1000 to get a good sample per service category.
    $res = $client->getChildTransactions($walletId, 1000);

    if ($res['status'] >= 200 && $res['status'] < 300) {
        // getChildTransactions returns {transactions[], total, parent_wallet_id, child_wallet_count}
        $txs = $res['data']['transactions'] ?? [];

        $metrics = [
            'slide_generation' => 0,
            'slide_regeneration' => 0,
            'video_generation' => 0,
            'doc_processing' => 0,
        ];

        foreach ($txs as $tx) {
            if ($tx['transaction_type'] === 'CONSUMPTION') {
                $amount = abs((float)$tx['credit_amount']);

                // Inspect metadata to see the action key
                $meta = $tx['extra_metadata'] ?? [];
                $actionKey = isset($meta['action_key']) ? strtolower(trim($meta['action_key'])) : '';

                // Map action keys to categories
                if (
                    in_array($actionKey, [
                    'slide_generation',
                    'slide_generation_standard',
                    'slide_generation_extensive',
                    'slide_generation_deep_dive',
                    ])
                ) {
                    $metrics['slide_generation'] += $amount;
                } elseif (
                    in_array($actionKey, [
                    'slide_regeneration',
                    'slide_regeneration_standard',
                    'slide_regeneration_extensive',
                    'slide_regeneration_deep_dive',
                    ])
                ) {
                    $metrics['slide_regeneration'] += $amount;
                } elseif (
                    in_array($actionKey, [
                    'vid_gen_no_avatar',
                    'vid_gen_with_avatar',
                    ])
                ) {
                    $metrics['video_generation'] += $amount;
                } elseif ($actionKey === 'doc_processing') {
                    $metrics['doc_processing'] += $amount;
                } elseif (!empty($actionKey)) {
                    // Log unknown action keys for debugging
                    error_log("ArinaPrismSense: Unknown action_key encountered: {$actionKey}");
                }
            }
        }

        // Format for the frontend DONUT_DATA shape: [{name, value, color}]
        $chartData = [];
        $metricConfigs = [
            ['key' => 'slide_generation', 'name' => 'Slide Generation', 'color' => '#6F42C1'],
            ['key' => 'slide_regeneration', 'name' => 'Slide Regeneration', 'color' => '#8A94DF'],
            ['key' => 'video_generation', 'name' => 'Video Generation', 'color' => '#2ECC71'],
            ['key' => 'doc_processing', 'name' => 'Document Processing', 'color' => '#3498DB'],
        ];

        foreach ($metricConfigs as $config) {
            if ($metrics[$config['key']] > 0) {
                $chartData[] = [
                    'name' => $config['name'],
                    'value' => round($metrics[$config['key']]),
                    'color' => $config['color'],
                ];
            }
        }

        echo json_encode([
            'success' => true,
            'data' => $chartData,
        ]);
    } else {
        http_response_code($res['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch usage metrics',
            'details' => $res['data'] ?? null,
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error while fetching metrics',
        'error' => $e->getMessage(),
    ]);
}
