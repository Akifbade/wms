# Fix Staging VPS - Clear Space and Restart Services
# This script connects via SSH to clean up disk space and restart staging

Write-Host "Fixing Staging VPS (148.230.107.155:8080)" -ForegroundColor Cyan
Write-Host ""

$VPS_IP = "148.230.107.155"
$VPS_USER = "root"

Write-Host "Step 1: Check disk space..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "df -h"

Write-Host ""
Write-Host "Step 2: Clean Docker system (remove unused images, containers, volumes)..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "docker system prune -af --volumes"

Write-Host ""
Write-Host "Step 3: Check disk space after cleanup..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "df -h"

Write-Host ""
Write-Host "Step 4: Check Docker containers status..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "docker ps -a"

Write-Host ""
Write-Host "Step 5: Restart staging containers..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd /root/wms-staging; docker-compose down; docker-compose up -d"

Write-Host ""
Write-Host "Step 6: Wait 10 seconds for containers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Step 7: Check container logs..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "docker logs wms-staging-backend --tail 20"

Write-Host ""
Write-Host "Step 8: Test staging health endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$response = Invoke-WebRequest -Uri 'http://148.230.107.155:8080/api/health' -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    $data = $response.Content | ConvertFrom-Json
    Write-Host "STAGING IS HEALTHY!" -ForegroundColor Green
    Write-Host "   Version: $($data.version)" -ForegroundColor Green
    Write-Host "   Environment: $($data.environment)" -ForegroundColor Green
} else {
    Write-Host "Staging still not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "Staging URL: http://148.230.107.155:8080" -ForegroundColor Cyan
