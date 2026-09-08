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

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. The extension icon appears in your toolbar — configure interval and toggle in the popup

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
