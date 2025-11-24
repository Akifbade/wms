# Simple Local Backup Setup - No Admin Required
# Run this with: powershell -ExecutionPolicy Bypass -File setup-simple.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   LOCAL BACKUP SETUP (Simple Mode)" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paths
$BackupDir = "C:\Users\USER\Videos\NEW START\backups"
$ScriptPath = "C:\Users\USER\Videos\NEW START\backup-manager-local.ps1"

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[OK] Backup directory created" -ForegroundColor Green
} else {
    Write-Host "[OK] Backup directory exists" -ForegroundColor Green
}

# Set execution policy for current user
Write-Host "[RUNNING] Setting PowerShell execution policy..." -ForegroundColor Yellow
try {
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
    Write-Host "[OK] Execution policy set" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not set execution policy: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Creating scheduled tasks..." -ForegroundColor Yellow
Write-Host ""

# Task 1: Quick backup every 5 minutes
Write-Host "Task 1: Quick Backup (every 5 minutes)" -ForegroundColor Cyan
try {
    $trigger1 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $action1 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NoLogo -ExecutionPolicy Bypass -File `"$ScriptPath`" quick"
    $settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName 'WMS-Backup-Quick' -TaskPath '\WMS Backups\' -Action $action1 -Trigger $trigger1 -Settings $settings1 -Description 'Automatic database backup every 5 minutes' -Force | Out-Null
    
    Write-Host "[OK] Task created successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create task: $_" -ForegroundColor Red
    Write-Host "[INFO] You may need to run as administrator" -ForegroundColor Yellow
}

Write-Host ""

# Task 2: Full backup daily at 2 AM
Write-Host "Task 2: Full Backup (daily at 2 AM)" -ForegroundColor Cyan
try {
    $trigger2 = New-ScheduledTaskTrigger -Daily -At 2am
    $action2 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NoLogo -ExecutionPolicy Bypass -File `"$ScriptPath`" full"
    $settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName 'WMS-Backup-Full' -TaskPath '\WMS Backups\' -Action $action2 -Trigger $trigger2 -Settings $settings2 -Description 'Automatic full system backup daily at 2 AM' -Force | Out-Null
    
    Write-Host "[OK] Task created successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create task: $_" -ForegroundColor Red
}

Write-Host ""

# Task 3: Health monitoring every hour  
Write-Host "Task 3: Backup Monitoring (every hour)" -ForegroundColor Cyan
try {
    $trigger3 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
    $action3 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NoLogo -ExecutionPolicy Bypass -File `"$ScriptPath`" monitor"
    $settings3 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName 'WMS-Backup-Monitor' -TaskPath '\WMS Backups\' -Action $action3 -Trigger $trigger3 -Settings $settings3 -Description 'Backup system health monitoring every hour' -Force | Out-Null
    
    Write-Host "[OK] Task created successfully" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to create task: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Running first backup..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run first quick backup
try {
    & $ScriptPath quick
} catch {
    Write-Host "[ERROR] First backup failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show tasks
Write-Host "Verifying tasks..." -ForegroundColor Yellow
try {
    Get-ScheduledTask -TaskPath '\WMS Backups\' -ErrorAction SilentlyContinue | Format-Table TaskName, State -AutoSize
} catch {
    Write-Host "[WARN] Could not list tasks (may need admin)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[OK] Automatic backups are now configured!" -ForegroundColor Green
Write-Host "[OK] Backups will run every 5 minutes + daily at 2 AM" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
