# 🔧 Fix Production Migration Issues
# Cleans failed migrations from production database

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔧 FIXING PRODUCTION MIGRATIONS" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

$VPS_HOST = "148.230.107.155"

Write-Host ""
Write-Host "📡 Connecting to production server..." -ForegroundColor Cyan

ssh root@$VPS_HOST @'
echo "🗄️  Cleaning failed migrations from production database..."
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e "DELETE FROM _prisma_migrations WHERE finished_at IS NULL;" 2>/dev/null

echo "✅ Failed migrations removed"
echo ""

echo "📊 Current migrations status:"
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e "SELECT migration_name, started_at, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;" 2>/dev/null

echo ""
echo "🔄 Restarting backend..."
docker restart wms-backend

echo "⏳ Waiting for backend to start..."
sleep 20

echo ""
echo "🔍 Checking backend health..."
if docker exec wms-backend curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed"
    echo "Logs:"
    docker logs wms-backend --tail 30
fi

echo ""
echo "📊 Container status:"
docker ps --filter "name=wms-" --format "table {{.Names}}\t{{.Status}}"
'@

Write-Host ""
Write-Host "✅ Migration fix complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Testing production API..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://qgocargo.cloud/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Production API: OK" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "⚠️  Production API test failed: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Ready for GitHub Actions deployment!" -ForegroundColor Green
