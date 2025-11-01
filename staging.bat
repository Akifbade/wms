@echo off
REM Quick Staging Control Shortcuts

if "%1"=="" goto HELP
if "%1"=="on" goto START
if "%1"=="off" goto STOP
if "%1"=="status" goto STATUS
if "%1"=="restart" goto RESTART
goto HELP

:START
echo.
echo Starting Staging Environment...
powershell -ExecutionPolicy Bypass -File "%~dp0staging-control.ps1" start
goto END

:STOP
echo.
echo Stopping Staging Environment...
powershell -ExecutionPolicy Bypass -File "%~dp0staging-control.ps1" stop
goto END

:STATUS
powershell -ExecutionPolicy Bypass -File "%~dp0staging-control.ps1" status
goto END

:RESTART
echo.
echo Restarting Staging Environment...
powershell -ExecutionPolicy Bypass -File "%~dp0staging-control.ps1" restart
goto END

:HELP
echo.
echo ======================================
echo   STAGING ENVIRONMENT SHORTCUTS
echo ======================================
echo.
echo Usage: staging [command]
echo.
echo Commands:
echo   on       - Turn ON staging environment
echo   off      - Turn OFF staging environment (Save 900MB RAM)
echo   status   - Check status
echo   restart  - Restart staging
echo.
echo Examples:
echo   staging on
echo   staging off
echo   staging status
echo.
goto END

:END
