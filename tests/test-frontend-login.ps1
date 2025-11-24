# Simple Login Test Script
Write-Host "`n=== Testing Frontend Login Issue ===" -ForegroundColor Cyan

# Test 1: Backend Direct
Write-Host "`n1. Testing Backend Direct API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@demo.com","password":"demo123"}'
    Write-Host "   SUCCESS - Backend works!" -ForegroundColor Green
    Write-Host "   Token: $($response.token.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - Backend not working" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Test 2: Check if servers running
Write-Host "`n2. Checking if servers are running..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$frontend = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($backend) {
    Write-Host "   Backend (5000): Running" -ForegroundColor Green
} else {
    Write-Host "   Backend (5000): NOT RUNNING" -ForegroundColor Red
}

if ($frontend) {
    Write-Host "   Frontend (3000): Running" -ForegroundColor Green
} else {
    Write-Host "   Frontend (3000): NOT RUNNING" -ForegroundColor Red
}

# Test 3: Check Vite config
Write-Host "`n3. Checking Vite proxy config..." -ForegroundColor Yellow
$viteConfig = Get-Content "frontend\vite.config.ts" -Raw
if ($viteConfig -match "proxy") {
    Write-Host "   Proxy configured" -ForegroundColor Green
    Write-Host "   Config: $($viteConfig -replace '(?s).*proxy:\s*{([^}]+)}.*', '$1')" -ForegroundColor Gray
} else {
    Write-Host "   NO PROXY CONFIGURED!" -ForegroundColor Red
}

# Instructions
Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "Backend works directly, so issue is in frontend." -ForegroundColor White
Write-Host "`nPlease do these steps:" -ForegroundColor Yellow
Write-Host "1. Open browser and go to: http://localhost:3000" -ForegroundColor White
Write-Host "2. Press F12 to open DevTools" -ForegroundColor White
Write-Host "3. Go to Network tab" -ForegroundColor White
Write-Host "4. Try to login with:" -ForegroundColor White
Write-Host "   Email: admin@demo.com" -ForegroundColor Gray
Write-Host "   Password: demo123" -ForegroundColor Gray
Write-Host "5. Click on the /login request in Network tab" -ForegroundColor White
Write-Host "6. Check what the Request Payload shows" -ForegroundColor White
Write-Host "`nOR try this quick fix:" -ForegroundColor Yellow
Write-Host "1. Open browser console (F12)" -ForegroundColor White
Write-Host "2. Type: localStorage.clear()" -ForegroundColor White
Write-Host "3. Press Enter and refresh page" -ForegroundColor White
