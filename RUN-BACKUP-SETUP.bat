@echo off
REM Simple One-Click Backup Setup
REM Requires: Running as Administrator

cd /d "C:\Users\USER\Videos\NEW START"

REM Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: This script must run as Administrator!
    echo Please right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    LOCAL AUTOMATIC BACKUP SETUP
echo ========================================
echo.

REM Create backup directory
if not exist "backups" (
    mkdir backups
    echo [OK] Backup directory created
) else (
    echo [OK] Backup directory already exists
)

REM Set execution policy
echo [RUNNING] Setting PowerShell execution policy...
powershell -NoProfile -Command "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force"

REM Create Task Scheduler tasks
echo [RUNNING] Creating Windows Task Scheduler jobs...
echo.

REM Task 1: Quick backup every 5 minutes
echo Creating task: Quick Backup (every 5 minutes)...
powershell -NoProfile -Command "$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5); $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -NoLogo -ExecutionPolicy Bypass -File \"C:\Users\USER\Videos\NEW START\backup-manager-local.ps1\" quick'; $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable; Register-ScheduledTask -TaskName 'WMS-Backup-Quick' -TaskPath '\WMS Backups\' -Action $action -Trigger $trigger -Settings $settings -Description 'Automatic database backup every 5 minutes' -Force" 2>nul
if %errorlevel% equ 0 (
    echo [OK] Task 1 created
) else (
    echo [WARN] Task 1 may need manual setup
)

echo.

REM Task 2: Full backup daily at 2 AM
echo Creating task: Full Backup (daily at 2 AM)...
powershell -NoProfile -Command "$trigger = New-ScheduledTaskTrigger -Daily -At 2am; $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -NoLogo -ExecutionPolicy Bypass -File \"C:\Users\USER\Videos\NEW START\backup-manager-local.ps1\" full'; $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable; Register-ScheduledTask -TaskName 'WMS-Backup-Full' -TaskPath '\WMS Backups\' -Action $action -Trigger $trigger -Settings $settings -Description 'Automatic full system backup daily at 2 AM' -Force" 2>nul
if %errorlevel% equ 0 (
    echo [OK] Task 2 created
) else (
    echo [WARN] Task 2 may need manual setup
)

echo.

REM Task 3: Health monitoring every hour
echo Creating task: Health Monitoring (every hour)...
powershell -NoProfile -Command "$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1); $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -NoLogo -ExecutionPolicy Bypass -File \"C:\Users\USER\Videos\NEW START\backup-manager-local.ps1\" monitor'; $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable; Register-ScheduledTask -TaskName 'WMS-Backup-Monitor' -TaskPath '\WMS Backups\' -Action $action -Trigger $trigger -Settings $settings -Description 'Backup system health monitoring every hour' -Force" 2>nul
if %errorlevel% equ 0 (
    echo [OK] Task 3 created
) else (
    echo [WARN] Task 3 may need manual setup
)

echo.

REM Run first backup
echo ========================================
echo    Running first backup now...
echo ========================================
echo.

powershell -NoProfile -NoLogo -ExecutionPolicy Bypass -File "backup-manager-local.ps1" quick

echo.
echo ========================================
echo    SETUP COMPLETE!
echo ========================================
echo.
echo Scheduled Tasks Created:
echo   - WMS-Backup-Quick   (Every 5 minutes)
echo   - WMS-Backup-Full    (Daily at 2 AM)
echo   - WMS-Backup-Monitor (Every hour)
echo.
echo Your system is now protected 24/7!
echo Backups run automatically forever.
echo.

REM Show scheduled tasks
echo Verifying tasks...
powershell -Command "Get-ScheduledTask -TaskPath '\WMS Backups\' | Select-Object TaskName, State"

echo.
echo Setup complete! You can close this window.
echo.
pause
