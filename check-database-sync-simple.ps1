# Database Schema Comparison Tool
param([switch]$Detailed)

$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$SSH_KEY = "~/.ssh/github_actions_wms"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "DATABASE SCHEMA COMPARISON" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking VPS databases..." -ForegroundColor Yellow

# Check staging migration status
Write-Host ""
Write-Host "STAGING DATABASE (Port 3308)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} "docker exec wms-staging-backend npx prisma migrate status 2>&1"

Write-Host ""
Write-Host "PRODUCTION DATABASE (Port 3307)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} "docker exec wms-backend npx prisma migrate status 2>&1"

Write-Host ""
Write-Host "CRITICAL: Checking zone columns in production..." -ForegroundColor Yellow
ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} "docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e 'SHOW COLUMNS FROM racks LIKE \"zone%\";' 2>/dev/null"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
