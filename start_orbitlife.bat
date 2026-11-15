@echo off
setlocal
cd /d "%~dp0"
echo Starting PulseDeck 20.0...
where py >nul 2>nul
if errorlevel 1 (
  echo Python Launcher not found. Install Python 3.13 and try again.
  pause
  exit /b 1
)
py -3.13 --version >nul 2>nul
if not errorlevel 1 (
  py -3.13 server.py
) else (
  py -3 server.py
)
echo.
echo PulseDeck stopped. See any error above.
pause
