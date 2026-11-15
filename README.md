# OrbitLife 19.2 - Digital Astronaut Health Twin

OrbitLife is an **educational astronaut health dashboard prototype** developed for NASA Space Apps 2026. This repository includes the web application, local Python server, ESP32 OLED/RFID firmware and UI/testing files.

**This is a demonstration, not a clinical medical device.** The included astronaut profiles and health records are fictional. This project is not approved for use on the ISS and is not affiliated with or endorsed by NASA.

## Run on Windows

Install [Python 3.13](https://www.python.org/downloads/) and Git. In Command Prompt:

```bat
git clone https://github.com/bodanmakerpro-max/OrbitLife-Digital-Astronaut-Health-Twin.git
cd OrbitLife-Digital-Astronaut-Health-Twin
py -3.13 -m pip install -r requirements.txt
py -3.13 server.py
```

Open **http://127.0.0.1:8765** in a browser. If Python is installed under another version, use `py -3 -m pip install -r requirements.txt` and `py -3 server.py`.

## Main features

- Crew dashboard, daily health logs, nutrition, medical timeline and emergency details
- Quick AI assistant (offline demonstration and optional connected AI)
- Personalized astronaut records and localization
- ESP32 USB Serial connection from the Welcome screen
- RFID card pairing and one-scan login for demo crew accounts
- OLED display and rotary encoder terminal support
- Return to Welcome without logging out, plus separate Logout

For ESP32 firmware and wiring instructions, see [RFID_AND_ESP32_SETUP_MK.md](RFID_AND_ESP32_SETUP_MK.md) and [WIRING_AND_SETUP.md](WIRING_AND_SETUP.md). The included firmware is in `ESP32_OrbitLife_OLED_Mission/`.

The **Welcome > USB / ESP32 Connection** menu uses USB Serial at 115200 baud, not Wi-Fi. Close Arduino Serial Monitor before connecting.

## Optional connected AI

Quick AI includes an offline mode. To enable the connected mode locally, set an `OPENAI_API_KEY` environment variable or create an **untracked** `OrbitLife_API_Key.txt` locally. Never commit or share your key.

## Data and security

The server binds to `127.0.0.1` and is for local demos only. It creates a local SQLite database on first launch. Account setup can use fictional demonstration credentials, but the RFID UID authentication is **not secure against card cloning** and must not be used for real medical records or deployed publicly. The project files containing local keys, demo login sheets and database are omitted from this public repository.

## Tests

```bat
py -3.13 qa\smoke_test.py
py -3.13 qa\ui_restore_test.py
```

See `README_START_HERE.txt`, `RESTORED_FEATURES_19_2.md` and `QA_REPORT_MK.md` for additional notes.
