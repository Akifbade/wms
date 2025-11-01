#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Login Issue Debug" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend direct
Write-Host "[1/5] Testing backend directly..." -ForegroundColor Yellow
try {
    $body = @{
        email = "admin@demo.com"
        password = "demo123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    Write-Host "✅ Backend working: Token received" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend error: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Frontend proxy
Write-Host "[2/5] Testing frontend proxy..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Frontend proxy working" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend proxy error: $_" -ForegroundColor Red
    Write-Host "⚠️ Frontend dev server might not be running" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check if servers are running
Write-Host "[3/5] Checking servers..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
$frontend = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($backend) {
    Write-Host "✅ Backend: Running on port 5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: NOT running" -ForegroundColor Red
}

if ($frontend) {
    Write-Host "✅ Frontend: Running on port 3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: NOT running" -ForegroundColor Red
}
Write-Host ""

# Test 4: Check database user
Write-Host "[4/5] Checking database user..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Videos\NEW START\backend"
$userCheck = npx ts-node -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.user.findUnique({ where: { email: 'admin@demo.com' } }).then(u => console.log(u ? 'USER_EXISTS' : 'USER_NOT_FOUND')).finally(() => prisma.`$disconnect());" 2>&1

if ($userCheck -match "USER_EXISTS") {
    Write-Host "✅ User exists in database" -ForegroundColor Green
} else {
    Write-Host "❌ User NOT found in database" -ForegroundColor Red
    Write-Host "🔧 Run: npx ts-node prisma/seed.ts" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Solution
Write-Host "[5/5] Solution..." -ForegroundColor Yellow
Write-Host ""
Write-Host "If backend is working but login fails in browser:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Hard refresh browser: Ctrl + Shift + R" -ForegroundColor White
Write-Host "2. Clear browser cache completely" -ForegroundColor White
Write-Host "3. Open DevTools (F12) -> Network tab" -ForegroundColor White
Write-Host "4. Try login and check the /api/auth/login request" -ForegroundColor White
Write-Host "5. Look at Request Payload - should have email & password" -ForegroundColor White
Write-Host ""
Write-Host "Credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@demo.com" -ForegroundColor White
Write-Host "  Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Debug Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
