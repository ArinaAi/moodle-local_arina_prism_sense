# Registration Flow — Brief Summary

**Plugin:** `local_arina_prism_sense` · **Version:** 2.0 · **Date:** 14 April 2026

---

## What This Does

Allows a Moodle admin to register their site with `arina.ai` directly from the plugin settings page — no manual copy-pasting of API keys. The result is an `api_key` and `org_id` automatically saved into Moodle config.

---

## The Flow in One Paragraph

Admin clicks **"Register"** on the settings page → an AJAX call fires to `api/initiate_registration.php` which generates a `session_token`, writes `reg_status = pending` to Moodle config, and calls `arina.ai/initiate-registration`. `arina.ai` sends a verification email to the admin. The settings page swaps in-place to a **waiting screen** with a 60s resend button and begins **polling `api/check_registration_status.php` every 5 seconds**. That PHP endpoint proxies `arina.ai/check-registration-status` — once the admin clicks the email link, `arina.ai` creates the account and marks the session complete with `api_key` + `org_id`. The next poll picks this up, PHP writes the credentials to `set_config`, and the settings page redirects to show a success message. The admin never leaves `settings.php`.

---

## 5 Scenarios at a Glance

| # | Scenario | What happens |
|---|----------|--------------|
| 1 | **Register button clicked** | AJAX → `initiate_registration.php` → `arina.ai/initiate-registration` → email sent → waiting screen shown → polling starts |
| 2 | **Resend Email button** | Disabled for 60s after each send. Click → same `session_token`, new `verify_token`, new email. Countdown resets. Polling unaffected. |
| 3 | **Polling — `pending`** | `arina.ai` not yet verified → keep polling every 5s |
| 3 | **Polling — `complete`** | `arina.ai` returns `api_key` + `org_id` → PHP saves to `set_config` → JS redirects to settings with success toast |
| 3 | **Polling — `expired`** | 15 min elapsed client-side → stop polling → show error → restore Register button |
| 3 | **Polling — `failed`** | `arina.ai` reports failure → stop polling → show error → re-enable Resend + Register |
| 4 | **Admin clicks email link** | `arina.ai/verify-email` creates account, stores result, shows static *"You can close this tab"* page. No redirect to Moodle. |
| 5 | **Page reload during pending** | PHP reads `set_config` on load → auto-restores waiting screen + resumes polling if within 15 min |

---

## 3 `arina.ai` Endpoints

| Endpoint | Caller | Input | Output |
|----------|--------|-------|--------|
| `POST /initiate-registration` | `initiate_registration.php` | `email`, `username`, `full_name`, `session_token` | `{ status: "email_sent" }` |
| `GET /verify-email?token=` | Admin's browser | `verify_token` in URL | Static success/error HTML page |
| `POST /check-registration-status` | `check_registration_status.php` | `session_token` | `{ status: "pending" }` or `{ status: "complete", api_key, org_id }` or `{ status: "failed", message }` |

---

## Files Touched

| File | Change |
|------|--------|
| `settings.php` | Register UI, AJAX, in-place swap, polling, resend countdown, page-load restore |
| `api/initiate_registration.php` | **New** — AJAX target, generates `session_token`, calls `arina.ai` |
| `api/check_registration_status.php` | **New** — polling proxy to `arina.ai`, writes credentials on `complete` |
| `lang/en/local_arina_prism_sense.php` | New string keys |
| `version.php` | Bumped to `2026041400` |
| `register.php` | No longer needed for registration — can be removed |

---

## Key Design Decisions

- **No `callback_url`** — `arina.ai` never calls back to Moodle. Moodle always calls out. Works on localhost.
- **No exchange token** — credentials returned directly in the polling response over HTTPS server-to-server. Never in a URL.
- **No new DB table** — state stored in `mdl_config_plugins` via `set_config` / `get_config`.
- **`arina.ai` generates `session_token`** — returned in the `/initiate-registration` response. Moodle stores it immediately in `set_config` before anything else.
- **`org_wallet_owner_id` = `org_id`** — stored as a separate `set_config` key (same value) to match IOMAD column naming and avoid breaking existing wallet lookup code.
- **`verify_token` TTL:** 10 min · **Session timeout:** 15 min · **Poll interval:** 5s · **Resend cooldown:** 60s
