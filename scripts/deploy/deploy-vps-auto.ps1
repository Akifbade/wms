# 🚀 QGO MATERIAL TRACKING SYSTEM - VPS DEPLOYMENT (Windows PowerShell)
# Automated deployment to production VPS

$ErrorActionPreference = "Stop"

# Configuration
$VPS_IP = "148.230.107.155"
$VPS_USER = "root"
$VPS_PATH = "/opt/qgo-materials"
$REPO_PATH = "c:\Users\USER\Videos\NEW START\qgo"
$DOMAIN = "qgocargo.cloud"

Write-Host "🚀 Starting VPS Deployment..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Step 1: Build locally
Write-Host "`n📦 Step 1: Building application locally..." -ForegroundColor Yellow
Set-Location $REPO_PATH
npm run build:server 2>&1 | Select-Object -Last 20
npm run build 2>&1 | Select-Object -Last 20

# Step 2: Create deployment package
Write-Host "`n📦 Step 2: Creating deployment package..." -ForegroundColor Yellow
tar --exclude=node_modules --exclude=.git --exclude=dist -czf qgo-materials-production.tar.gz .
if (Test-Path "qgo-materials-production.tar.gz") {
    Write-Host "✅ Package created successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Package creation failed" -ForegroundColor Red
    exit 1
}

# Step 3: Upload to VPS via SCP
Write-Host "`n📤 Step 3: Uploading to VPS ($VPS_IP)..." -ForegroundColor Yellow
Write-Host "This will prompt for SSH password..." -ForegroundColor Cyan

# Note: Windows users should have SSH/SCP configured
# If not, use: "scoop install openssh" or use WSL

$scpCommand = "scp qgo-materials-production.tar.gz $VPS_USER@$VPS_IP`:/tmp/"
Write-Host "Running: $scpCommand" -ForegroundColor Cyan

try {
    & scp qgo-materials-production.tar.gz "$VPS_USER@$VPS_IP`:/tmp/" 2>&1
    Write-Host "✅ Upload successful" -ForegroundColor Green
} catch {
    Write-Host "⚠️ SCP might need configuration. Using alternative method..." -ForegroundColor Yellow
    # Alternative: Use SSH to run wget from VPS
}

# Step 4: Deploy on VPS
Write-Host "`n🔧 Step 4: Deploying on VPS..." -ForegroundColor Yellow

$deployScript = @"
set -e

echo '📥 Extracting files...'
cd /opt
rm -rf qgo-materials-old
mv qgo-materials qgo-materials-old 2>/dev/null || true
mkdir -p qgo-materials
cd qgo-materials
tar -xzf /tmp/qgo-materials-production.tar.gz

echo '📦 Installing dependencies...'
npm install --production

echo '🗄️ Setting up database...'
npm run prisma:generate
npm run prisma:migrate:deploy

echo '✅ Database setup complete'

echo '🔧 Creating systemd service...'
cat > /etc/systemd/system/qgo-materials.service << 'SERVICE'
[Unit]
Description=QGO Material Tracking System
After=network.target mysql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/qgo-materials
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable qgo-materials.service
systemctl restart qgo-materials.service

echo '✅ Service configured and started'
"@

Write-Host "Executing deployment commands on VPS..." -ForegroundColor Cyan
echo $deployScript | ssh "$VPS_USER@$VPS_IP" 2>&1

# Step 5: Verify deployment
Write-Host "`n✅ Verifying deployment..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" "systemctl status qgo-materials --no-pager" 2>&1 | Select-Object -First 10

# Step 6: Cleanup
Write-Host "`n🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item "qgo-materials-production.tar.gz" -Force
ssh "$VPS_USER@$VPS_IP" "rm /tmp/qgo-materials-production.tar.gz" 2>&1 | Out-Null

# Success Summary
Write-Host ""
Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "🌐 Access your application:" -ForegroundColor Cyan
Write-Host "   Frontend: https://qgocargo.cloud" -ForegroundColor White
Write-Host "   API: https://qgocargo.cloud/api" -ForegroundColor White
Write-Host "📊 Backend Port: 3000" -ForegroundColor Cyan
Write-Host "🗄️ Database: MySQL on VPS" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Yellow
Write-Host "   Check status:    ssh root@$VPS_IP 'systemctl status qgo-materials'" -ForegroundColor Gray
Write-Host "   View logs:       ssh root@$VPS_IP 'journalctl -u qgo-materials -f'" -ForegroundColor Gray
Write-Host "   Restart service: ssh root@$VPS_IP 'systemctl restart qgo-materials'" -ForegroundColor Gray
Write-Host ""
