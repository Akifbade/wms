# SSH to VPS and Check Backend Status
$VPS_IP = "148.230.107.155"

Write-Host "Connecting to VPS: $VPS_IP" -ForegroundColor Cyan
Write-Host "=================================================="

Write-Host "`nStep 1: SSH into VPS" -ForegroundColor Yellow
Write-Host "  ssh root@$VPS_IP" -ForegroundColor White

Write-Host "`nStep 2: Check Docker Containers" -ForegroundColor Yellow
Write-Host "  docker ps -a" -ForegroundColor White

Write-Host "`nStep 3: Check Backend Logs" -ForegroundColor Yellow
Write-Host "  docker logs wms-backend --tail 50" -ForegroundColor White

Write-Host "`nStep 4: Check Backend Health" -ForegroundColor Yellow
Write-Host "  curl http://localhost:5000/api/health" -ForegroundColor White

Write-Host "`n=== COMMON FIXES ===" -ForegroundColor Cyan

Write-Host "`nIf backend is stopped:" -ForegroundColor Yellow
Write-Host "  docker-compose restart wms-backend" -ForegroundColor White

Write-Host "`nIf backend crashed with errors:" -ForegroundColor Yellow
Write-Host "  cd /root/wms" -ForegroundColor White
Write-Host "  docker-compose logs backend" -ForegroundColor White

Write-Host "`nTo deploy latest code (v2.1.83):" -ForegroundColor Yellow
Write-Host "  cd /root/wms" -ForegroundColor White
Write-Host "  git pull origin stable/prisma-mysql-production" -ForegroundColor White
Write-Host "  docker-compose build backend" -ForegroundColor White
Write-Host "  docker-compose up -d backend" -ForegroundColor White

Write-Host "`nCheck if database is running:" -ForegroundColor Yellow
Write-Host "  docker exec wms-database mysql -uroot -prootpassword123 -e 'SELECT 1;'" -ForegroundColor White

Write-Host "`n=== 502 Error Usually Means ===" -ForegroundColor Red
Write-Host "  1. Backend container is DOWN" -ForegroundColor White
Write-Host "  2. Backend crashed (check logs)" -ForegroundColor White
Write-Host "  3. Database connection failed" -ForegroundColor White
Write-Host "  4. TypeScript compilation errors" -ForegroundColor White
