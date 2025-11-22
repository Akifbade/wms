#!/usr/bin/env pwsh
# MANUAL STAGING DEPLOYMENT - Simple and Direct

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 MANUAL STAGING DEPLOYMENT (Simple Method)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend locally
Write-Host "[1/4] Building frontend locally..." -ForegroundColor Yellow
cd frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}
cd ..
Write-Host "✅ Frontend built" -ForegroundColor Green
Write-Host ""

# Step 2: Transfer to VPS
Write-Host "[2/4] Transferring to VPS..." -ForegroundColor Yellow
scp -r frontend/dist root@148.230.107.155:/tmp/staging-frontend-dist
Write-Host "✅ Files transferred" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy on VPS
Write-Host "[3/4] Deploying on VPS..." -ForegroundColor Yellow
ssh root@148.230.107.155 @"
cd '/root/NEW START'

echo '🛑 Stopping old staging containers...'
docker-compose -f docker-compose-staging-isolated.yml down 2>/dev/null || true

echo '🚀 Starting staging containers...'
docker-compose -f docker-compose-staging-isolated.yml up -d

echo '⏳ Waiting for containers to start...'
sleep 10

echo '📦 Copying frontend files...'
docker cp /tmp/staging-frontend-dist/. wms-staging-frontend:/usr/share/nginx/html/

echo '🔄 Reloading nginx...'
docker exec wms-staging-frontend nginx -s reload

echo '🧹 Cleanup...'
rm -rf /tmp/staging-frontend-dist

echo '✅ Staging deployed!'
"@

Write-Host "✅ Deployed on VPS" -ForegroundColor Green
Write-Host ""

# Step 4: Health check
Write-Host "[4/4] Health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$response = Invoke-WebRequest -Uri "http://148.230.107.155:8080" -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "✅ Staging is LIVE!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Staging might still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ MANUAL DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend: http://148.230.107.155:8080" -ForegroundColor Cyan
Write-Host "🔌 Backend: http://148.230.107.155:5001/api/health" -ForegroundColor Cyan
Write-Host ""
