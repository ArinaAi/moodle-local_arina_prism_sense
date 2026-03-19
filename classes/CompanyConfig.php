<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Per-company configuration resolver for IOMAD multi-tenancy.
 *
 * Provides a single bootstrap() call per request that performs one JOIN query
 * to resolve all org-level config values (tenant_id, api_key, org_wallet_owner_id).
 * All subsequent getters are pure in-memory reads.
 *
 * Falls back gracefully to global config_plugins / .env constants when:
 *  - IOMAD is not installed
 *  - The user is not assigned to any company (Site Admin)
 *  - No per-company config row exists yet
 *
 * @package    local_lecturebot
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_lecturebot;

defined('MOODLE_INTERNAL') || die();

class CompanyConfig
{
    // ── Static state (reset per request automatically) ────────────────────────

    /** @var bool|null Cached IOMAD detection result */
    private static ?bool $iomadInstalled = null;

    /** @var \stdClass|null Resolved config for the current user. null = not bootstrapped. */
    private static ?\stdClass $resolved = null;

    /** @var int|null The companyid resolved during bootstrap (null = no company / Site Admin) */
    private static ?int $companyId = null;

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    /**
     * Resolve all org-level config values for the given user in a single query.
     * Call this ONCE at the top of each PHP request file after require_login().
     *
     * @param int $userId Moodle user ID ($USER->id)
     */
    public static function bootstrap(int $userId): void
    {
        global $DB;

        // Already bootstrapped for this request — skip.
        if (self::$resolved !== null) {
            return;
        }

        if (!self::isIomadInstalled()) {
            // Standalone Moodle — use global fallbacks immediately.
            self::$companyId = null;
            self::$resolved = self::globalFallback();
            return;
        }

        // Single JOIN: company_users → company (code=tenant_id) → our config table.
        $sql = "
            SELECT
                c.code          AS tenant_id,
                cfg.api_key,
                cfg.org_wallet_owner_id,
                cu.companyid
            FROM {company_users} cu
            JOIN {company} c
              ON c.id = cu.companyid
            LEFT JOIN {local_lecturebot_company_config} cfg
              ON cfg.companyid = cu.companyid
            WHERE cu.userid = ?
            LIMIT 1
        ";

        $row = $DB->get_record_sql($sql, [$userId]);

        if (!$row) {
            // User not in any company (Site Admin / no IOMAD company assigned).
            self::$companyId = null;
            self::$resolved = self::globalFallback();
            return;
        }

        self::$companyId = (int) $row->companyid;

        // Merge: company row takes priority; fall back to globals for missing values.
        $fallback = self::globalFallback();
        self::$resolved = (object) [
            'tenant_id' => $row->tenant_id ?: $fallback->tenant_id,
            'api_key' => $row->api_key ?: $fallback->api_key,
            'org_wallet_owner_id' => $row->org_wallet_owner_id ?: $fallback->org_wallet_owner_id,
        ];
    }

    // ── Getters (call after bootstrap) ────────────────────────────────────────

    /**
     * Get the Arina tenant ID for the current user's company.
     * Source: mdl_company.code — set by Site Admin when creating the company in IOMAD.
     */
    public static function getTenantId(): ?string
    {
        return self::$resolved?->tenant_id ?? null;
    }

    /**
     * Get the Arina API key for the current user's company.
     * Source: mdl_local_lecturebot_company_config.api_key — set via company_settings.php.
     */
    public static function getApiKey(): ?string
    {
        return self::$resolved?->api_key ?? null;
    }

    /**
     * Get the Credit Service org wallet owner UUID for the current user's company.
     * Source: mdl_local_lecturebot_company_config.org_wallet_owner_id — JIT-created.
     */
    public static function getOrgWalletOwnerId(): ?string
    {
        return self::$resolved?->org_wallet_owner_id ?? null;
    }

    // ── Setters ───────────────────────────────────────────────────────────────

