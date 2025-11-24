#!/usr/bin/env pwsh
# Quick script to run backend with hot-reload for local development

Write-Host "🚀 Starting WMS Backend in LOCAL DEV MODE (with hot reload)" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will mount your local code directory into the container" -ForegroundColor Yellow
Write-Host "Any code changes will be instantly reflected" -ForegroundColor Yellow
Write-Host ""

cd $PSScriptRoot

# Stop existing backend if running
Write-Host "Stopping existing backend..." -ForegroundColor Gray
docker stop wms-backend 2>&1 | Out-Null

# Run backend with volume mount for hot-reload
Write-Host "Starting backend with LOCAL CODE mounted..." -ForegroundColor Cyan

docker run -d `
  --name wms-backend `
  --network newstart_wms-network `
  -p 5000:5000 `
  -e NODE_ENV=development `
  -e DATABASE_URL="mysql://wms_user:wmspassword123@wms-database:3306/warehouse_wms" `
  -e JWT_SECRET="your-secret-key" `
  -v "${PSScriptRoot}/backend:/app/src" `
  -v "${PSScriptRoot}/backend/prisma:/app/prisma" `
  newstart-backend:latest `
  sh -c "npx ts-node src/index.ts"

Write-Host ""
Write-Host "✅ Backend started with LOCAL CODE!" -ForegroundColor Green
Write-Host ""
Write-Host "Now, any changes to backend/src/ will auto-reload" -ForegroundColor Green
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  docker logs -f wms-backend" -ForegroundColor Gray
Write-Host ""
