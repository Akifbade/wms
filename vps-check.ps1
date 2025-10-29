# VPS Quick Check Script
Write-Host "=== CHECKING VPS STATUS ===" -ForegroundColor Cyan

$vpsIP = "148.230.107.155"
$vpsUser = "root"

# Test connectivity
Write-Host "`nTesting connectivity..." -ForegroundColor Yellow
$portTest = Test-NetConnection -ComputerName $vpsIP -Port 22 -WarningAction SilentlyContinue

if ($portTest.TcpTestSucceeded) {
    Write-Host "SSH is accessible" -ForegroundColor Green
} else {
    Write-Host "Cannot connect to VPS!" -ForegroundColor Red
    exit 1
}

# Check Docker status
Write-Host "`nChecking Docker containers (password required)..." -ForegroundColor Yellow
ssh ${vpsUser}@${vpsIP} "cd '/root/NEW START' && docker ps -a"
