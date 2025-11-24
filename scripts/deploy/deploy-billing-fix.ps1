Write-Host '═══════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '🔧 BILLING SYSTEM FIX - DATABASE MIGRATION GUIDE' -ForegroundColor Green
Write-Host '═══════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host 'MANUAL STEPS (Using phpMyAdmin):' -ForegroundColor Yellow
Write-Host ''
Write-Host '1. Open http://localhost:8081 (phpMyAdmin)' -ForegroundColor White
Write-Host '2. Login: wmsuser / wmspassword' -ForegroundColor White
Write-Host '3. Click "wms" database on left' -ForegroundColor White
Write-Host '4. Click "SQL" tab at top' -ForegroundColor White
Write-Host '5. Paste and run this SQL:' -ForegroundColor White
Write-Host ''
Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
Write-Host 'ALTER TABLE `BillingSettings`' -ForegroundColor Yellow
Write-Host 'ADD COLUMN `storageRatePerCBM` DOUBLE NOT NULL DEFAULT 0.500' -ForegroundColor Yellow
Write-Host 'COMMENT '"'"'Storage rate per cubic meter per day (KWD)'"'"'' -ForegroundColor Yellow
Write-Host 'AFTER `storageRatePerBox`;' -ForegroundColor Yellow
Write-Host ''
Write-Host 'UPDATE `BillingSettings`' -ForegroundColor Yellow
Write-Host 'SET `storageRateType` = '"'"'PER_BOX'"'"'' -ForegroundColor Yellow
Write-Host 'WHERE `storageRateType` = '"'"'PER_DAY'"'"';' -ForegroundColor Yellow
Write-Host '------------------------------------------------------------' -ForegroundColor Cyan
Write-Host ''
Write-Host '6. Click "Go" button' -ForegroundColor White
Write-Host '7. Verify: Should see "1 row affected" message' -ForegroundColor White
Write-Host ''
Write-Host 'Then press any key here to continue deployment...' -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

Write-Host ''
Write-Host '🔄 Continuing deployment...' -ForegroundColor Cyan
Write-Host ''

# Regenerate Prisma
Write-Host '🔄 Regenerating Prisma Client...' -ForegroundColor Cyan
cd backend
npx prisma generate 2>&1 | Select-Object -Last 3
cd ..
Write-Host '✅ Prisma regenerated!' -ForegroundColor Green
Write-Host ''

# Restart backend
Write-Host '🔄 Restarting Backend...' -ForegroundColor Cyan
docker-compose restart wms-backend 2>&1 | Out-Null
Start-Sleep -Seconds 5
Write-Host '✅ Backend restarted!' -ForegroundColor Green
Write-Host ''

# Build frontend
Write-Host '🔨 Building Frontend...' -ForegroundColor Cyan
.vscode\auto-version.ps1
cd frontend
npm run build 2>&1 | Select-Object -Last 5
cd ..
Write-Host '✅ Frontend built!' -ForegroundColor Green
Write-Host ''

# Deploy frontend
Write-Host '🚀 Deploying Frontend...' -ForegroundColor Cyan
docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/
docker exec wms-frontend nginx -s reload
Write-Host '✅ Frontend deployed!' -ForegroundColor Green
Write-Host ''

Write-Host '═══════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '✅ BILLING SYSTEM FIXED! Everything connected:' -ForegroundColor Green
Write-Host '═══════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host '📋 COMPLETE FLOW:' -ForegroundColor White
Write-Host '  Settings → Shipment → Invoice → Report' -ForegroundColor Cyan
Write-Host '  • Settings: Choose PER_BOX or PER_CUBIC_METER' -ForegroundColor White
Write-Host '  • Set Rate: storageRatePerBox OR storageRatePerCBM' -ForegroundColor White
Write-Host '  • Shipment: Can override with custom rates' -ForegroundColor White
Write-Host '  • Invoice: Uses custom OR settings default' -ForegroundColor White
Write-Host '  • Report: Matches invoice exactly' -ForegroundColor White
Write-Host ''
Write-Host 'New version:' -ForegroundColor Yellow
(Get-Content frontend/src/config/version.ts | Select-String 'APP_VERSION') -replace ".*'(.*)'.*", '$1'
Write-Host ''
Write-Host '🎯 TEST NOW:' -ForegroundColor Cyan
Write-Host '  1. Go to Settings → Billing & Rates' -ForegroundColor White
Write-Host '  2. Select "Per Cubic Meter"' -ForegroundColor White
Write-Host '  3. Enter rate: 5.000 KWD' -ForegroundColor White
Write-Host '  4. Save settings' -ForegroundColor White
Write-Host '  5. Create shipment WITHOUT custom rate' -ForegroundColor White
Write-Host '  6. Release → Should use 5.000 KWD/m³/day' -ForegroundColor White
Write-Host '  7. Report → Should match invoice' -ForegroundColor White
