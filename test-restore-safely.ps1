# SAFE RESTORE TEST SCRIPT
# This restores the backup to a DIFFERENT location so your current system is safe
# ================================================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  WMS SAFE RESTORE TEST" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  This will restore to C:\WMS_TEST" -ForegroundColor Yellow
Write-Host "⚠️  Your current system at $PWD will NOT be touched" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Continue? (yes/no)"
if ($continue -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Red
    exit
}

$backupZip = Get-ChildItem "C:\WMS_FULL_BACKUPS\WMS_FULL_SYSTEM_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $backupZip) {
    Write-Host "❌ No backup found in C:\WMS_FULL_BACKUPS\" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "📦 Using backup: $($backupZip.Name)" -ForegroundColor Cyan
Write-Host ""

$testLocation = "C:\WMS_TEST"

# Clean up old test if exists
if (Test-Path $testLocation) {
    Write-Host "🧹 Cleaning old test location..." -ForegroundColor Yellow
    Remove-Item $testLocation -Recurse -Force
}

# Extract backup
Write-Host "📂 Extracting backup to: $testLocation" -ForegroundColor Cyan
Expand-Archive -Path $backupZip.FullName -DestinationPath $testLocation -Force
Write-Host "   ✅ Extracted" -ForegroundColor Green

# Show what was extracted
Write-Host ""
Write-Host "📋 Extracted contents:" -ForegroundColor Yellow
Get-ChildItem $testLocation | ForEach-Object {
    if ($_.PSIsContainer) {
        Write-Host "   📁 $($_.Name)" -ForegroundColor Cyan
    } else {
        Write-Host "   📄 $($_.Name)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  ✅ SAFE RESTORE TEST COMPLETE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Test location: $testLocation" -ForegroundColor Cyan
Write-Host "📄 Check README.txt for restore instructions" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  To run this test system:" -ForegroundColor Yellow
Write-Host "   1. Stop your current containers: docker-compose down" -ForegroundColor White
Write-Host "   2. cd $testLocation" -ForegroundColor White
Write-Host "   3. docker-compose up -d --build" -ForegroundColor White
Write-Host "   4. Import database (see README.txt)" -ForegroundColor White
Write-Host "   5. Access at http://localhost" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  To go back to your current system:" -ForegroundColor Yellow
Write-Host "   1. docker-compose down (in test location)" -ForegroundColor White
Write-Host "   2. cd '$PWD'" -ForegroundColor White
Write-Host "   3. docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "💡 Your current system files are safe at:" -ForegroundColor Green
Write-Host "   $PWD" -ForegroundColor Cyan
Write-Host ""
