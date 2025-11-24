# Auto Deploy to VPS Script
$VPS_IP = "148.230.107.155"
$VPS_USER = "root"

Write-Host "🚀 Auto-Deploying to VPS: $VPS_IP" -ForegroundColor Cyan
Write-Host "=================================================="

# Commands to run on VPS
$deployCommands = @"
cd /root/wms && \
echo '📥 Pulling latest code...' && \
git pull origin stable/prisma-mysql-production && \
echo '🔨 Building backend...' && \
docker-compose build backend && \
echo '🚀 Starting backend...' && \
docker-compose up -d backend && \
echo '⏳ Waiting 10 seconds...' && \
sleep 10 && \
echo '✅ Checking status...' && \
docker ps --filter 'name=wms-backend' && \
echo '🏥 Health Check:' && \
curl -s http://localhost:5000/api/health | jq .
"@

Write-Host "`n📝 Copy and run this command:" -ForegroundColor Yellow
Write-Host "`nssh $VPS_USER@$VPS_IP `"$deployCommands`"" -ForegroundColor Green

Write-Host "`n🔐 Or if you have SSH key setup, run:" -ForegroundColor Yellow
$sshCommand = "ssh $VPS_USER@$VPS_IP `"$deployCommands`""
Write-Host $sshCommand -ForegroundColor White

Write-Host "`n💡 Manual Alternative (copy-paste in VPS terminal):" -ForegroundColor Cyan
Write-Host "cd /root/wms" -ForegroundColor White
Write-Host "git pull origin stable/prisma-mysql-production" -ForegroundColor White
Write-Host "docker-compose build backend" -ForegroundColor White
Write-Host "docker-compose up -d backend" -ForegroundColor White
Write-Host "docker logs wms-backend -f" -ForegroundColor White