    /**
     * Persist the org wallet owner UUID for the current company.
     * Called by CreditServiceClient after JIT-creating the org wallet.
     *
     * @param string $uuid The org wallet owner UUID
     */
    public static function setOrgWalletOwnerId(string $uuid): void
    {
        if (self::$companyId === null) {
            // Standalone / Site Admin — fall back to global config.
            set_config('org_wallet_owner_id', $uuid, 'local_lecturebot');
            return;
        }

        global $DB;
        $now = time();

        $existing = $DB->get_record(
            'local_lecturebot_company_config',
            ['companyid' => self::$companyId]
        );

        if ($existing) {
            $DB->update_record(
                'local_lecturebot_company_config',
                (object) [
                    'id'                  => $existing->id,
                    'org_wallet_owner_id' => $uuid,
                    'timemodified'        => $now,
                ]
            );
        } else {
            $DB->insert_record(
                'local_lecturebot_company_config',
                (object) [
                    'companyid'           => self::$companyId,
                    'org_wallet_owner_id' => $uuid,
                    'timecreated'         => $now,
                    'timemodified'        => $now,
                ]
            );
        }

        // Update in-memory cache too.
        if (self::$resolved !== null) {
            self::$resolved->org_wallet_owner_id = $uuid;
        }
    }

    /**
     * Save per-company config (api_key, and optionally other fields).
     * Used by company_settings.php on form submit.
     *
     * @param int   $companyId IOMAD company ID
     * @param array $data      Associative array: ['api_key' => ..., 'org_wallet_owner_id' => ...]
     */
    public static function save(int $companyId, array $data): void
    {
        global $DB;
        $now = time();

        $existing = $DB->get_record(
            'local_lecturebot_company_config',
            ['companyid' => $companyId]
        );

        if ($existing) {
            $record = (object) array_merge(
                ['id' => $existing->id, 'timemodified' => $now],
                array_intersect_key($data, array_flip(['api_key', 'org_wallet_owner_id']))
            );
            $DB->update_record('local_lecturebot_company_config', $record);
        } else {
            $record = (object) array_merge(
                ['companyid' => $companyId, 'timecreated' => $now, 'timemodified' => $now],
                array_intersect_key($data, array_flip(['api_key', 'org_wallet_owner_id']))
            );
            $DB->insert_record('local_lecturebot_company_config', $record);
        }

        // Bust in-memory cache so the next getter call reflects the new values.
        self::$resolved = null;
        self::$companyId = null;
    }

    /**
     * Read the raw config row for a company (used by company_settings.php to pre-fill form).
     *
     * @param int $companyId
     * @return \stdClass|false
     */
    public static function getForCompany(int $companyId)
    {
        global $DB;
        return $DB->get_record('local_lecturebot_company_config', ['companyid' => $companyId]);
    }

    // ── IOMAD detection ───────────────────────────────────────────────────────

    /**
     * Returns true if the IOMAD local_iomad plugin is installed.
     * Cached after the first check — plugin state never changes mid-request.
     */
    public static function isIomadInstalled(): bool
    {
        if (self::$iomadInstalled === null) {
            self::$iomadInstalled =
                \core_plugin_manager::instance()->get_plugin_info('local_iomad') !== null;
        }
        return self::$iomadInstalled;
    }

    /**
     * Return the IOMAD companyid for the current bootstrapped user, or null.
     */
    public static function getCompanyId(): ?int
    {
        return self::$companyId;
    }

    /**
     * Reset the in-memory resolved config so bootstrap() will re-run on the next call.
     *
     * Required by poll_content_status_task when it processes content items that may
     * belong to different IOMAD tenants in a single cron run. The IOMAD-installed
     * flag is intentionally preserved — plugin state never changes mid-process.
     */
    public static function reset(): void
    {
        self::$resolved  = null;
        self::$companyId = null;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Build a fallback stdClass from global config_plugins / .env constants.
     */
    private static function globalFallback(): \stdClass
    {
        return (object) [
            'tenant_id' => defined('LECTUREBOT_TENANT_ID')
                ? LECTUREBOT_TENANT_ID
                : null,
            'api_key' => get_config('local_lecturebot', 'api_key') ?: null,
            'org_wallet_owner_id' => get_config('local_lecturebot', 'org_wallet_owner_id') ?: null,
        ];
    }
}
