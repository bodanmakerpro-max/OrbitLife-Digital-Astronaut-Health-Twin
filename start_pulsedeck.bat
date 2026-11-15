@echo off
setlocal
cd /d "%~dp0"
title PulseDeck - Local Server
echo PulseDeck - starting local server...
where py >nul 2>nul
if errorlevel 1 (
 echo Python Launcher not found. Install Python 3 from python.org.
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
echo Server stopped. If you see ModuleNotFoundError, run: py -3 -m pip install -r requirements.txt
pause
