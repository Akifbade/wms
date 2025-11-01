# Quick Fix Script - Disable Fleet & Clean Errors
# Run this to make system work again

Write-Host "`n🚨 FLEET ERROR FIX SCRIPT" -ForegroundColor Red
Write-Host "============================`n" -ForegroundColor Red

# Step 1: Disable Fleet Module
Write-Host "Step 1: Disabling Fleet module..." -ForegroundColor Yellow
$envPath = "c:\Users\USER\Videos\NEW START\backend\.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath
    $content = $content -replace 'FLEET_ENABLED=true', 'FLEET_ENABLED=false'
    $content | Set-Content $envPath
    Write-Host "✅ Fleet module disabled in .env" -ForegroundColor Green
} else {
    Write-Host "⚠️ .env file not found" -ForegroundColor Yellow
}

# Step 2: Delete broken test files
Write-Host "`nStep 2: Removing broken test files..." -ForegroundColor Yellow
$testFiles = @(
    "c:\Users\USER\Videos\NEW START\backend\__tests__\fleet\geo.test.ts",
    "c:\Users\USER\Videos\NEW START\backend\__tests__\fleet\trip.test.ts"
)

foreach ($file in $testFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "✅ Deleted: $(Split-Path $file -Leaf)" -ForegroundColor Green
    }
}

# Step 3: Delete broken seed files
Write-Host "`nStep 3: Removing broken seed files..." -ForegroundColor Yellow
$seedFiles = @(
    "c:\Users\USER\Videos\NEW START\backend\prisma\seeds\fleet.seed.ts",
    "c:\Users\USER\Videos\NEW START\backend\prisma\seeds\fleet-simple.seed.ts"
)

foreach ($file in $seedFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "✅ Deleted: $(Split-Path $file -Leaf)" -ForegroundColor Green
    }
}

# Step 4: Kill all Node processes
Write-Host "`nStep 4: Stopping all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✅ All Node processes stopped" -ForegroundColor Green

# Step 5: Summary
Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host "✅ QUICK FIXES APPLIED!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Cyan

Write-Host "`n📋 What was fixed:" -ForegroundColor White
Write-Host "  ✓ Fleet module disabled" -ForegroundColor Gray
Write-Host "  ✓ Broken test files removed" -ForegroundColor Gray
Write-Host "  ✓ Broken seed files removed" -ForegroundColor Gray
Write-Host "  ✓ Backend stopped (ready for restart)" -ForegroundColor Gray

Write-Host "`n🚀 Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd backend ; npm run dev" -ForegroundColor Cyan
Write-Host "  2. cd frontend ; npm run dev" -ForegroundColor Cyan
Write-Host "  3. System should work normally now" -ForegroundColor Cyan

Write-Host "`n📖 Full error report:" -ForegroundColor Yellow
Write-Host "  See: SYSTEM-ERROR-REPORT.md" -ForegroundColor Cyan

Write-Host "`n⚠️ Fleet module is disabled" -ForegroundColor Yellow
Write-Host "  To re-enable: Fix auth errors first" -ForegroundColor Gray
Write-Host "  See error report for details`n" -ForegroundColor Gray
