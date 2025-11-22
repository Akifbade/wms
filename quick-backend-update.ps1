# Quick Backend Update - Production
Write-Host "Updating production backend..." -ForegroundColor Cyan

# Transfer backend source
Write-Host "Transferring code..." -ForegroundColor Yellow
scp -r backend/src root@148.230.107.155:'/root/NEW START/backend/'
scp backend/package.json root@148.230.107.155:'/root/NEW START/backend/'

# Rebuild backend
Write-Host "Rebuilding backend (2-3 min)..." -ForegroundColor Yellow
ssh root@148.230.107.155 "cd '/root/NEW START' && docker-compose build backend && docker-compose up -d backend && sleep 5 && curl -s http://localhost:5000/api/health"

Write-Host ""
Write-Host "Backend updated!" -ForegroundColor Green
