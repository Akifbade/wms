# Deploy phpMyAdmin to Production VPS
# Run this script to add phpMyAdmin to your production server

Write-Host '🚀 Deploying phpMyAdmin to Production VPS...' -ForegroundColor Cyan
Write-Host ''

# Step 1: Pull latest changes
Write-Host '📥 Step 1: Pulling latest code from GitHub...' -ForegroundColor Yellow
ssh root@148.230.107.155 "cd /root/NEW\ START && git pull origin stable/prisma-mysql-production"

Write-Host ''
Write-Host '✅ Code updated!' -ForegroundColor Green
Write-Host ''

# Step 2: Start phpMyAdmin container
Write-Host '🐳 Step 2: Starting phpMyAdmin container...' -ForegroundColor Yellow
ssh root@148.230.107.155 "cd /root/NEW\ START && docker-compose up -d phpmyadmin"

Write-Host ''
Write-Host '✅ phpMyAdmin container started!' -ForegroundColor Green
Write-Host ''

# Step 3: Verify it's running
Write-Host '🔍 Step 3: Checking if phpMyAdmin is running...' -ForegroundColor Yellow
ssh root@148.230.107.155 "docker ps | grep phpmyadmin"

Write-Host ''
Write-Host '════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '✅ phpMyAdmin Deployed Successfully!' -ForegroundColor Green
Write-Host '════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host '📝 Access Information:' -ForegroundColor White
Write-Host ''
Write-Host '   🌐 URL: http://148.230.107.155:8081' -ForegroundColor Yellow
Write-Host ''
Write-Host '   👤 Username: root' -ForegroundColor White
Write-Host '   🔑 Password: rootpassword123' -ForegroundColor White
Write-Host ''
Write-Host '   📦 Database: warehouse_wms' -ForegroundColor White
Write-Host ''
Write-Host '════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host '⚠️  SECURITY RECOMMENDATIONS:' -ForegroundColor Red
Write-Host ''
Write-Host '1. Change port 8081 to something random (edit docker-compose.yml)' -ForegroundColor Yellow
Write-Host '2. Use SSH tunnel: ssh -L 8081:localhost:8081 root@148.230.107.155' -ForegroundColor Yellow
Write-Host '3. Add firewall rule to restrict access to your IP only' -ForegroundColor Yellow
Write-Host ''
Write-Host '📖 Full guide: See PHPMYADMIN-SETUP.md' -ForegroundColor Cyan
Write-Host ''

# Open browser
Write-Host '🌐 Opening phpMyAdmin in browser...' -ForegroundColor Cyan
Start-Process 'http://148.230.107.155:8081'
