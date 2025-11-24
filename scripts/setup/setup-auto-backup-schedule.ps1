#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Schedule automatic daily backups for WMS
    
.DESCRIPTION
    Creates a Windows Task Scheduler task that runs auto-backup-system.ps1 daily
    
.PARAMETER BackupTime
    Time to run backup daily (default: 02:00 AM)
    
.EXAMPLE
    .\setup-auto-backup-schedule.ps1
    .\setup-auto-backup-schedule.ps1 -BackupTime "03:00"
#>

param(
    [string]$BackupTime = "02:00"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    📅 SCHEDULE AUTOMATIC DAILY BACKUPS" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$TaskName = "WMS_Daily_Backup"
$ScriptPath = Join-Path $PSScriptRoot "auto-backup-system.ps1"
$LogPath = Join-Path $PSScriptRoot "backup-logs"

# Create log directory
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

$LogFile = Join-Path $LogPath "backup-scheduler-$(Get-Date -Format 'yyyy-MM').log"

# Check if script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "❌ Error: Backup script not found at $ScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Task Name: $TaskName"
Write-Host "   Script: $ScriptPath"
Write-Host "   Daily at: $BackupTime"
Write-Host "   Log File: $LogFile"
Write-Host ""

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task '$TaskName' already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to replace it? (y/n)"
    
    if ($response -ne 'y') {
        Write-Host "❌ Cancelled" -ForegroundColor Red
        exit 0
    }
    
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "✅ Removed existing task" -ForegroundColor Green
}

# Create scheduled task
try {
    $Action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-ExecutionPolicy Bypass -NoProfile -File `"$ScriptPath`" >> `"$LogFile`" 2>&1"
    
    $Trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime
    
    $Settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable:$false `
        -ExecutionTimeLimit (New-TimeSpan -Hours 2)
    
    $Principal = New-ScheduledTaskPrincipal `
        -UserId $env:USERNAME `
        -LogonType Interactive `
        -RunLevel Highest
    
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Principal $Principal `
        -Description "Automatic daily backup of WMS database and files" | Out-Null
    
    Write-Host ""
    Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Task Details:" -ForegroundColor Cyan
    Get-ScheduledTask -TaskName $TaskName | Format-List TaskName, State, @{Label="Next Run";Expression={(Get-ScheduledTaskInfo $_).NextRunTime}}
    
    Write-Host ""
    Write-Host "🎯 What happens now:" -ForegroundColor Yellow
    Write-Host "   • Backup runs automatically every day at $BackupTime"
    Write-Host "   • Logs are saved to: $LogPath"
    Write-Host "   • Backups are saved to: C:\WMS_BACKUPS\"
    Write-Host "   • Last 7 backups are kept automatically"
    Write-Host ""
    Write-Host "📝 Useful commands:" -ForegroundColor Cyan
    Write-Host "   View task: Get-ScheduledTask -TaskName '$TaskName'"
    Write-Host "   Run now:   Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "   Disable:   Disable-ScheduledTask -TaskName '$TaskName'"
    Write-Host "   Enable:    Enable-ScheduledTask -TaskName '$TaskName'"
    Write-Host "   Remove:    Unregister-ScheduledTask -TaskName '$TaskName'"
    Write-Host ""
    
    # Ask if user wants to run backup now
    $runNow = Read-Host "Do you want to run the first backup now? (y/n)"
    
    if ($runNow -eq 'y') {
        Write-Host ""
        Write-Host "🚀 Running backup now..." -ForegroundColor Cyan
        Start-ScheduledTask -TaskName $TaskName
        Start-Sleep -Seconds 2
        
        Write-Host "✅ Backup task started! Check C:\WMS_BACKUPS\ for results" -ForegroundColor Green
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Failed to create scheduled task: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running this script as Administrator:" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell → Run as Administrator" -ForegroundColor White
    exit 1
}

Write-Host ""
