<?php
/**
 * Azure Blob Storage Configuration
 *
 * @package    local_lecturebot
 * @copyright  2025
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// Azure Storage Configuration
define(
    'AZURE_STORAGE_CONNECTION_STRING',
    'DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT_NAME;AccountKey=YOUR_ACCOUNT_KEY;' .
    'EndpointSuffix=core.windows.net'
);
define('AZURE_STORAGE_ACCOUNT_NAME', 'YOUR_ACCOUNT_NAME');
define('AZURE_STORAGE_ACCOUNT_KEY', 'YOUR_ACCOUNT_KEY');
define('AZURE_BLOB_CONTAINER_NAME', 'bot-storage'); // Container name where PPTX files are stored

// File naming patterns
// PPTX: tutorial_{courseid}.pptx
// PDF: tutorial_{courseid}_slides.pdf
// JSON: tutorial_{courseid}.json

// Multi-Tenant Configuration
// IMPORTANT: Set a unique tenant ID for each college/installation
// This prevents folder name collisions when multiple Moodle instances share the same Azure Storage
// Examples: 'college_abc', 'university_xyz', 'institute_001'
define('LECTUREBOT_TENANT_ID', 'default_tenant'); // CHANGE THIS for each installation!
