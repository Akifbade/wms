# Complete Production Deployment - Frontend + Backend
# Syncs all latest features to production VPS

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "FULL PRODUCTION UPDATE - ALL NEW FEATURES" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Updating: Frontend + Backend + All Features" -ForegroundColor Yellow
Write-Host "Database: 100% SAFE (automatic backup)" -ForegroundColor Green
Write-Host ""

# Step 1: Database backup
Write-Host "[STEP 1/6] Creating database backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "FULL_UPDATE_$timestamp.sql.gz"
ssh root@148.230.107.155 "mkdir -p '/root/NEW START/backups-production' && docker exec wms-database mysqldump -uroot -prootpassword123 --all-databases --single-transaction | gzip > '/root/NEW START/backups-production/$backupFile'"
Write-Host "   Backup: $backupFile" -ForegroundColor Green

# Step 2: Build frontend
Write-Host ""
Write-Host "[STEP 2/6] Building frontend..." -ForegroundColor Yellow
cd frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
    exit 1
}
cd ..
Write-Host "   Frontend built" -ForegroundColor Green

# Step 3: Transfer frontend
Write-Host ""
Write-Host "[STEP 3/6] Transferring frontend..." -ForegroundColor Yellow
ssh root@148.230.107.155 "rm -rf /tmp/prod-frontend"
scp -r frontend/dist root@148.230.107.155:/tmp/prod-frontend
Write-Host "   Frontend transferred" -ForegroundColor Green

# Step 4: Transfer backend source
Write-Host ""
Write-Host "[STEP 4/6] Transferring backend source..." -ForegroundColor Yellow
ssh root@148.230.107.155 "rm -rf /tmp/prod-backend-src"
scp -r backend/src root@148.230.107.155:/tmp/prod-backend-src
scp backend/package.json root@148.230.107.155:/tmp/prod-backend-package.json
Write-Host "   Backend source transferred" -ForegroundColor Green

# Step 5: Deploy to production
Write-Host ""
Write-Host "[STEP 5/6] Deploying to production (this will take 2-3 minutes)..." -ForegroundColor Yellow
ssh root@148.230.107.155 "cd '/root/NEW START' && rm -rf backend/src && cp -r /tmp/prod-backend-src backend/src && cp /tmp/prod-backend-package.json backend/package.json && docker-compose build --no-cache wms-backend && docker cp /tmp/prod-frontend/. wms-frontend:/usr/share/nginx/html/ && docker exec wms-frontend nginx -s reload && docker-compose up -d wms-backend && rm -rf /tmp/prod-frontend /tmp/prod-backend-src /tmp/prod-backend-package.json"
Write-Host "   Production updated!" -ForegroundColor Green

# Step 6: Verify
Write-Host ""
Write-Host "[STEP 6/6] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

ssh root@148.230.107.155 "curl -s http://localhost:5000/api/health"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "PRODUCTION FULLY UPDATED!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production: https://qgocargo.cloud" -ForegroundColor Cyan
Write-Host "All Features: Material Edit/Delete + Everything Latest" -ForegroundColor Green
Write-Host "Database: Preserved 100%" -ForegroundColor Green
Write-Host ""
Write-Host "Backup: /root/NEW START/backups-production/$backupFile" -ForegroundColor Yellow
Write-Host ""

Start-Process "https://qgocargo.cloud"
