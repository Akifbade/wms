# Setup Automatic Backups on Local Machine (Windows)
# This script creates Windows Task Scheduler tasks to automatically backup your system
# Run this ONCE with admin rights, then backups run automatically forever!

# Configuration
$ScriptPath = "C:\Users\USER\Videos\NEW START\backup-manager-local.ps1"
$BackupDir = "C:\Users\USER\Videos\NEW START\backups"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LOCAL AUTOMATIC BACKUP SETUP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')
if (-not $isAdmin) {
    Write-Host "❌ This script must run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    exit 1
}

# Create backup directory
Write-Host "📁 Creating backup directory..." -ForegroundColor Yellow
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✅ Backup directory created: $BackupDir" -ForegroundColor Green
}
else {
    Write-Host "✅ Backup directory exists: $BackupDir" -ForegroundColor Green
}

# Verify backup script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ Backup script not found: $ScriptPath" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backup script found" -ForegroundColor Green

Write-Host ""
Write-Host "⚙️  Creating Task Scheduler tasks..." -ForegroundColor Yellow
Write-Host ""

# Task 1: Quick backup every 5 minutes
Write-Host "Task 1: Quick Backup (every 5 minutes)" -ForegroundColor Cyan
$taskName1 = "WMS-Backup-Quick"
$taskPath = "\WMS Backups\"
$triggerMinute = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 999)
$actionCmd1 = "powershell.exe"
$actionArg1 = "-NoProfile -NoLogo -ExecutionPolicy Bypass -File `"$ScriptPath`" quick"
$action1 = New-ScheduledTaskAction -Execute $actionCmd1 -Argument $actionArg1
$settings1 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $taskName1 -TaskPath $taskPath -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName1 -TaskPath $taskPath -Action $action1 -Trigger $triggerMinute -Settings $settings1 -Description "Automatic database backup every 5 minutes" | Out-Null
    Write-Host "✅ Task created: $taskName1" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Could not create task: $_" -ForegroundColor Yellow
}

# Task 2: Full backup daily at 2 AM
Write-Host "Task 2: Full Backup (daily at 2 AM)" -ForegroundColor Cyan
$taskName2 = "WMS-Backup-Full"
$trigger2 = New-ScheduledTaskTrigger -Daily -At 2am
$action2 = New-ScheduledTaskAction -Execute $actionCmd1 -Argument "-NoProfile -NoLogo -ExecutionPolicy Bypass -File `"$ScriptPath`" full"
$settings2 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $taskName2 -TaskPath $taskPath -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName2 -TaskPath $taskPath -Action $action2 -Trigger $trigger2 -Settings $settings2 -Description "Automatic full system backup daily at 2 AM" | Out-Null
    Write-Host "✅ Task created: $taskName2" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Could not create task: $_" -ForegroundColor Yellow
}

# Task 3: Health monitoring every hour
Write-Host "Task 3: Backup Monitoring (every hour)" -ForegroundColor Cyan
$taskName3 = "WMS-Backup-Monitor"
$trigger3 = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 999)
$action3 = New-ScheduledTaskAction -Execute $actionCmd1 -Argument "-NoProfile -NoLogo -ExecutionPolicy Bypass -File `"$ScriptPath`" monitor"
$settings3 = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Unregister-ScheduledTask -TaskName $taskName3 -TaskPath $taskPath -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName3 -TaskPath $taskPath -Action $action3 -Trigger $trigger3 -Settings $settings3 -Description "Backup system health monitoring every hour" | Out-Null
    Write-Host "✅ Task created: $taskName3" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ Could not create task: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 SCHEDULED TASKS:" -ForegroundColor Cyan
Write-Host "  1. Quick Backup: Every 5 minutes" -ForegroundColor White
Write-Host "  2. Full Backup: Daily at 2 AM" -ForegroundColor White
Write-Host "  3. Health Monitor: Every hour" -ForegroundColor White
Write-Host ""

Write-Host "📁 Backup Location:" -ForegroundColor Cyan
Write-Host "  $BackupDir" -ForegroundColor White
Write-Host ""

Write-Host "🔄 Manual Commands:" -ForegroundColor Cyan
Write-Host "  Quick backup now:" -ForegroundColor White
Write-Host "    .\backup-manager-local.ps1 quick" -ForegroundColor Gray
Write-Host ""
Write-Host "  Full backup now:" -ForegroundColor White
Write-Host "    .\backup-manager-local.ps1 full" -ForegroundColor Gray
Write-Host ""
Write-Host "  View all backups:" -ForegroundColor White
Write-Host "    .\backup-manager-local.ps1 list" -ForegroundColor Gray
Write-Host ""
Write-Host "  Health check:" -ForegroundColor White
Write-Host "    .\backup-manager-local.ps1 monitor" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ AUTOMATIC BACKUPS ACTIVE 24/7!" -ForegroundColor Green
Write-Host "🛡️  Your system is protected locally!" -ForegroundColor Green
Write-Host ""

# Run first quick backup
Write-Host "🚀 Running first backup now..." -ForegroundColor Yellow
Write-Host ""
& $ScriptPath quick

Write-Host ""
Write-Host "✅ Setup complete! Backups are now running automatically." -ForegroundColor Green
Write-Host "🎉 Same system as VPS - now on your local machine too!" -ForegroundColor Green
Write-Host ""
