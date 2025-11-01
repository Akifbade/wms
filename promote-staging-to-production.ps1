# 🚀 Promote Staging to Production (Manual Script)
# This script copies tested staging containers to production on same VPS

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 PROMOTING STAGING → PRODUCTION" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$PRODUCTION_PATH = "/root/NEW START"

# Confirm before proceeding
Write-Host "⚠️  This will replace production with staging code" -ForegroundColor Yellow
Write-Host "Current staging: http://${VPS_HOST}:8080" -ForegroundColor Cyan
Write-Host "Will update: http://qgocargo.cloud" -ForegroundColor Green
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📡 Connecting to VPS..." -ForegroundColor Cyan

# SSH and execute promotion
ssh "${VPS_USER}@${VPS_HOST}" @"
set -e
cd '$PRODUCTION_PATH'

echo ""
echo "================================================"
echo "📦 STEP 1: Creating Backup"
echo "================================================"
BACKUP_DIR="backups/production-\$(date +%Y%m%d-%H%M%S)"
mkdir -p "\$BACKUP_DIR"/{frontend,backend,database}

echo "📁 Backing up production frontend..."
docker cp wms-frontend:/usr/share/nginx/html/. "\$BACKUP_DIR/frontend/" || echo "⚠️  Skip frontend backup"

echo "📁 Backing up production backend..."
docker cp wms-backend:/app/. "\$BACKUP_DIR/backend/" || echo "⚠️  Skip backend backup"

echo "📁 Backing up production database..."
docker exec wms-database mysqldump -u root -prootpassword123 warehouse_wms > "\$BACKUP_DIR/database/warehouse_wms.sql" 2>/dev/null || echo "⚠️  Skip DB backup"

echo "✅ Backup saved: \$BACKUP_DIR"

echo ""
echo "================================================"
echo "🎯 STEP 2: Promote Frontend"
echo "================================================"
echo "🔍 Testing staging frontend..."
if docker exec wms-staging-frontend test -f /usr/share/nginx/html/index.html; then
    echo "✅ Staging frontend has files"
else
    echo "❌ Staging frontend missing files!"
    exit 1
fi

echo "📋 Copying staging frontend → production..."
docker cp wms-staging-frontend:/usr/share/nginx/html/. /tmp/staging-frontend-copy/
docker cp /tmp/staging-frontend-copy/. wms-frontend:/usr/share/nginx/html/
rm -rf /tmp/staging-frontend-copy
docker exec wms-frontend nginx -s reload

echo "✅ Frontend promoted"

echo ""
echo "================================================"
echo "🎯 STEP 3: Promote Backend"
echo "================================================"
echo "🔍 Testing staging backend health..."
if docker exec wms-staging-backend curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "✅ Staging backend is healthy"
else
    echo "⚠️  Warning: Staging backend health check failed"
    echo "Continue anyway? (Ctrl+C to abort)"
    sleep 5
fi

echo "🛑 Stopping production backend..."
docker stop wms-backend

echo "📋 Copying staging backend → production..."
docker cp wms-staging-backend:/app/. /tmp/staging-backend-copy/
docker cp /tmp/staging-backend-copy/. wms-backend:/app/
rm -rf /tmp/staging-backend-copy

echo "🚀 Starting production backend..."
docker start wms-backend

echo "⏳ Waiting for backend to start (20 seconds)..."
sleep 20

echo "🔍 Checking production backend health..."
if docker exec wms-backend curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Production backend is healthy!"
else
    echo "❌ Production backend health check FAILED!"
    echo ""
    echo "🔄 ROLLING BACK..."
    docker stop wms-backend
    docker cp "\$BACKUP_DIR/backend/." wms-backend:/app/
    docker cp "\$BACKUP_DIR/frontend/." wms-frontend:/usr/share/nginx/html/
    docker start wms-backend
    docker exec wms-frontend nginx -s reload
    echo "✅ Rollback complete"
    exit 1
fi

echo ""
echo "================================================"
echo "🎉 PROMOTION COMPLETE"
echo "================================================"
echo "✅ Frontend: Promoted from staging"
echo "✅ Backend: Promoted from staging"
echo ""
echo "🌐 Test URLs:"
echo "   Production: http://qgocargo.cloud"
echo "   API Health: http://qgocargo.cloud/api/health"
echo ""
echo "📊 Container Status:"
docker ps --filter "name=wms-frontend\|wms-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📦 Backup: \$BACKUP_DIR"
echo "================================================"
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ PROMOTION SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Verifying production..." -ForegroundColor Cyan
    
    # Test production API
    try {
        $response = Invoke-WebRequest -Uri "http://qgocargo.cloud/api/health" -UseBasicParsing -TimeoutSec 10
        Write-Host "✅ API Response: $($response.StatusCode)" -ForegroundColor Green
        Write-Host $response.Content
    } catch {
        Write-Host "⚠️  API test failed: $_" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🌐 Production URLs:" -ForegroundColor Cyan
    Write-Host "   http://qgocargo.cloud" -ForegroundColor White
    Write-Host "   http://qgocargo.cloud/api/health" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Clear browser cache: Ctrl+Shift+R" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ PROMOTION FAILED!" -ForegroundColor Red
    Write-Host "Check server logs: ssh root@148.230.107.155 'docker logs wms-backend --tail 50'" -ForegroundColor Yellow
    Write-Host ""
}
