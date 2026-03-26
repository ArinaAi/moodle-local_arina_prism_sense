<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.
/**
 * Azure Blob Storage Configuration
 *
 * This file acts as a universal loader.
 * 1. For LOCAL development: It tries to load keys from a local .env file.
 * 2. For PRODUCTION: It uses standard Environment Variables set on the server.
 *
 * @package    local_lecturebot
 * @copyright  2025 Arina AI <info@arina.ai>
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Initialize Azure Configuration
 */
/**
 * Load .env file variables
 *
 * @param string $envFile Path to .env file
 */
function local_lecturebot_load_env_file($envFile)
{
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            $parts = explode('=', $line, 2);
            if (count($parts) === 2) {
                $name = trim($parts[0]);
                $value = trim($parts[1]);
                putenv(sprintf('%s=%s', $name, $value));
                $_ENV[$name] = $value;
            }
        }
    }
}

/**
 * Define a constant if it's not already defined, using env var as source
 *
 * @param string $constName Name of constant to define
 * @param mixed $defaultVal Optional default value if env var is missing
 */
function local_lecturebot_define_from_env($constName, $defaultVal = null)
{
    if (!defined($constName)) {
        $val = getenv($constName);
        if ($val !== false) {
            define($constName, $val);
        } elseif ($defaultVal !== null) {
            define($constName, $defaultVal);
        }
    }
}

function local_lecturebot_init_azure_config()
{
    // 1. Try to load local .env (for development)
    local_lecturebot_load_env_file(__DIR__ . '/.env');

    // 2. Define Constants
    local_lecturebot_define_from_env('AZURE_STORAGE_ACCOUNT_NAME');
    local_lecturebot_define_from_env('AZURE_STORAGE_ACCOUNT_KEY');
    local_lecturebot_define_from_env('LECTUREBOT_TENANT_ID', 'default_tenant');
    
    // PostgreSQL Database Constants
    local_lecturebot_define_from_env('PG_HOST');
    local_lecturebot_define_from_env('PG_PORT', '5432');
    local_lecturebot_define_from_env('PG_DATABASE');
    local_lecturebot_define_from_env('PG_USER');
    local_lecturebot_define_from_env('PG_PASSWORD');

    if (!defined('AZURE_BLOB_CONTAINER_NAME')) {
        $val = getenv('AZURE_BLOB_CONTAINER_NAME');
        if ($val !== false) {
            define('AZURE_BLOB_CONTAINER_NAME', $val);
        } else {
            $tenantId = LECTUREBOT_TENANT_ID;
            $safeTenantId = strtolower(preg_replace('/[^a-zA-Z0-9-]/', '', $tenantId));
            define('AZURE_BLOB_CONTAINER_NAME', 'blob-tutorial-gen-' . $safeTenantId);
        }
    }

    // Optional: Log warning
    if (!defined('AZURE_STORAGE_ACCOUNT_NAME') || !defined('AZURE_STORAGE_ACCOUNT_KEY')) {
        error_log('LectureBot: Azure credentials missing. ' .
            'Please set AZURE_STORAGE_ACCOUNT_NAME/KEY in environment or .env file.');
    }
}

// Execute initialization
local_lecturebot_init_azure_config();
