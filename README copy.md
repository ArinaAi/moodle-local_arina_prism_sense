# LectureBot Moodle Plugin

LectureBot is a local Moodle plugin that integrates with AI services to generate and manage lecture content (PPTX, PDF) automatically.

## Installation

1. Download the plugin and extract it to `local/lecturebot` in your Moodle installation.
2. Visit the Moodle Notifications page to trigger the database upgrade and installation.

## Configuration

The plugin uses a configuration file for Azure Storage and API settings.

1. Locate `config_azure.sample.php` in the plugin root.
2. Copy it to `config_azure.php`.
   ```bash
   cp config_azure.sample.php config_azure.php
   ```
3. Edit `config_azure.php` and provide your Azure Storage credentials:
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `AZURE_STORAGE_ACCOUNT_NAME`
   - `AZURE_STORAGE_ACCOUNT_KEY`

> **Note**: `config_azure.php` is gitignored to prevent committing sensitive credentials.

4. (Optional) Adjust `config_api.php` if you need to point to a different API environment.

## Development

The plugin includes an AMD module built with React.

1. Navigate to the `amd` directory:
   ```bash
   cd amd
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
