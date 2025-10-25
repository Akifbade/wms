# Fleet System Diagnostic

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Fleet Management System Diagnostic" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check Backend Server
Write-Host "Checking Backend Server (Port 5000)..." -ForegroundColor Yellow
$backend = netstat -ano | Select-String ":5000.*LISTENING"
if ($backend) {
    Write-Host "[OK] Backend is running on port 5000" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend is NOT running on port 5000" -ForegroundColor Red
    Write-Host "Fix: Run 'cd backend; npm run dev'" -ForegroundColor Yellow
}

Write-Host ""

# Check Frontend Server
Write-Host "Checking Frontend Server (Port 3000)..." -ForegroundColor Yellow
$frontend = netstat -ano | Select-String ":3000.*LISTENING"
if ($frontend) {
    Write-Host "[OK] Frontend is running on port 3000" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Frontend is NOT running on port 3000" -ForegroundColor Red
    Write-Host "Fix: Run 'cd frontend; npm run dev'" -ForegroundColor Yellow
}

Write-Host ""

# Check Database File
Write-Host "Checking Database..." -ForegroundColor Yellow
$dbPath = "backend\prisma\dev.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length / 1KB
    Write-Host "[OK] Database exists ($($dbSize.ToString('N2')) KB)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Database file not found" -ForegroundColor Red
    Write-Host "Fix: Run 'cd backend; npx prisma migrate dev'" -ForegroundColor Yellow
}

Write-Host ""

# Check Important Files
Write-Host "Checking Key Files..." -ForegroundColor Yellow

$files = @(
    @{Path="backend\src\modules\fleet\routes.ts"; Name="Fleet Routes"},
    @{Path="frontend\src\pages\Fleet\Admin\LiveTracking.tsx"; Name="Live Tracking"},
    @{Path="frontend\src\pages\Fleet\Driver\DriverApp.tsx"; Name="Driver App"},
    @{Path="frontend\public\manifest.json"; Name="PWA Manifest"},
    @{Path="frontend\public\icons\icon-144.svg"; Name="PWA Icon"}
)

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        Write-Host "[OK] $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $($file.Name)" -ForegroundColor Red
    }
}

Write-Host ""

# Test Backend API (without auth - just check if server responds)
Write-Host "Testing Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Backend API responds" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*404*") {
        Write-Host "[OK] Backend API responds (404 expected for root)" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Backend API not responding: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test Frontend
Write-Host "Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "[OK] Frontend responds" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Frontend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure both servers are running (green checkmarks above)" -ForegroundColor White
Write-Host "2. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host "3. Login with admin credentials" -ForegroundColor White
Write-Host "4. Go to Fleet menu to test features" -ForegroundColor White
Write-Host ""
Write-Host "If you see errors above, follow the 'Fix:' instructions" -ForegroundColor Yellow
Write-Host ""
Write-Host "For detailed testing guide, see: FLEET-TESTING-GUIDE.md" -ForegroundColor Cyan
Write-Host ""
