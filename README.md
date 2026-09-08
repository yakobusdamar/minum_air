# 💧 Drink Reminder

A Chrome extension that reminds you to drink water — by sending a street performer to your browser tab.

When it's time to drink, a video overlay with music appears on your current page and **won't stop until you confirm you drank water**. No mercy.

## Installation

1. **Clone or download** this repo
   ```bash
   git clone https://github.com/yakobusdamar/minum_air.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** — toggle in the top-right corner of the page
4. Click **"Load unpacked"** (top-left)
5. Select the extension folder (the one containing `manifest.json`)
6. The 💧 icon appears in your toolbar — pin it for easy access

> **Note:** Developer mode shows a warning on every Chrome launch. That's normal — just dismiss it.

## Configuration

Click the extension icon to open settings:

- **Power toggle** — turn reminders on/off
- **Interval** — remind every 5–120 minutes (slider)
- **🔊 Suara pengamen** — mute/unmute the music
- **Test sekarang** — trigger the overlay immediately
- **Simpan** — save your settings

When the reminder fires, click **"Aku sudah minum"** in the overlay to dismiss it.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your settings |
| `alarms` | Schedule recurring reminders |
| `notifications` | Fire OS notification when Chrome is not active |
| `scripting` | Inject the overlay into your active tab |
