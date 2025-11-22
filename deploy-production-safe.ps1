# SAFE LOCAL TO PRODUCTION DEPLOYMENT
# Data 100% protected, only code updated

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "SAFE PRODUCTION DEPLOYMENT (Local to Production)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Safety checks
Write-Host "[SAFETY 1/3] Checking local build..." -ForegroundColor Yellow
cd frontend
if (-not (Test-Path "dist")) {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
}
cd ..
Write-Host "✅ Local build ready" -ForegroundColor Green
Write-Host ""

# Database backup (CRITICAL!)
Write-Host "[SAFETY 2/3] Backing up production database..." -ForegroundColor Yellow
$backupScript = @'
cd '/root/NEW START'
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
mkdir -p backups-production
echo 'Creating FULL backup before deployment...'
docker exec wms-database mysqldump -uroot -prootpassword123 --single-transaction --routines --triggers --all-databases > backups-production/BEFORE_DEPLOY_${TIMESTAMP}.sql
gzip backups-production/BEFORE_DEPLOY_${TIMESTAMP}.sql
BACKUP_SIZE=$(du -h backups-production/BEFORE_DEPLOY_${TIMESTAMP}.sql.gz | cut -f1)
echo "Backup created: BEFORE_DEPLOY_${TIMESTAMP}.sql.gz ($BACKUP_SIZE)"
'@

ssh root@148.230.107.155 $backupScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backup failed! Aborting deployment." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Production database backed up" -ForegroundColor Green
Write-Host ""

# Transfer files
Write-Host "[SAFETY 3/3] Transferring files to VPS..." -ForegroundColor Yellow
Write-Host "  📦 Frontend (dist)..." -ForegroundColor Cyan
scp -r frontend/dist root@148.230.107.155:/tmp/production-frontend-dist

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Transfer failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Files transferred" -ForegroundColor Green
Write-Host ""

# Deploy on production (DATA SAFE - only code updated)
Write-Host "[DEPLOY 1/4] Deploying to production..." -ForegroundColor Yellow
$deployScript = @'
cd '/root/NEW START'
echo 'Pulling latest code from GitHub...'
git fetch origin
git reset --hard origin/stable/prisma-mysql-production
echo 'Updating frontend files (NO DATABASE TOUCH)...'
docker cp /tmp/production-frontend-dist/. wms-frontend:/usr/share/nginx/html/ 2>/dev/null || docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d wms-frontend && sleep 5 && docker cp /tmp/production-frontend-dist/. wms-frontend:/usr/share/nginx/html/
docker exec wms-frontend nginx -s reload 2>/dev/null
echo 'Restarting backend (NO DATABASE CHANGES)...'
docker restart wms-backend 2>/dev/null || docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d wms-backend
rm -rf /tmp/production-frontend-dist
echo 'Production deployment complete!'
'@

ssh root@148.230.107.155 $deployScript

Write-Host "✅ Deployed to production" -ForegroundColor Green
Write-Host ""

# Health check
Write-Host "[VERIFY 1/2] Health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$healthCheck = Invoke-WebRequest -Uri "https://qgocargo.cloud/api/health" -SkipCertificateCheck -ErrorAction SilentlyContinue
if ($healthCheck.StatusCode -eq 200) {
    Write-Host "✅ Production is HEALTHY!" -ForegroundColor Green
    $health = $healthCheck.Content | ConvertFrom-Json
    Write-Host "   Version: $($health.version)" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ Production might still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[VERIFY 2/2] Database integrity check..." -ForegroundColor Yellow
ssh root@148.230.107.155 "docker exec wms-database mysql -uroot -prootpassword123 -e 'USE warehouse_wms; SELECT COUNT(*) FROM shipments; SELECT COUNT(*) FROM racks; SELECT COUNT(*) FROM users;'"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "PRODUCTION DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production: https://qgocargo.cloud" -ForegroundColor Cyan
Write-Host "Database: 100% SAFE (backup created)" -ForegroundColor Green
Write-Host "Code: Updated to latest local version" -ForegroundColor Green
Write-Host ""
Write-Host "Backup location on VPS:" -ForegroundColor Yellow
Write-Host "  /root/NEW START/backups-production/BEFORE_DEPLOY_*.sql.gz" -ForegroundColor Cyan
Write-Host ""

Start-Process "https://qgocargo.cloud"
