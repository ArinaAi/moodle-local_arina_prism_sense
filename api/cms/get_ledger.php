<?php
/**
 * CMS API: Get Wallet Ledger (Transactions)
 *
 * For the org-wide Audit Ledger (no sub_user_id filter), this uses the
 * dedicated GET /wallets/{wallet_id}/child-transactions endpoint which returns
 * all sub-user transactions consolidated in one call, including wallet metadata.
 *
 * For per-staff filtering (sub_user_id provided), it falls back to
 * GET /wallets/{sub_wallet_id}/transactions as before.
 *
 * @package    local_lecturebot
 * @copyright  2026 Arina AI <info@arina.ai>
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

// ── Date format constant (avoids sonar duplicate-literal warning) ───────────
define('TS_FORMAT', 'M d, Y, H:i');

// ── Friendly type labels ──────────────────────────────────────────────────────
$typeLabels = [
    'PURCHASE'           => 'Credit Purchase',
    'CONSUMPTION'        => 'Credit Usage',
    'ALLOCATION_OUT'     => 'Staff Allocation',
    'ALLOCATION_IN'      => 'Credits Received',
    'RECLAIM_OUT'        => 'Credits Reclaimed (Out)',
    'RECLAIM_IN'         => 'Credits Reclaimed (In)',
    'REFUND'             => 'Refund',
    'ADMIN_ADJUSTMENT'   => 'Admin Adjustment',
    'MANUAL_ADJUSTMENT'  => 'Manual Adjustment',
    'EXPIRATION'         => 'Expired',
];

// ── Action-key → service label map ────────────────────────────────────────────
define('LABEL_SLIDE_GENERATION',   'Slide Generation');
define('LABEL_SLIDE_REGENERATION', 'Slide Regeneration');
define('LABEL_VIDEO_GENERATION',   'Video Generation');
define('LABEL_DOC_PROCESSING',     'Document Processing');

$actionLabels = [
    'slide_generation'            => LABEL_SLIDE_GENERATION,
    'slide_generation_standard'   => LABEL_SLIDE_GENERATION,
    'slide_generation_extensive'  => LABEL_SLIDE_GENERATION,
    'slide_generation_deep_dive'  => LABEL_SLIDE_GENERATION,
    'slide_regeneration'          => LABEL_SLIDE_REGENERATION,
    'slide_regeneration_standard' => LABEL_SLIDE_REGENERATION,
    'slide_regeneration_extensive'=> LABEL_SLIDE_REGENERATION,
    'slide_regeneration_deep_dive'=> LABEL_SLIDE_REGENERATION,
    'video_generation'            => LABEL_VIDEO_GENERATION,
    'doc_processing'              => LABEL_DOC_PROCESSING,
    'upload_pdf'                  => 'PDF Upload',
    'pdf_upload'                  => 'PDF Upload',
];

// ── buildMeta helpers (each kept intentionally flat) ─────────────────────────

/**
 * Return the "Consumed by" name when the tx is a CONSUMPTION with wallet_id.
 */
function resolveConsumedBy($tx, $walletIdNameCache)
{
    if (($tx['transaction_type'] ?? '') === 'CONSUMPTION' && !empty($tx['wallet_id'])) {
        return $walletIdNameCache[$tx['wallet_id']] ?? null;
    }
    return null;
}

/**
 * Append package, description, and service parts from extra_metadata.
 */
function appendExtraMetaParts(array $meta, $extra, $actionLabels)
{
    if (!empty($extra['package_name'])) {
        $meta[] = 'Package: ' . $extra['package_name'];
    }
    if (!empty($extra['description'])) {
        $meta[] = $extra['description'];
    }
    if (!empty($extra['action_key'])) {
        $key     = strtolower(trim($extra['action_key']));
        $service = $actionLabels[$key] ?? ucwords(str_replace('_', ' ', $key));
        $meta[]  = 'Service: ' . $service;
    }
    return $meta;
}

/**
 * Append To/From parts for owner UUID fields (target_owner_id, source_owner_id).
 */
function appendOwnerParts(array $meta, $extra, $uuidNameCache)
{
    foreach (['target_owner_id' => 'To', 'source_owner_id' => 'From'] as $field => $label) {
        $uuid = $extra[$field] ?? null;
        $name = $uuid ? ($uuidNameCache[$uuid] ?? null) : null;
        if ($name) {
            $meta[] = "$label: $name";
        }
    }
    return $meta;
}

/**
 * Append To/From parts for wallet ID fields (single value or array).
 */
function appendWalletParts(array $meta, $extra, $walletIdNameCache)
{
    foreach (['target_wallet_id', 'target_wallet_ids', 'source_wallet_id'] as $field) {
        if (empty($extra[$field])) {
            continue;
        }
        $label = (strpos($field, 'target') !== false) ? 'To' : 'From';
        $ids   = is_array($extra[$field]) ? $extra[$field] : [$extra[$field]];
        foreach ($ids as $wid) {
            $name = $walletIdNameCache[$wid] ?? null;
            if ($name) {
                $meta[] = "$label: $name";
            }
        }
    }
    return $meta;
}

