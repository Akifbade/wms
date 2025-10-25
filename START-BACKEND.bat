@echo off
echo ================================================
echo   STARTING QGO CARGO WMS BACKEND SERVER
echo ================================================
echo.

cd /d "%~dp0backend"

echo Killing any existing node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Starting backend server on http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
