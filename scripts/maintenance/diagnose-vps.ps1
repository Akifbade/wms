$ErrorActionPreference = "Stop"
$VPS_IP = "148.230.107.155"
$USER = "root"
$KEY_PATH = "$HOME\.ssh\github_actions_wms"

Write-Host " DIAGNOSING VPS HIGH CPU USAGE..." -ForegroundColor Cyan

if (-not (Test-Path $KEY_PATH)) {
    Write-Host " SSH Key not found" -ForegroundColor Red
    exit 1
}

$sshCmd = "ssh -i $KEY_PATH -o StrictHostKeyChecking=no $USER@$VPS_IP"

Write-Host "`n1. CHECKING LOAD AVERAGE..." -ForegroundColor Yellow
Invoke-Expression "$sshCmd uptime"

Write-Host "`n2. CHECKING TOP PROCESSES..." -ForegroundColor Yellow
Invoke-Expression "$sshCmd 'ps -eo pid,cmd,%cpu --sort=-%cpu | head -n 6'"

Write-Host "`n3. CHECKING DOCKER STATS..." -ForegroundColor Yellow
Invoke-Expression "$sshCmd 'docker stats --no-stream'"

Write-Host "`n DONE" -ForegroundColor Green