/**
 * Return a single fallback string for the given transaction type, or '' if none.
 */
function fallbackMetaPart($txType)
{
    $map = [
        'PURCHASE'      => 'Credit purchase',
        'CONSUMPTION'   => 'Service usage (details not available)',
        'ALLOCATION_OUT'=> 'Credit transfer',
        'ALLOCATION_IN' => 'Credit transfer',
        'RECLAIM_OUT'   => 'Credit reclaim',
        'RECLAIM_IN'    => 'Credit reclaim',
    ];
    return $map[$txType] ?? '';
}

/**
 * Build the human-readable "meta" string for a transaction row.
 * Works for both standard transactions (org wallet) and child transactions.
 *
 * @param array  $tx              Raw transaction array from Arina API
 * @param array  $uuidNameCache   owner_uuid -> display name
 * @param array  $walletIdNameCache wallet_id  -> display name
 * @param array  $actionLabels    action_key -> service label
 * @return string
 */
function buildMeta($tx, $uuidNameCache, $walletIdNameCache, $actionLabels)
{
    $metaParts   = [];
    $txType      = $tx['transaction_type'] ?? '';
    $consumedBy  = resolveConsumedBy($tx, $walletIdNameCache);

    $extra = isset($tx['extra_metadata']) && is_array($tx['extra_metadata'])
           ? $tx['extra_metadata']
           : [];

    if ($extra) {
        $metaParts = appendExtraMetaParts($metaParts, $extra, $actionLabels);
        $metaParts = appendOwnerParts($metaParts, $extra, $uuidNameCache);
        $metaParts = appendWalletParts($metaParts, $extra, $walletIdNameCache);
    }

    if ($consumedBy) {
        $metaParts[] = 'Consumed by: ' . $consumedBy;
    }

    if (empty($metaParts)) {
        $fallback = fallbackMetaPart($txType);
        if ($fallback !== '') {
            $metaParts[] = $fallback;
        }
    }

    return implode(' · ', $metaParts);
}

/**
 * Format a raw transaction array into the ledger row shape expected by the frontend.
 */
function formatTx($tx, $typeLabels, $uuidNameCache, $walletIdNameCache, $actionLabels, $staffName = null)
{
    $ts    = date(TS_FORMAT, strtotime($tx['created_at']));
    $tsRaw = date('Y-m-d', strtotime($tx['created_at']));
    $type  = strtoupper($tx['transaction_type'] ?? $tx['type'] ?? 'UNKNOWN');
    $typeLabel = $typeLabels[$type] ?? ucwords(str_replace('_', ' ', strtolower($type)));

    $meta = buildMeta($tx, $uuidNameCache, $walletIdNameCache, $actionLabels);

    // For child-transaction rows the API provides external_sub_user_id / owner_id
    // Use $staffName if pre-resolved, otherwise try to append from cache
    if ($staffName && strpos($meta, $staffName) === false) {
        $meta = $meta ? $meta . ' · Staff: ' . $staffName : 'Staff: ' . $staffName;
    }

    return [
        'id'        => $tx['id'],
        'ts'        => $ts,
        'tsRaw'     => $tsRaw,
        'type'      => $type,
        'typeLabel' => $typeLabel,
        'meta'      => $meta,
        'amount'    => (float) ($tx['credit_amount'] ?? $tx['amount'] ?? 0),
        'balance'   => (float) ($tx['balance_after'] ?? $tx['resulting_balance'] ?? 0),
    ];
}

