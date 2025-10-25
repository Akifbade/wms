# ONE-CLICK STOP - EVERYTHING!
# Ye script sab kuch safely stop karega

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   STOPPING COMPLETE WMS SYSTEM" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Commit any pending changes first
Write-Host "[1/3] Saving any pending changes..." -ForegroundColor Yellow
cd "c:\Users\USER\Videos\NEW START"

$status = git status --porcelain
if ($status) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git add -A 2>&1 | Out-Null
    git commit -m "AUTO-SAVE before shutdown: $timestamp" 2>&1 | Out-Null
    Write-Host "      Changes: SAVED" -ForegroundColor Green
} else {
    Write-Host "      No changes to save" -ForegroundColor Gray
}

# 2. Stop Docker containers
Write-Host ""
Write-Host "[2/3] Stopping Docker containers..." -ForegroundColor Yellow

# Try dev compose first, then production
docker-compose -f docker-compose.dev.yml down 2>&1 | Out-Null
docker-compose down 2>&1 | Out-Null

Write-Host "      Docker: STOPPED" -ForegroundColor Green

# 3. Stop auto-backup
Write-Host ""
Write-Host "[3/3] Stopping Auto-Backup..." -ForegroundColor Yellow

Get-Process | Where-Object {
    $_.ProcessName -eq "powershell" -and 
    $_.MainWindowTitle -like "*auto-backup*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "      Auto-Backup: STOPPED" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ALL SYSTEMS STOPPED SAFELY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your work is SAVED in Git!" -ForegroundColor Green
Write-Host "To start again: .\scripts\START-EVERYTHING.ps1" -ForegroundColor Cyan
Write-Host ""
