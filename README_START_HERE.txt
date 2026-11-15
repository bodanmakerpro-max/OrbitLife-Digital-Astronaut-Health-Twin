ORBITLIFE 20.0 | DIGITAL TWIN + MOOD & ALERTNESS
See README.md for updated installation and medical-safety information.

ORBITLIFE 19.2  |  OLED + RFID AUTO LOGIN + ESP32 SETUP ON WELCOME

1. Распакувајте го пакетот во нова папка.
2. Во Windows отворете CMD во оваа папка.
3. Инсталирајте ја зависноста: py -3.13 -m pip install -r requirements.txt
4. Стартувајте: py -3.13 server.py
5. Отворете: http://127.0.0.1:8765
6. За проба, користете ја сметката astro01 / Bodan1.
7. Во Arduino IDE отворете ESP32_OrbitLife_OLED_Mission/ESP32_OrbitLife_OLED_Mission.ino.
8. Поставете го кодот на ESP32-WROOM-32. Затворете Serial Monitor.
9. На дното на Welcome Page отворете USB / ESP32 Connection, изберете COM и притиснете Connect.
10. Првпат најавете се со лозинка на администраторскиот профил и спарете ја картичката.
11. Потоа скенирањето на спарената картичка веднаш го најавува астронаутот.
12. Копчето Back to Welcome враќа на почетниот екран без Logout.
13. Подетални чекори: RFID_AND_ESP32_SETUP_MK.md.

Актуелни профили: Bodan, Alexandar, Petar, Timi, Ana, Emilija, Mile, Filip.
Профилите AST-009 и AST-010 од постарите верзии се архивираат при префрлање на база, не се бришат.

Кодот за микроконтролерот и апликацијата треба да бидат од истата верзија.
Не користете го стариот ESP32_OrbitLife_USB_NoLCD.ino за OLED.

Демо податоците и лозинките не се соодветни за реална медицинска употреба.

ORBITLIFE 19.2 FIXES
- General Quick AI floating button restored at bottom-left on Welcome and all app pages.
- General Quick AI uses /api/quick-ai; offline mode works without API credits.
- Personal health AI remains in the private menu for logged-in users.
- Welcome includes Explore all mission tools; private views require login / paired RFID.
- Main dashboard includes Explore all mission tools.
- Signed-in crew quick actions restored.
- Existing RFID auto login, Back to Welcome, and USB/ESP32 configuration kept intact.