// =============================================================================
// Main handler
// =============================================================================
try {
    $client = new \local_lecturebot\cms\CreditServiceClient();

    // 1. Resolve org wallet ID
    $orgWalletId = get_wallet_id_or_exit($client);
    $orgUuid     = get_config('local_lecturebot', 'org_wallet_owner_id');

    // Seed name caches
    $uuidNameCache     = [];
    $walletIdNameCache = [];
    if ($orgUuid) {
        $uuidNameCache[$orgUuid] = 'Organization Admin';
    }
    $walletIdNameCache[$orgWalletId] = 'Organization';

    // ── Build sub-user name maps from Moodle DB (used by both paths) ──────────
    // We get all sub-user wallet UUIDs from user_preferences so we can resolve
    // owner_id → staff name in one DB query.
    global $DB;
    $prefRows = $DB->get_records('user_preferences', ['name' => 'lecturebot_wallet_sub_user_id'], '', 'userid, value');

    // ownerUuid → moodle userId
    $ownerUuidToUserId = [];
    foreach ($prefRows as $pref) {
        $ownerUuidToUserId[$pref->value] = $pref->userid;
    }

    if (!empty($ownerUuidToUserId)) {
        $userIds = array_values($ownerUuidToUserId);
        list($inSql, $params) = $DB->get_in_or_equal($userIds, SQL_PARAMS_NAMED);
        $userRows = $DB->get_records_sql(
            "SELECT id, firstname, lastname FROM {user} WHERE id {$inSql}",
            $params
        );
        foreach ($ownerUuidToUserId as $uuid => $uid) {
            if (isset($userRows[$uid])) {
                $u = $userRows[$uid];
                $uuidNameCache[$uuid] = trim($u->firstname . ' ' . $u->lastname);
            }
        }
    }

    // Also resolve wallet IDs → names via hierarchy (needed for metadata fields)
    $hierarchyRes = $client->getHierarchy($orgWalletId);
    if ($hierarchyRes['status'] >= 200 && $hierarchyRes['status'] < 300) {
        $childWallets = $hierarchyRes['data']['child_wallets'] ?? [];
        foreach ($childWallets as $child) {
            $childWalletId  = $child['wallet_id'] ?? null;
            $childOwnerUuid = $child['owner_id'] ?? null;
            if ($childWalletId && $childOwnerUuid && isset($uuidNameCache[$childOwnerUuid])) {
                $walletIdNameCache[$childWalletId] = $uuidNameCache[$childOwnerUuid];
            }
        }
    }

    // ── Determine which wallet/endpoint to use ────────────────────────────────
    $subUserRequested = !empty($_GET['sub_user_id']);

    if ($subUserRequested) {
        // ── PER-STAFF VIEW: single wallet transactions ────────────────────────
        $subUserId   = (int) $_GET['sub_user_id'];
        $subWalletId = $client->getOrInitializeSubUserWallet($subUserId);

        $res = $client->getTransactions($subWalletId);

        if (!($res['status'] >= 200 && $res['status'] < 300)) {
            http_response_code($res['status'] ?: 500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to fetch ledger from Credit Service',
                'details' => $res['data']
            ]);
            exit;
        }

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

        $ledger = [];
        foreach ($txs as $tx) {
            $ledger[] = formatTx($tx, $typeLabels, $uuidNameCache, $walletIdNameCache, $actionLabels);
        }

        $fetchWalletId = $subWalletId;

    } else {
        // ── ORG-WIDE VIEW: child-transactions (all sub-user transactions) ─────
        $res = $client->getChildTransactions($orgWalletId);

        if (!($res['status'] >= 200 && $res['status'] < 300)) {
            http_response_code($res['status'] ?: 500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to fetch ledger from Credit Service',
                'details' => $res['data']
            ]);
            exit;
        }

        // ChildTransactionList: {transactions[], total, parent_wallet_id, child_wallet_count}
        $txs = $res['data']['transactions'] ?? [];

        $ledger = [];
        foreach ($txs as $tx) {
            // The child-transaction response includes owner_id we can resolve directly
            $staffName = null;
            if (!empty($tx['owner_id']) && isset($uuidNameCache[$tx['owner_id']])) {
                $staffName = $uuidNameCache[$tx['owner_id']];
            }
            $ledger[] = formatTx($tx, $typeLabels, $uuidNameCache, $walletIdNameCache, $actionLabels, $staffName);
        }

        $fetchWalletId = $orgWalletId;
    }

    // ── Append Reserved Credits row ───────────────────────────────────────────
    // Per-staff view  → show only that user's wallet reserved_credits.
    // Org-wide view   → show total_reserved (org + all sub-users) via the
    //                   dedicated /credits/usage/reserved/org/{uuid} endpoint.
    if ($subUserRequested) {
        // Per-staff: read reserved_credits straight from the sub-user wallet.
        $balRes   = $client->getWalletBalance($subWalletId);
        if ($balRes['status'] >= 200 && $balRes['status'] < 300 && !empty($balRes['data'])) {
            $reserved = (float) ($balRes['data']['reserved_credits'] ?? 0);
            if ($reserved > 0) {
                array_unshift($ledger, [
                    'id'        => 'reserve-' . time(),
                    'ts'        => date(TS_FORMAT),
                    'tsRaw'     => date('Y-m-d'),
                    'type'      => 'PENDING_RESERVE',
                    'typeLabel' => 'Credits Reserved (Processing)',
                    'meta'      => 'Locked for pending AI operations',
                    'amount'    => -$reserved,
                    'balance'   => (float) ($balRes['data']['current_balance'] ?? 0),
                ]);
            }
        }
    } else {
        // Org-wide: use total_reserved (org wallet + all child wallets).
        $reservedRes = $client->getOrgReservedCredits($orgUuid);
        if ($reservedRes['status'] >= 200 && $reservedRes['status'] < 300 && !empty($reservedRes['data'])) {
            $reserved = (float) ($reservedRes['data']['total_reserved'] ?? 0);
            if ($reserved > 0) {
                $balRes   = $client->getWalletBalance($orgWalletId);
                $balAfter = ($balRes['status'] >= 200 && $balRes['status'] < 300)
                    ? ($balRes['data']['current_balance'] ?? 0)
                    : 0;

                array_unshift($ledger, [
                    'id'        => 'reserve-' . time(),
                    'ts'        => date(TS_FORMAT),
                    'tsRaw'     => date('Y-m-d'),
                    'type'      => 'PENDING_RESERVE',
                    'typeLabel' => 'Credits Reserved (Processing)',
                    'meta'      => 'Locked for pending AI operations (org-wide)',
                    'amount'    => -$reserved,
                    'balance'   => $balAfter,
                ]);
            }
        }
    }

    echo json_encode([
        'success' => true,
        'data'    => $ledger
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error'   => $e->getMessage()
    ]);
}
