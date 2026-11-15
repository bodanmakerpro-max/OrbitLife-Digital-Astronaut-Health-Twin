<div align="center">

<img src="assets/pulsedeck-logo-dark.png" alt="PulseDeck logo" width="480">

# PulseDeck
### Astronaut Health Monitoring & Personal Digital Twin

**NASA Space Apps 2026 | Educational prototype | Version 20.2**

[**DOWNLOAD PROJECT ZIP**](https://github.com/bodanmakerpro-max/OrbitLife-Digital-Astronaut-Health-Twin/archive/refs/heads/main.zip) · [**QUICK START**](#quick-start-windows) · [**SCREENSHOTS**](#screenshots) · [**PRESENTATION**](presentations/PulseDeck_Space_Apps_2026_7_Slides.pdf) · [**ESP32 SETUP**](RFID_AND_ESP32_SETUP_MK.md)

</div>

> **Important:** Download the current ZIP using the link above or GitHub's green **Code → Download ZIP** button. The older `OrbitLife-Digital-Astronaut-Health-Twin-main.zip` stored in this repository is a legacy snapshot and may not contain the latest changes.

## Quick start (Windows)

**Requires Python 3** (Python 3.13 recommended). No Node.js, npm or Git installation is needed.

1. Click **DOWNLOAD PROJECT ZIP** above.
2. Right-click the downloaded ZIP → **Extract All**.
3. Open the extracted folder containing `server.py`.
4. Click the Windows File Explorer address bar, type `cmd` and press Enter.
5. Run these commands:

```cmd
py -3 -m pip install -r requirements.txt
py -3 server.py
```

6. Open **http://127.0.0.1:8765** in your browser.

**Alternative:** Double-click `start_pulsedeck.bat` in the extracted folder (install dependencies first). Keep the CMD window open while using PulseDeck. Press **Ctrl+C** to stop.

**Demo login:** `astro01` / `Bodan1` (fictional astronaut data). Change the demo password before using a persistent installation.

If `py` is not recognized, install Python from [python.org](https://www.python.org/downloads/) with the Windows launcher, then reopen CMD. If port 8765 is already in use, close the other running instance.

**Do not run `npm install` or `npm run dev`.** This project uses a Python server.

## Screenshots

The images below are taken from the project repository.

| Software interface | Software interface |
|:--:|:--:|
| ![PulseDeck screenshot 1](Images%20Live%20demo/Screenshot%202026-11-15%20220249.png) | ![PulseDeck screenshot 2](Images%20Live%20demo/Screenshot%202026-11-15%20220304.png) |
| ![PulseDeck screenshot 3](Images%20Live%20demo/Screenshot%202026-11-15%20220315.png) | ![PulseDeck screenshot 4](Images%20Live%20demo/Screenshot%202026-11-15%20220343.png) |

[All screenshots and real hardware photos](Images%20Live%20demo/)

## What it does

PulseDeck brings crew health records together in a local browser application. Features include:

- Daily astronaut health check-ins and medical history
- Personal Digital Twin with historical measurements and trends
- Mood and alertness self-reports
- Mission nutrition, meals and hydration
- Symptoms, medications, radiation and cortisol records
- Persistent emergency details and incident reporting
- Multi-language user interface, personal settings and light/dark themes
- Offline demo assistance and optional connected AI
- ESP32 OLED menu, rotary encoder and RFID shortcuts

The current demo uses **eight fictional astronaut profiles** and synthetic medical readings. Digital Twin trends and survey indices are experimental and are not medical diagnoses.

## Project files and documentation

| Looking for | Open |
|---|---|
| Latest complete source ZIP | [Download the current main branch](https://github.com/bodanmakerpro-max/OrbitLife-Digital-Astronaut-Health-Twin/archive/refs/heads/main.zip) |
| Short Windows setup | [README_START_HERE.txt](README_START_HERE.txt) |
| Main software | [server.py](server.py), [index.html](index.html) |
| Windows launcher | [start_pulsedeck.bat](start_pulsedeck.bat) |
| ESP32 Arduino firmware | [ESP32_OrbitLife_OLED_Mission/](ESP32_OrbitLife_OLED_Mission/) |
| Wiring and RFID/USB instructions | [ESP32 setup (MK)](RFID_AND_ESP32_SETUP_MK.md), [wiring](WIRING_AND_SETUP.md) |
| Pictures of the real prototype | [Images Live demo/](Images%20Live%20demo/) |
| NASA Space Apps 7-slide PDF | [PulseDeck presentation](presentations/PulseDeck_Space_Apps_2026_7_Slides.pdf) |
| Editable 22-slide PowerPoint | [Full slide deck](presentations/PulseDeck_Health_Monitoring_22_Slides.pptx) |
| Research and limitations | [Research notes](DIGITAL_TWIN_RESEARCH_NOTES.md) |
| Tests and quality checks | [qa/](qa/), [QA report](QA_REPORT_MK.md) |
| Demo walkthrough (MK) | [NASA demo guide](NASA_DEMO_GUIDE_MK.md) |

## ESP32 / RFID hardware

The desktop app works without hardware. For the optional controller:

1. Open `ESP32_OrbitLife_OLED_Mission/ESP32_OrbitLife_OLED_Mission.ino` in Arduino IDE.
2. Use the compatible ESP32 board and follow [the wiring and hardware guide](RFID_AND_ESP32_SETUP_MK.md).
3. Upload firmware, close Arduino Serial Monitor, then start PulseDeck.
4. On **Welcome Page → USB / ESP32 Connection**, choose the COM port and press **Connect**. The USB serial interface uses **115200 baud**.
5. Sign in as the demo administrator to pair a test RFID card.

RC522 UID-based RFID cards are cloneable, so this login method is only suitable for a demonstration.

## Updating and troubleshooting

**Existing installations:** Back up `orbitlife_data.sqlite3`, RFID mappings and any local API key before replacing program files. Do not upload real medical data, databases or API keys to GitHub. The app runs on **127.0.0.1:8765**, not a public web server. Connected AI is optional and can share selected records with an external service.

Run smoke tests from the root folder:

```cmd
py -3 qa\smoke_test.py
py -3 qa\ui_restore_test.py
py -3 qa\test_digital_twin.py
```

Tests do not replace checks on real ESP32 hardware or a full browser QA pass.

## Research and disclaimer

- [NASA Human Research Program: risks of human spaceflight](https://www.nasa.gov/hrp/risks/)
- [Pundyavana et al. (2023): Mood and Alertness Score](https://doi.org/10.3390/app13042364)
- [Digital Twin research notes and limitations](DIGITAL_TWIN_RESEARCH_NOTES.md)

PulseDeck is an independent student NASA Space Apps demonstration, **not an official NASA, ISS, or clinical medical system**. Initial users, readings, and simulated data are fictional. Former project name: OrbitLife. The PulseDeck name has not been trademark-cleared.
