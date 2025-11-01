@echo off
REM Windows Database Restore Script
REM Usage: restore-database.bat backup_20251027_184530.sql

if "%1"=="" (
    echo ❌ Error: Please provide backup file name
    echo Usage: restore-database.bat backup_20251027_184530.sql
    echo.
    echo Available backups:
    dir /B database-backups\backup_*.sql
    exit /b 1
)

SET BACKUP_FILE=%cd%\database-backups\%1

if not exist "%BACKUP_FILE%" (
    echo ❌ Backup file not found: %BACKUP_FILE%
    exit /b 1
)

echo ⚠️  WARNING: This will REPLACE current database with backup!
echo 📁 Backup file: %1
set /p confirm="Continue? (yes/no): "

if not "%confirm%"=="yes" (
    echo ❌ Restore cancelled
    exit /b 0
)

echo 🔄 Restoring database...
type "%BACKUP_FILE%" | docker exec -i wms-database mysql -u root -prootpassword warehouse_wms

if %ERRORLEVEL% EQU 0 (
    echo ✅ Database restored successfully!
    echo 🔄 Restarting backend...
    docker-compose restart backend
) else (
    echo ❌ Restore failed!
    exit /b 1
)
