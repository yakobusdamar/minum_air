# 💧 Drink Reminder

A Chrome extension that reminds you to drink water — by sending a street performer to your browser tab.

When it's time to drink, a video overlay with music appears on your current page and **won't stop until you confirm you drank water**. No mercy.

## Features

- **Video + music overlay** — a pengamen (street performer) shows up in your tab and loops until you click "Aku sudah minum"
- **OS notification** — also fires a system notification in case the tab isn't visible
- **Configurable interval** — remind every 5 to 120 minutes
- **Snooze & Test** — snooze for N minutes, or trigger immediately to preview
- **Mute toggle** — disable the music if needed (the overlay still appears)
- **Master switch** — turn reminders on/off completely
- **Manifest V3** — built for the latest Chrome extension platform

## Installation

1. **Clone or download** this repo
   ```bash
   git clone https://github.com/your-username/drink-reminder.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** — toggle in the top-right corner of the page
4. Click **"Load unpacked"** (top-left)
5. Select the extension folder (the one containing `manifest.json`)
6. The 💧 icon appears in your toolbar — pin it for easy access
7. Click the icon to configure interval and toggle reminders on/off

> **Note:** Developer mode shows a warning on every Chrome launch. That's normal — it's just Chrome reminding you that an unpacked extension is loaded. You can dismiss it.

## Usage

- Click the 💧 icon to open settings
- Adjust the reminder interval with the slider
- Toggle the switch to enable/disable reminders
- Hit **"Test sekarang"** to see the overlay immediately
- When the reminder fires, click **"Aku sudah minum"** in the overlay to dismiss

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your settings (interval, enabled state) |
| `alarms` | Schedule recurring reminders |
| `notifications` | Fire OS-level notifications |
| `scripting` | Inject the overlay into your active tab |

## Tech

- Manifest V3 (service worker background)
- No external dependencies — vanilla JS, HTML, CSS
- Content script injected on demand, not persistently

## Assets

The overlay uses local video (`pengamen_*.mp4`) and audio (`recehan.mp3`) files in `assets/`.
