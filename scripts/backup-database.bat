@echo off
REM Windows Database Backup Script
REM Run this manually or setup Task Scheduler

SET BACKUP_DIR=%cd%\database-backups
SET DATE=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
SET DATE=%DATE: =0%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [%DATE%] Creating database backup...
docker exec wms-database mysqldump -u root -prootpassword warehouse_wms > "%BACKUP_DIR%\backup_%DATE%.sql"

if %ERRORLEVEL% EQU 0 (
    echo [%DATE%] ✅ Backup created successfully!
    echo [%DATE%] Location: %BACKUP_DIR%\backup_%DATE%.sql
) else (
    echo [%DATE%] ❌ Backup failed!
    exit /b 1
)

REM List all backups
echo.
echo Available backups:
dir /B "%BACKUP_DIR%\backup_*.sql"
