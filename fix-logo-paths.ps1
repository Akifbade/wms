#!/usr/bin/env pwsh
# Fix logo upload paths - move from /uploads/logos/ to /uploads/company-logos/

Write-Host "🔧 Fixing logo upload paths on production..." -ForegroundColor Cyan

$server = "root@148.230.107.155"
ssh $server @'
cd "/root/NEW START"
echo "Checking logos folder..."
docker exec wms-backend ls -la /app/uploads/logos/ 2>&1
echo ""
echo "Moving files from logos to company-logos..."
docker exec wms-backend sh -c "mkdir -p /app/uploads/company-logos && if [ -d /app/uploads/logos ] && [ \"\$(ls -A /app/uploads/logos)\" ]; then mv /app/uploads/logos/* /app/uploads/company-logos/ 2>/dev/null && echo Files moved; fi"
echo ""
echo "Pulling latest code..."
git pull origin stable/prisma-mysql-production
echo ""
echo "Rebuilding backend..."
docker-compose up -d --build backend
echo ""
echo "Testing..."
sleep 5
curl -I https://qgocargo.cloud/uploads/company-logos/company-1761808122145-343818670.png 2>&1 | grep HTTP
'@

Write-Host "`n✅ Logo path fix complete!" -ForegroundColor Green
Write-Host "🔍 Check browser console - logos should load now" -ForegroundColor Yellow
