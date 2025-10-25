# ONE-CLICK START - EVERYTHING!
# Ye script sab kuch automatically start karega

param(
    [switch]$Production
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   STARTING COMPLETE WMS SYSTEM" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Start Auto-Backup in background
Write-Host "[1/3] Starting Auto-Backup System..." -ForegroundColor Yellow
$backupRunning = Get-Process | Where-Object {$_.CommandLine -like "*auto-backup.ps1*"} | Select-Object -First 1
if (-not $backupRunning) {
    Start-Process powershell -ArgumentList "-NoExit", "-File", "scripts\auto-backup.ps1" -WindowStyle Minimized
    Write-Host "      Auto-Backup: STARTED (commits every 5 min)" -ForegroundColor Green
} else {
    Write-Host "      Auto-Backup: Already running" -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# 2. Start Docker
Write-Host ""
Write-Host "[2/3] Starting Docker Containers..." -ForegroundColor Yellow

if ($Production) {
    docker-compose up -d
} else {
    docker-compose -f docker-compose.dev.yml up -d
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "      Docker: STARTED" -ForegroundColor Green
} else {
    Write-Host "      Docker: ERROR (check Docker Desktop)" -ForegroundColor Red
}

# 3. Wait for containers to be ready
Write-Host ""
Write-Host "[3/3] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if services are running
$backend = docker ps --filter "name=wms-backend" --format "{{.Status}}"
$frontend = docker ps --filter "name=wms-frontend" --format "{{.Status}}"
$database = docker ps --filter "name=wms-database" --format "{{.Status}}"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SYSTEM STATUS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

if ($database -like "*Up*") {
    Write-Host "Database:    RUNNING" -ForegroundColor Green
} else {
    Write-Host "Database:    STOPPED" -ForegroundColor Red
}

if ($backend -like "*Up*") {
    Write-Host "Backend:     RUNNING on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "Backend:     STOPPED" -ForegroundColor Red
}

if ($frontend -like "*Up*") {
    Write-Host "Frontend:    RUNNING on http://localhost" -ForegroundColor Green
} else {
    Write-Host "Frontend:    STOPPED" -ForegroundColor Red
}

Write-Host "Auto-Backup: RUNNING (background)" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Open browser: http://localhost" -ForegroundColor White
Write-Host "2. Login: admin@wms.com / admin123" -ForegroundColor White
Write-Host "3. Auto-backup saves every 5 minutes automatically!" -ForegroundColor White
Write-Host ""
Write-Host "To STOP everything: .\scripts\STOP-EVERYTHING.ps1" -ForegroundColor Cyan
Write-Host ""

# Auto-open browser
Start-Sleep -Seconds 3
Start-Process "http://localhost"
