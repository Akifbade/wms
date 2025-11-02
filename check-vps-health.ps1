# VPS Health Check Script
Write-Host "🔍 Checking VPS Production Status..." -ForegroundColor Cyan

# Replace with your VPS IP/domain
$VPS_URL = "http://YOUR_VPS_IP_OR_DOMAIN"

Write-Host "`n1️⃣ Checking Frontend..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "$VPS_URL" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Frontend Status: $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2️⃣ Checking Backend Health..." -ForegroundColor Yellow
try {
    $backend = Invoke-WebRequest -Uri "$VPS_URL/api/health" -TimeoutSec 5 -UseBasicParsing
    $health = $backend.Content | ConvertFrom-Json
    Write-Host "✅ Backend Status: $($backend.StatusCode)" -ForegroundColor Green
    Write-Host "   Version: $($health.version)" -ForegroundColor Cyan
    Write-Host "   Environment: $($health.environment)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Backend Error (502): $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   This means backend is DOWN or not responding!" -ForegroundColor Red
}

Write-Host "`n3️⃣ Checking API Racks Endpoint..." -ForegroundColor Yellow
try {
    $racks = Invoke-WebRequest -Uri "$VPS_URL/api/racks" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Racks API Status: $($racks.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Racks API Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📝 Common 502 Causes:" -ForegroundColor Yellow
Write-Host "   1. Backend Docker container is stopped"
Write-Host "   2. Backend crashed due to TypeScript errors"
Write-Host "   3. Database connection failed"
Write-Host "   4. Port 5000 not accessible"
Write-Host "   5. Nginx proxy configuration issue"

Write-Host "`n💡 SSH into VPS and run:" -ForegroundColor Cyan
Write-Host "   docker ps -a" -ForegroundColor White
Write-Host "   docker logs wms-backend --tail 100" -ForegroundColor White
Write-Host "   docker-compose restart wms-backend" -ForegroundColor White
