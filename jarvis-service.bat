@echo off
title JARVIS Always-On Service
color 0B
cd /d "%~dp0"

echo.
echo   =========================================
echo     J A R V I S   -   Always On Service
echo   =========================================
echo.

:loop
echo   [%date% %time%] Starting JARVIS server...
node server.js
echo.
echo   [%date% %time%] Server stopped. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
