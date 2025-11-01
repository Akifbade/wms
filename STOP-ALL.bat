@echo off
echo ================================================
echo   STOPPING QGO CARGO WMS SERVERS
echo ================================================
echo.

echo Killing all Node.js processes...
taskkill /F /IM node.exe

echo.
echo All servers stopped!
echo ================================================

pause
