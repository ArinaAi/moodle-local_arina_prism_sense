# Moodle Plugin Version Lock — How It Works & How to Avoid It

## What Is the Version Lock?

Every Moodle plugin declares its version number in `version.php`:

```php
$plugin->version = 2026050800;   // YYYYMMDDNN format
```

When Moodle boots it compares this number against what is stored in the
`mdl_config_plugins` table (`version` key for `local_arina_prism_sense`).

| Condition | What Moodle does |
|-----------|-----------------|
| `version.php` > DB version | Flags the plugin as **needing an upgrade** — shows the upgrade screen or auto-runs `db/upgrade.php` |
| `version.php` == DB version | Normal operation ✅ |
| `version.php` < DB version | **LOCKS the plugin.** Moodle treats the installation as "downgraded" and refuses to run any adhoc tasks or cron jobs for the plugin |

## What the Lock Actually Breaks

When the lock triggers you will notice:

- **Cron / adhoc tasks stop silently.** `generate_content_task`, scheduled notifications, and all other `\local_arina_prism_sense\task\*` classes are never dispatched.
- **Page loads and synchronous API calls still work** (upload, fetch sources, delete, etc.) because those are direct PHP requests, not task-queue items.
- **No visible error** is shown to the teacher or student — content simply stays in `generating` state forever.
- **Server logs** may show `Plugin version downgrade detected` or the upgrade pending flag; check `mdl_config_plugins` to confirm.

## How to Check the Current DB Version

```sql
SELECT value
FROM mdl_config_plugins
WHERE plugin = 'local_arina_prism_sense'
  AND name   = 'version';
```

Compare the result against `$plugin->version` in `version.php`.
If DB value > `version.php` value → you have a lock.

### Quick one-liner (MAMP / local)
```bash
php -r "
define('CLI_SCRIPT', true);
require '/Applications/MAMP/htdocs/moodle/config.php';
echo \$DB->get_field('config_plugins','value',['plugin'=>'local_arina_prism_sense','name'=>'version']) . PHP_EOL;
"
```

## How to Fix It

### Option A — Bump `version.php` to match (preferred)

Set `$plugin->version` to a value **≥** the DB version.  
Use today's date + a two-digit sequence number:

```php
// db version was 2026050800 after a hotfix was deployed from another branch
$plugin->version = 2026050800;   // must be >= DB value
```

Then trigger the Moodle upgrade:
```
https://<site>/admin/index.php
```
or via CLI:
```bash
php admin/cli/upgrade.php --non-interactive
```

### Option B — Reset the DB version (only on dev/staging)

**Never do this on production.** If you need to test a lower version number locally:

```sql
UPDATE mdl_config_plugins
SET    value = '2026050800'   -- match your version.php
WHERE  plugin = 'local_arina_prism_sense'
  AND  name   = 'version';
```

## Rules for Merging Branches

1. **Before merging a branch**, compare its `version.php` against the value that is currently in the target environment's DB.
2. **Never decrease the version number** — even temporarily.
3. **After any database schema change** (`db/install.xml` or `db/upgrade.php`), increment the version.
4. Format: `YYYYMMDDNN` where `NN` starts at `00` and increments if you deploy more than once in a day.
5. If two branches independently bump to the same number and both get merged, increment one of them by 1 before the second merge.

## Version History That Triggered the Lock in This Project

| Date | What happened | Fix applied |
|------|---------------|-------------|
| May 2026 | `vidplaylist` branch had `version.php = 2026043001` while DB already recorded `2026050800` from a hotfix deployed from `main`. Cron locked; content generation stopped. | Bumped `version.php` to `2026050800` across all branches. |
| Jun 2026 | Added `is_deleted` soft-delete column to `local_arina_prism_sense_content` (`db/install.xml` + `db/upgrade.php`). | Bumped to `2026060100`; migration function `local_arina_prism_sense_upgrade_2026060100` adds the column. |

## Current Version

```
$plugin->version = 2026060100;   // as of 2026-06-01 — added is_deleted soft-delete column
```

Always keep this document in sync when the version is changed.
