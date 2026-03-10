<?php
/**
 * CMS API: Get Wallet Ledger (Transactions)
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/moodlelib.php');
require_once(__DIR__ . '/CreditServiceClient.php');
require_once(__DIR__ . '/get_wallet_helper.php');

// Require login and admin cap
require_login();
$context = context_system::instance();
require_capability('moodle/site:config', $context);

header('Content-Type: application/json');

try {
    $client = new \local_lecturebot\cms\CreditServiceClient();

    // 1-2. Fetch Org Owner UUID and resolve the actual org wallet ID
    $orgWalletId = get_wallet_id_or_exit($client);

    $fetchWalletId = $orgWalletId;
    if (!empty($_GET['sub_user_id'])) {
        $subUserId = (int) $_GET['sub_user_id'];
        $subWalletId = $client->getOrInitializeSubUserWallet($subUserId);
        if ($subWalletId) {
            $fetchWalletId = $subWalletId;
        }
    }

    // 3. Fetch transactions using the requested wallet ID
    $res = $client->getTransactions($fetchWalletId);

    if ($res['status'] >= 200 && $res['status'] < 300) {
        // API returns {transactions: [...], total: N, wallet_id: ..., current_balance: ...}
        $txs = [];
        if (is_array($res['data'])) {
            if (isset($res['data']['transactions'])) {
                $txs = $res['data']['transactions'];
            } elseif (isset($res['data']['items'])) {
                $txs = $res['data']['items'];
            } else {
                $txs = $res['data'];
            }
        }

        // ── Friendly type labels ──
        $typeLabels = [
            'PURCHASE' => 'Credit Purchase',
            'CONSUMPTION' => 'Credit Usage',
            'ALLOCATION_OUT' => 'Staff Allocation',
            'ALLOCATION_IN' => 'Credits Received',
            'REFUND' => 'Refund',
            'ADMIN_ADJUSTMENT' => 'Admin Adjustment',
            'MANUAL_ADJUSTMENT' => 'Manual Adjustment',
            'EXPIRATION' => 'Expired',
        ];

        // ── UUID/Wallet-ID → Name Resolution ──
        $uuidNameCache = [];
        $walletIdNameCache = [];
        $orgUuid = get_config('local_lecturebot', 'org_wallet_owner_id');
        if ($orgUuid) {
            $uuidNameCache[$orgUuid] = 'Organization Admin';
        }
        $walletIdNameCache[$orgWalletId] = 'Organization';

        // Fetch hierarchy to get child wallet IDs and their owner UUIDs
        $hierarchyRes = $client->getHierarchy($orgWalletId);
        $childOwnerUuids = [];
        if ($hierarchyRes['status'] >= 200 && $hierarchyRes['status'] < 300) {
            // Schema: child_wallets[] = {wallet_id, owner_id, type, balance}
            $childWallets = $hierarchyRes['data']['child_wallets'] ?? [];
            foreach ($childWallets as $child) {
                $childWalletId = $child['wallet_id'] ?? null;
                $childOwnerUuid = $child['owner_id'] ?? null;
                if ($childWalletId && $childOwnerUuid) {
                    $childOwnerUuids[$childOwnerUuid] = $childWalletId;
                }
            }
        }

        // Resolve child owner UUIDs → Moodle user names via wallet preferences
        if (!empty($childOwnerUuids)) {
            global $DB;
            $uuidList = array_keys($childOwnerUuids);
            list($inSql, $params) = $DB->get_in_or_equal($uuidList, SQL_PARAMS_NAMED);
            $rows = $DB->get_records_sql(
                "SELECT up.value AS uuid, u.id, u.firstname, u.lastname
                 FROM {user_preferences} up
                 JOIN {user} u ON u.id = up.userid
                 WHERE up.name = 'lecturebot_wallet_sub_user_id'
                   AND up.value {$inSql}",
                $params
            );
            foreach ($rows as $row) {
                $fullName = trim($row->firstname . ' ' . $row->lastname);
                $uuidNameCache[$row->uuid] = $fullName;
                // Also map the wallet ID for this owner
                if (isset($childOwnerUuids[$row->uuid])) {
                    $walletIdNameCache[$childOwnerUuids[$row->uuid]] = $fullName;
                }
            }
        }

        $ledger = [];
        foreach ($txs as $tx) {
            $ts = date('M d, Y, H:i', strtotime($tx['created_at']));
            $tsRaw = date('Y-m-d', strtotime($tx['created_at'])); // For date filtering

            // Build human-readable metadata
            $metaParts = [];

            // For CONSUMPTION transactions, identify who consumed the credits
            // by checking if this transaction's wallet_id belongs to a sub-user/staff
            $txType = $tx['transaction_type'] ?? '';
            if ($txType === 'CONSUMPTION' && !empty($tx['wallet_id'])) {
                $consumedByName = $walletIdNameCache[$tx['wallet_id']] ?? null;
            }

            if (isset($tx['extra_metadata']) && is_array($tx['extra_metadata'])) {
                // Show package name for purchases
                if (!empty($tx['extra_metadata']['package_name'])) {
                    $metaParts[] = 'Package: ' . $tx['extra_metadata']['package_name'];
                }
                if (!empty($tx['extra_metadata']['description'])) {
                    $metaParts[] = $tx['extra_metadata']['description'];
                }

                // Show action/service for consumption transactions
                if (!empty($tx['extra_metadata']['action_key'])) {
                    $actionKey = strtolower(trim($tx['extra_metadata']['action_key']));

                    define('LABEL_SLIDE_GENERATION', 'Slide Generation');
                    define('LABEL_SLIDE_REGENERATION', 'Slide Regeneration');
                    define('LABEL_VIDEO_GENERATION', 'Video Generation');
                    define('LABEL_DOC_PROCESSING', 'Document Processing');

                    // Map action keys to user-friendly service names
                    $actionLabels = [
                        'slide_generation' => LABEL_SLIDE_GENERATION,
                        'slide_generation_standard' => LABEL_SLIDE_GENERATION,
                        'slide_generation_extensive' => LABEL_SLIDE_GENERATION,
                        'slide_generation_deep_dive' => LABEL_SLIDE_GENERATION,
                        'slide_regeneration' => LABEL_SLIDE_REGENERATION,
                        'slide_regeneration_standard' => LABEL_SLIDE_REGENERATION,
                        'slide_regeneration_extensive' => LABEL_SLIDE_REGENERATION,
                        'slide_regeneration_deep_dive' => LABEL_SLIDE_REGENERATION,
                        'video_generation' => LABEL_VIDEO_GENERATION,
                        'doc_processing' => LABEL_DOC_PROCESSING,
                        'upload_pdf' => 'PDF Upload',
                        'pdf_upload' => 'PDF Upload',
                    ];

                    $serviceName = $actionLabels[$actionKey] ?? ucwords(str_replace('_', ' ', $actionKey));
                    $metaParts[] = 'Service: ' . $serviceName;
                }
                // Resolve owner UUID fields
                foreach (['target_owner_id', 'source_owner_id'] as $field) {
                    if (!empty($tx['extra_metadata'][$field])) {
                        $uuid = $tx['extra_metadata'][$field];
                        $name = $uuidNameCache[$uuid] ?? null;
                        if ($name) {
                            if ($field === 'target_owner_id') {
                                $label = 'To';
                            } else {
                                $label = 'From';
                            }
                            $metaParts[] = "$label: $name";
                        }
                    }
                }
                // Resolve wallet ID fields (single or array)
                foreach (['target_wallet_id', 'target_wallet_ids', 'source_wallet_id'] as $field) {
                    if (!empty($tx['extra_metadata'][$field])) {
                        $ids = is_array($tx['extra_metadata'][$field])
                            ? $tx['extra_metadata'][$field]
                            : [$tx['extra_metadata'][$field]];
                        foreach ($ids as $wid) {
                            $name = $walletIdNameCache[$wid] ?? null;
                            if ($name) {
                                $label = (strpos($field, 'target') !== false) ? 'To' : 'From';
                                $metaParts[] = "$label: $name";
                            }
                        }
                    }
                }
            }

            if ($txType === 'CONSUMPTION' && !empty($consumedByName)) {
                $metaParts[] = 'Consumed by: ' . $consumedByName;
            }

            // If no metadata parts were built, provide a basic fallback based on transaction type
            if (empty($metaParts)) {
                $txType = $tx['transaction_type'] ?? 'UNKNOWN';
                if ($txType === 'PURCHASE') {
                    $metaParts[] = 'Credit purchase';
                } elseif ($txType === 'CONSUMPTION') {
                    $metaParts[] = 'Service usage (details not available)';
                } elseif ($txType === 'ALLOCATION_OUT' || $txType === 'ALLOCATION_IN') {
                    $metaParts[] = 'Credit transfer';
                }
            }

            $meta = implode(' · ', $metaParts);

            // Map Arina transaction_type
            $type = strtoupper($tx['transaction_type'] ?? $tx['type'] ?? 'UNKNOWN');
            $typeLabel = $typeLabels[$type] ?? ucwords(str_replace('_', ' ', strtolower($type)));

            $ledger[] = [
                'id' => $tx['id'],
                'ts' => $ts,
                'tsRaw' => $tsRaw,
                'type' => $type,
                'typeLabel' => $typeLabel,
                'meta' => $meta,
                'amount' => (float) ($tx['credit_amount'] ?? $tx['amount'] ?? 0),
                'balance' => (float) ($tx['balance_after'] ?? $tx['resulting_balance'] ?? 0),
            ];
        }

        // ── Append Reserved Credits if any ──
        $balRes = $client->getWalletBalance($fetchWalletId);
        if ($balRes['status'] >= 200 && $balRes['status'] < 300 && !empty($balRes['data'])) {
            $reserved = (float) ($balRes['data']['reserved_credits'] ?? 0);
            if ($reserved > 0) {
                // Add reserved amount as a special pending transaction at the top of the ledger
                array_unshift($ledger, [
                    'id' => 'reserve-' . time(),
                    'ts' => date('M d, Y, H:i'),
                    'tsRaw' => date('Y-m-d'),
                    'type' => 'PENDING_RESERVE',
                    'typeLabel' => 'Credits Reserved (Processing)',
                    'meta' => 'Locked for pending generation requests',
                    'amount' => -$reserved,
                    'balance' => $balRes['data']['current_balance'] ?? 0,
                ]);
            }
        }

        echo json_encode([
            'success' => true,
            'data' => $ledger
        ]);
    } else {
        http_response_code($res['status'] ?: 500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch ledger from Credit Service',
            'details' => $res['data']
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
