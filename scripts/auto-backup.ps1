# AUTO BACKUP SCRIPT
# Ye script har 5 minute me automatic git commit karega

param(
    [switch]$Stop
)

$projectPath = "c:\Users\USER\Videos\NEW START"
$logFile = "$projectPath\auto-backup.log"

if ($Stop) {
    Get-Process | Where-Object {$_.ProcessName -eq "powershell" -and $_.CommandLine -like "*auto-backup.ps1*"} | Stop-Process -Force
    Write-Host "Auto-backup stopped!" -ForegroundColor Green
    exit
}

function Write-Log {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $message" | Out-File -FilePath $logFile -Append
    Write-Host $message -ForegroundColor Cyan
}

function Auto-Commit {
    cd $projectPath
    
    # Check for changes
    $status = git status --porcelain
    
    if ($status) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        git add -A
        git commit -m "AUTO-BACKUP: $timestamp" 2>&1 | Out-Null
        
        $commitHash = git rev-parse --short HEAD
        Write-Log "BACKUP CREATED: Commit $commitHash"
        
        # Optional: Push to GitHub
        # git push origin master 2>&1 | Out-Null
    } else {
        Write-Log "No changes detected, skipping backup"
    }
}

Write-Log "=== AUTO-BACKUP STARTED ==="
Write-Host ""
Write-Host "AUTO-BACKUP RUNNING..." -ForegroundColor Green
Write-Host "- Backup every 5 minutes" -ForegroundColor Yellow
Write-Host "- Log file: $logFile" -ForegroundColor Yellow
Write-Host "- To stop: .\scripts\auto-backup.ps1 -Stop" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    Auto-Commit
    Start-Sleep -Seconds 300  # 5 minutes
}
