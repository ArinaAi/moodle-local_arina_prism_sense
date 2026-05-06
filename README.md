# PRISM Sense (local_arina_prism_sense)

AI-powered lecture content generation for Moodle. PRISM Sense connects to the **Arina AI** service to turn existing course materials (PDFs, documents) into structured, interactive lectures — slides, table-of-contents, quizzes, and rich HTML content — directly inside your Moodle course.

---

## Requirements

| Requirement | Version |
|---|---|
| Moodle | 4.5+ (2024100700) |
| PHP | 8.1+ |
| Database | MySQL 8 / MariaDB 10.6+ / PostgreSQL 13+ |
| **Arina API key** | Required (details below) |

> **Third-party subscription required.** This plugin requires an active Arina AI account and API key. Contact [info@arina.ai](mailto:info@arina.ai) for access or trial credentials.

---

## Installation

### 1. Install the plugin

**Via ZIP (recommended):**
1. Download the plugin ZIP from the Moodle Plugins directory.
2. In Moodle: **Site administration → Plugins → Install plugins**.
3. Upload the ZIP and click **Install plugin from the ZIP file**.
4. Follow the on-screen upgrade confirmation.

**Manual install:**
1. Extract the folder to `{moodle_root}/local/arina_prism_sense/`.
2. Visit **Site administration → Notifications** to run the database upgrade.

### 2. Configure the global API key

1. Go to **Site administration → Plugins → Local plugins → PRISM Sense**.
2. Enter your **Arina API Key** in the *Arina API Key (Global / Fallback)* field.
3. Click **Save changes**.

### 3. IOMAD multi-tenant setup (optional)

If you are running an **IOMAD** instance, per-company API keys override the global key:

1. Go to **Site administration → Plugins → Local plugins → PRISM Sense → Configure Per-Company API Keys**.
2. Select the company and enter its dedicated Arina API key.
3. Save changes.

Each company's users will then use their own Arina credit pool.

---

## Features

- **AI content generation** — Converts PDFs into structured Moodle lectures via the Arina API.
- **Content approval workflow** — Teachers generate, managers approve and publish.
- **Student completion tracking** — Tracks which students have viewed each content item.
- **Credit management** — Integrated with the Arina credit wallet; usage dashboard in the CMS.
- **IOMAD multi-tenancy** — Per-company API keys and isolated credit pools.
- **Content export** — Download content as PPTX or PDF.

---

## Privacy

This plugin processes and stores personal data. See [Privacy](#privacy-api) section and the plugin's built-in Privacy API (`classes/privacy/provider.php`).

**Data stored:**
- `local_arina_prism_sense_content`: User IDs of who created, approved, and published content.
- `local_arina_prism_sense_tracking`: Student completion records (user ID + content ID + status).
- `local_arina_prism_sense_feedback`: User feedback including optional free-text comments and ratings.
- **User preference**: `arina_prism_sense_wallet_sub_user_id` — UUID linking to Arina credit wallet.

**External data sharing:**
- The user's UUID is sent to the **Arina AI API** for credit tracking purposes.

Moodle's Privacy API is fully implemented. Users can request export or deletion of their data via **Site administration → Privacy and policies → Data requests**.

---

## Uninstallation

1. Go to **Site administration → Plugins → Plugins overview**, find *PRISM Sense*, and click **Uninstall**.
2. Confirm the database table removal when prompted.
3. Manually remove the `local/arina_prism_sense` directory.

---

## License

This plugin is licensed under the [GNU GPL v3 or later](https://www.gnu.org/licenses/gpl-3.0.html).

```
Copyright (C) 2024–2026 Arina AI <info@arina.ai>
```