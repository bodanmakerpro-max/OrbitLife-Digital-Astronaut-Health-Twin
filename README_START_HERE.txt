PULSEDECK 20.2 - START HERE (WINDOWS)

1. Download the CURRENT ZIP: https://github.com/bodanmakerpro-max/OrbitLife-Digital-Astronaut-Health-Twin/archive/refs/heads/main.zip
   Do not use the old ZIP stored inside the repository.
2. Right-click ZIP > Extract All.
3. Open the extracted folder containing server.py.
4. Click File Explorer address bar, type cmd, press Enter.
5. In CMD run:

   py -3 -m pip install -r requirements.txt
   py -3 server.py

6. Open http://127.0.0.1:8765
7. Demo login: astro01 / Bodan1

Alternative after dependency install: double-click start_pulsedeck.bat.
Requires Python 3 (3.13 recommended), NOT Node.js/npm.

ESP32: See RFID_AND_ESP32_SETUP_MK.md; firmware is in ESP32_OrbitLife_OLED_Mission/.
Screenshots and hardware images: Images Live demo/
Presentations: presentations/

SECURITY: Fictional records only. Back up orbitlife_data.sqlite3 before updating; never upload personal health data, real API keys or databases.

MK KRATKO:
Simni go noviot ZIP od linkot gore, Extract All, otvori go folderot so server.py,
vo address bar napishi cmd, pa izvrshete gi dvete komandi gore.
Otvori http://127.0.0.1:8765 vo browser.
