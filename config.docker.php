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
unset($CFG);
global $CFG;
$CFG = new stdClass();

//=========================================================================
// 1. DATABASE SETUP
//=========================================================================
$CFG->dbtype    = getenv('MOODLE_DATABASE_TYPE');                    // 'mysqli' for MySQL
$CFG->dblibrary = 'native';
$CFG->dbhost    = getenv('MOODLE_DATABASE_HOST');                    // Docker service name
$CFG->dbname    = getenv('MOODLE_DATABASE_NAME');
$CFG->dbuser    = getenv('MOODLE_DATABASE_USER');
$CFG->dbpass    = getenv('MOODLE_DATABASE_PASSWORD');
$CFG->prefix    = 'mdl_';
$CFG->dboptions = [
    'dbpersist' => false,
    'dbsocket'  => false,
    'dbport'    => '3306',
    'dbcollation' => 'utf8mb4_unicode_ci',
];

//=========================================================================
// 2. WEB ADDRESS
//=========================================================================
$CFG->wwwroot   = getenv('MOODLE_WWWROOT');

$CFG->reverseproxy = true;
$CFG->sslproxy = true;

$CFG->proxyhost = 'demo.arina.ai';
$CFG->proxyport = 443;

// ADD THIS
$CFG->behatrunprocesses = false;

//=========================================================================
// 3. DATA DIRECTORY
//=========================================================================
$CFG->dataroot  = '/var/www/moodledata';

//=========================================================================
// 4. OTHER SETTINGS
//=========================================================================
$CFG->admin = 'admin';

$CFG->directorypermissions = 0777;

// Minimum delay between cron runs (in seconds)
// Default is 180 (3 minutes). Set to 1 for faster cron execution.
$CFG->mincrondelay = 1;

// Session handling (optional - use Redis for better performance)
// Uncomment these lines to use Redis for sessions
// $CFG->session_handler_class = '\core\session\redis';
// $CFG->session_redis_host = 'redis';
// $CFG->session_redis_port = 6379;
// $CFG->session_redis_database = 0;
// $CFG->session_redis_prefix = 'moodle_sess_';
// $CFG->session_redis_acquire_lock_timeout = 120;
// $CFG->session_redis_lock_expire = 7200;

// Caching (optional - use Redis for better performance)
// Uncomment after initial installation
// $CFG->session_handler_class = '\core\session\redis';
// $CFG->session_redis_host = 'redis';

// @codingStandardsIgnoreLine - Moodle core bootstrap file must use require_once
require_once(__DIR__ . '/lib/setup.php');

// There is no php closing tag in this file,
// it is intentional because it prevents trailing whitespace problems!
