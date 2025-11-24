# Production Backend Debug Script
# Automatically checks common issues

Write-Host "🔍 Production Backend Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER = "148.230.107.155"
$USER = "root"
$PROD_URL = "http://qgocargo.cloud"

Write-Host "📡 Connecting to production server..." -ForegroundColor Yellow

# Test 1: Check if backend is reachable
Write-Host ""
Write-Host "Test 1: Backend Health Check" -ForegroundColor Green
Write-Host "----------------------------"
try {
    $response = Invoke-WebRequest -Uri "$PROD_URL/api/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is responding" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend is NOT responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 This usually means:" -ForegroundColor Yellow
    Write-Host "   1. Backend container is down" -ForegroundColor Yellow
    Write-Host "   2. Nginx is not proxying correctly" -ForegroundColor Yellow
    Write-Host "   3. Port 5000 is not accessible" -ForegroundColor Yellow
}

# Test 2: Check specific failing endpoint
Write-Host ""
Write-Host "Test 2: Shipments API Endpoint" -ForegroundColor Green
Write-Host "------------------------------"
try {
    $response = Invoke-WebRequest -Uri "$PROD_URL/api/shipments" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Shipments endpoint is working" -ForegroundColor Green
    Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Shipments endpoint failed" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: SSH and check container status
Write-Host ""
Write-Host "Test 3: Docker Container Status" -ForegroundColor Green
Write-Host "-------------------------------"
Write-Host "Checking via SSH..." -ForegroundColor Gray

$sshCheck = @"
echo '=== Docker Containers ==='
docker ps -a --filter 'name=wms' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ''
echo '=== Backend Container Details ==='
docker inspect wms-backend --format='{{.State.Status}}: {{.State.Health.Status}}' 2>&1
echo ''
echo '=== Backend Last 10 Log Lines ==='
docker logs --tail 10 wms-backend 2>&1
echo ''
echo '=== Backend Environment Check ==='
docker exec wms-backend printenv | grep -E 'DB_|NODE_ENV|PORT' 2>&1
"@

Write-Host ""
Write-Host "📋 SSH Command to run on server:" -ForegroundColor Cyan
Write-Host $sshCheck -ForegroundColor Gray

# Test 4: CORS Check
Write-Host ""
Write-Host "Test 4: CORS Configuration" -ForegroundColor Green
Write-Host "-------------------------"
try {
    $headers = @{
        "Origin" = $PROD_URL
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    $response = Invoke-WebRequest -Uri "$PROD_URL/api/health" -Method OPTIONS -Headers $headers -TimeoutSec 5 -ErrorAction Stop
    
    $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsHeader) {
        Write-Host "✅ CORS is configured" -ForegroundColor Green
        Write-Host "   Allow-Origin: $corsHeader" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  CORS headers not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ CORS check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary and recommendations
Write-Host ""
Write-Host "📊 Diagnostic Summary" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. SSH into server: ssh $USER@$SERVER" -ForegroundColor White
Write-Host "2. Check backend logs: docker logs --tail 100 wms-backend" -ForegroundColor White
Write-Host "3. Check database connection: docker exec wms-backend nc -zv wms-database 3306" -ForegroundColor White
Write-Host "4. Restart backend: docker restart wms-backend" -ForegroundColor White
Write-Host ""
Write-Host "For detailed troubleshooting, see: PRODUCTION-TROUBLESHOOTING.md" -ForegroundColor Cyan
