<?php
namespace local_lecturebot\exception;

defined('MOODLE_INTERNAL') || die();

/**
 * Exception thrown when content deletion fails
 */
class content_deletion_exception extends \moodle_exception
{
    /**
     * Constructor
     *
     * @param string $debuginfo Optional debug info
     */
    public function __construct($debuginfo = null)
    {
        // Using 'generalexceptionmessage' with 'error' component as a safe fallback
        // to ensure the message is displayed if specific lang string doesn't exist.
        // Ideally 'deleteerror' or similar would be in local_lecturebot lang file.
        parent::__construct('generalexceptionmessage', 'error', '', $debuginfo);
    }
}
