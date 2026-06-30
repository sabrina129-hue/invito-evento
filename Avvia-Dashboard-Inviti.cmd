@echo off
setlocal
cd /d "%~dp0"

echo Avvio dashboard inviti...
echo.
echo Se il browser non si apre da solo, visita:
echo http://localhost:5173/#/dashboard
echo.

start "" "http://localhost:5173/#/dashboard"
npm run dev -- --host 127.0.0.1

pause
