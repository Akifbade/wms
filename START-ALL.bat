@echo off
echo ================================================
echo   QGO CARGO WMS - COMPLETE STARTUP
echo ================================================
echo.
echo Starting both Backend and Frontend servers...
echo.

REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>&1

REM Start Backend in new window
start "QGO Backend (Port 5000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend in new window
start "QGO Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ================================================
echo   SERVERS STARTING...
echo ================================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Login: admin@demo.com
echo Password: demo123
echo.
echo Two windows will open - DO NOT close them!
echo Close this window when done.
echo ================================================

pause
