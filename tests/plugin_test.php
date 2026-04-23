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
 * Basic plugin sanity tests for local_arina_prism_sense.
 *
 * @package    local_arina_prism_sense
 * @category   test
 * @copyright  2025 Arina AI <info@arina.ai>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Sanity test suite for the PRISM Sense local plugin.
 *
 * @covers \local_arina_prism_sense
 */
class LocalArinaPrismSensePluginTest extends advanced_testcase
{

    /**
     * Verify the plugin is installed and the component name is correct.
     */
    public function test_plugin_installed(): void
    {
        $pluginman = core_plugin_manager::instance();
        $info = $pluginman->get_plugin_info('local_arina_prism_sense');
        $this->assertNotNull($info, 'Plugin local_arina_prism_sense should be installed.');
        $this->assertEquals('local_arina_prism_sense', $info->component);
    }

    /**
     * Verify the pluginname language string is defined.
     */
    public function test_pluginname_string_defined(): void
    {
        $name = get_string('pluginname', 'local_arina_prism_sense');
        $this->assertNotEmpty($name);
        $this->assertStringNotContainsString('[[', $name, 'pluginname string should be defined in lang file.');
    }

    /**
     * Verify defined capabilities exist after install.
     */
    public function test_capabilities_defined(): void
    {
        $caps = [
            'local/arina_prism_sense:generatecontent',
            'local/arina_prism_sense:approvecontent',
        ];
        foreach ($caps as $cap) {
            $this->assertTrue(
                get_capability_info($cap) !== false,
                "Capability {$cap} should be defined."
            );
        }
    }
}
