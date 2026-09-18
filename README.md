# 💧 Drink Reminder

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![version](https://img.shields.io/badge/version-1.0.0-brightgreen)
![mercy](https://img.shields.io/badge/mercy-none-red)

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

- **Pengingat aktif** — master on/off switch
- **Jenis pengamen** — pick your performer: **🐱 Tabby busker** (default) or **🐈 Kitten groups**
- **Ingatkan setiap** — remind every 5–120 minutes (slider)
- **🔊 Suara pengamen** — toggle the background music
- **Test sekarang** — trigger the overlay immediately
- **Simpan** — save the interval

When the reminder fires, the overlay plays until you click **"💧 Sudah minum"**. Prefer to procrastinate? **"💰 Kasih uang"** snoozes it for 5 minutes.

## Assets

All media lives under `assets/`:

```
assets/
├── musics/               # background songs (music_1.mp3, music_2.mp3, ...)
├── video_tabby_busker/   # tabby busker theme
└── video_kitten_group/   # kitten groups theme
```

Each video theme folder needs four clips: `pengamen_datang.mp4`, `pengamen_nyanyi.mp4`, `pengamen_kasih.mp4`, and `pengamen_minum.mp4`. Add more `music_N.mp3` files and they'll be auto-detected.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your settings |
| `alarms` | Schedule recurring reminders |
| `scripting` | Inject the overlay into your active tab |
