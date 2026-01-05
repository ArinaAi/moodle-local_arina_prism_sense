<?php
/**
 * Azure Blob Storage Configuration
 *
 * This file acts as a universal loader.
 * 1. For LOCAL development: It tries to load keys from a local .env file.
 * 2. For PRODUCTION: It uses standard Environment Variables set on the server.
 *
 * @package    local_lecturebot
 * @copyright  2025
 */

defined('MOODLE_INTERNAL') || die();

// 1. Try to load local .env (for development)
// This file should contain AZURE_STORAGE_ACCOUNT_NAME=... etc.
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {continue;}
        
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $name = trim($parts[0]);
            $value = trim($parts[1]);
            // Set as environment variable for the current request
            putenv(sprintf('%s=%s', $name, $value));
            // Also ensure it's in $_ENV
            $_ENV[$name] = $value;
        }
    }
}

// 2. Define Constants from Environment (works for both Local .env and Server Env Vars)
if (!defined('AZURE_STORAGE_ACCOUNT_NAME')) {
    $val = getenv('AZURE_STORAGE_ACCOUNT_NAME');
    if ($val !== false) {
        define('AZURE_STORAGE_ACCOUNT_NAME', $val);
    }
}

if (!defined('AZURE_STORAGE_ACCOUNT_KEY')) {
    $val = getenv('AZURE_STORAGE_ACCOUNT_KEY');
    if ($val !== false) {
        define('AZURE_STORAGE_ACCOUNT_KEY', $val);
    }
}

// Optional: Log warning if keys are missing (helps debugging)
if (!defined('AZURE_STORAGE_ACCOUNT_NAME') || !defined('AZURE_STORAGE_ACCOUNT_KEY')) {
    error_log('LectureBot: Azure credentials missing. ' .
        'Please set AZURE_STORAGE_ACCOUNT_NAME/KEY in environment or .env file.');
}
