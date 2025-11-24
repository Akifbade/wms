@echo off
echo ================================================
echo   STARTING QGO CARGO WMS FRONTEND SERVER
echo ================================================
echo.

cd /d "%~dp0frontend"

echo.
echo Starting frontend server on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
