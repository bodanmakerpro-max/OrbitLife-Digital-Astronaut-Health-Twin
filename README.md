# OrbitLife 20.0 | Personal Digital Twin

**Educational NASA Space Apps 2026 demo**, not NASA or ISS medical software. The astronaut crew and seeded health readings are fictional.

OrbitLife combines local health check-ins, mission nutrition, symptom reports, emergency cards, medications, radiation and cortisol logs, wearable-style records, RFID + ESP32 shortcuts, and two AI modes. Version 20 adds a personal Digital Twin for each of the eight astronauts and a new Cognition-inspired mood and alertness survey.

## Run locally (Windows)

1. Install Python 3.13 (or Python 3.x) and extract the entire ZIP.
2. Open CMD in the folder containing `server.py`.
3. First use: `py -3.13 -m pip install -r requirements.txt` (or use `py -3` instead of `py -3.13`).
4. Start: `py -3.13 server.py`, or double click `start_orbitlife.bat`.
5. Open <http://127.0.0.1:8765>.

On a fresh demo database, use `astro01` / `Bodan1` to sign in as the first fictional crew member. Change this password if you keep the database. Demo passwords are never suitable for real medical records.

If you already have OrbitLife installed, **back up your `orbitlife_data.sqlite3` first**, then replace only the program files. Never overwrite or publish your existing SQLite database, RFID card mappings, or API key. The new mood table is added automatically when the server first starts.

## What's new

- **Digital Twin** in sidebar and Welcome Page: draws on the current astronaut's existing saved records. Administrator can select other crew records; everyone else is limited to their own.
- Seven visible signals with the latest value, source, up to 30 historical points and a median of the preceding seven readings, shown only when there are at least three prior records.
- **Mood & alertness check-in**: a quick 5-item option and an optional 14-item option based on the topics in the research paper. All responses are saved locally with time, date, source and optional notes.
- A clearly labelled **experimental self-report comfort index** based on the average of survey answers. It is **not** the published AMS-SD or AMS-LD research score. The app does not implement NASA Cognition's 10 objective psychological tasks.
- New mood history and access through the existing personal AI assistant.
- 12 topics from the supplied space-health research notes and NASA HRP risk catalogue as **reference information**, not a medical risk predictor.
- Existing general Quick AI, personal health AI, emergency button, nutrition, multilingual accounts, light/dark preferences, RFID login, ESP32 USB menu, OLED and Back to Welcome remain in place.

## Setup and permissions

Use **Welcome Page → USB / ESP32 Connection**. Choose the COM port and Connect. The firmware in `ESP32_OrbitLife_OLED_Mission/` uses USB Serial at 115200 baud with its documented supported board. Pair an RFID card after signing in as the demo administrator. It can then authenticate its assigned demo profile. RC522 UID-only cards can be cloned: do not use them for real private records.

The app listens on `127.0.0.1` only. It requires no cloud login or AI key for the local demo. Connected AI is an optional external service and sends the selected astronaut's relevant records to that service only when the user chooses connected mode.

## Test

Run from the program folder:

```bat
py -3.13 qa\smoke_test.py
py -3.13 qa\ui_restore_test.py
py -3.13 qa\test_digital_twin.py
```

The physical ESP32/RC522, clinical validity, medical devices and full visual behavior in a real browser require separate verification. Passing automated tests does not mean this software is free of bugs.

## Research

- NASA, [Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/)
- Pundyavana et al. (2023), [Cognition Test Battery Survey: Development of a Single Alertness and Mood Score](https://doi.org/10.3390/app13042364)
- User-supplied *Space Health App.pdf*, pages 1–3 (lunar South Pole scenario and risk-topic outline).
- See [`DIGITAL_TWIN_RESEARCH_NOTES.md`](DIGITAL_TWIN_RESEARCH_NOTES.md) for exact limitations.

## Space Apps 2026 presentation

The seven-slide team presentation is available as a PDF:
[OrbitLife NASA Space Apps 2026 - 7 slides](presentations/OrbitLife_Space_Apps_2026_7_Slides.pdf).
