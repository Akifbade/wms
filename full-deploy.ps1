# Full VPS Update Script
$vpsHost = "root@72.60.215.188"
$vpsPath = "/root/NEW START"
$localPath = "c:\Users\USER\Videos\NEW START"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "UPLOADING ALL CHANGES TO VPS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Upload Backend Files
Write-Host "`n[1/7] Uploading backend routes..." -ForegroundColor Yellow
scp -r "$localPath\backend\src\routes\*" "${vpsHost}:$vpsPath/backend/src/routes/"

Write-Host "[2/7] Uploading Prisma schema..." -ForegroundColor Yellow
scp "$localPath\backend\prisma\schema.prisma" "${vpsHost}:$vpsPath/backend/prisma/"

Write-Host "[3/7] Uploading Prisma migrations..." -ForegroundColor Yellow
scp -r "$localPath\backend\prisma\migrations\*" "${vpsHost}:$vpsPath/backend/prisma/migrations/"

# Upload Frontend Files
Write-Host "[4/7] Uploading frontend components..." -ForegroundColor Yellow
scp -r "$localPath\frontend\src\components\*" "${vpsHost}:$vpsPath/frontend/src/components/"

Write-Host "[5/7] Uploading frontend pages..." -ForegroundColor Yellow
scp -r "$localPath\frontend\src\pages\*" "${vpsHost}:$vpsPath/frontend/src/pages/"

Write-Host "[6/7] Uploading public files..." -ForegroundColor Yellow
scp "$localPath\frontend\public\release-receipt.html" "${vpsHost}:$vpsPath/frontend/public/"

# Restart Services
Write-Host "[7/7] Restarting services on VPS..." -ForegroundColor Yellow
ssh $vpsHost @"
cd '$vpsPath/backend'
npx prisma generate
npx prisma migrate deploy
pm2 restart all
cd '$vpsPath/frontend'
npm run build
pm2 restart all
pm2 status
"@

Write-Host "`n=================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
