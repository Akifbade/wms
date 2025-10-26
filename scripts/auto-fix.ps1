# 🛡️ AUTO-FIX COMMON PROBLEMS
# Run this if Vite crashes, Prisma breaks, or database issues

Write-Host "🔧 WMS AUTO-FIX SCRIPT" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running! Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Menu
Write-Host "What problem are you facing?" -ForegroundColor Yellow
Write-Host "1. Vite crashed / Frontend not loading" -ForegroundColor White
Write-Host "2. Prisma error / Database schema mismatch" -ForegroundColor White
Write-Host "3. Backend not starting / API errors" -ForegroundColor White
Write-Host "4. Everything broken / Full reset" -ForegroundColor White
Write-Host "5. Exit" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔧 Fixing Vite / Frontend..." -ForegroundColor Cyan
        
        Write-Host "  → Clearing Vite cache..." -ForegroundColor Gray
        docker exec wms-frontend-dev rm -rf node_modules/.vite 2>$null
        
        Write-Host "  → Restarting frontend..." -ForegroundColor Gray
        docker restart wms-frontend-dev | Out-Null
        
        Write-Host "  → Waiting for rebuild (30s)..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
        
        $logs = docker logs wms-frontend-dev --tail 5 2>&1
        if ($logs -match "ready in") {
            Write-Host ""
            Write-Host "✅ Frontend is working!" -ForegroundColor Green
            Write-Host "🌐 Open: http://localhost" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "⚠️  Frontend might still be starting..." -ForegroundColor Yellow
            Write-Host "📋 Check logs: docker logs wms-frontend-dev --tail 20" -ForegroundColor Gray
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔧 Fixing Prisma / Database..." -ForegroundColor Cyan
        
        Write-Host "  → Generating Prisma client..." -ForegroundColor Gray
        docker exec wms-backend-dev npx prisma generate 2>&1 | Out-Null
        
        Write-Host "  → Deploying migrations..." -ForegroundColor Gray
        docker exec wms-backend-dev npx prisma migrate deploy 2>&1 | Out-Null
        
        Write-Host "  → Restarting backend..." -ForegroundColor Gray
        docker restart wms-backend-dev | Out-Null
        
        Write-Host "  → Waiting for backend (15s)..." -ForegroundColor Gray
        Start-Sleep -Seconds 15
        
        $logs = docker logs wms-backend-dev --tail 5 2>&1
        if ($logs -match "running on") {
            Write-Host ""
            Write-Host "✅ Database is fixed!" -ForegroundColor Green
            Write-Host "🔌 Backend: http://localhost:5000" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "⚠️  Backend might still be starting..." -ForegroundColor Yellow
            Write-Host "📋 Check logs: docker logs wms-backend-dev --tail 20" -ForegroundColor Gray
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔧 Fixing Backend..." -ForegroundColor Cyan
        
        Write-Host "  → Checking database connection..." -ForegroundColor Gray
        $dbHealth = docker ps --filter "name=wms-database-dev" --filter "health=healthy" -q
        if (-not $dbHealth) {
            Write-Host "  ⚠️  Database is not healthy, restarting..." -ForegroundColor Yellow
            docker restart wms-database-dev | Out-Null
            Start-Sleep -Seconds 10
        }
        
        Write-Host "  → Restarting backend..." -ForegroundColor Gray
        docker restart wms-backend-dev | Out-Null
        
        Write-Host "  → Waiting (15s)..." -ForegroundColor Gray
        Start-Sleep -Seconds 15
        
        Write-Host ""
        Write-Host "✅ Backend restarted!" -ForegroundColor Green
        Write-Host "📋 Check: docker logs wms-backend-dev --tail 20" -ForegroundColor Cyan
    }
    
    "4" {
        Write-Host ""
        Write-Host "⚠️  FULL RESET - This will:" -ForegroundColor Yellow
        Write-Host "   - Restart all containers" -ForegroundColor Gray
        Write-Host "   - Clear all caches" -ForegroundColor Gray
        Write-Host "   - Regenerate Prisma" -ForegroundColor Gray
        Write-Host "   - Keep database data safe" -ForegroundColor Green
        Write-Host ""
        $confirm = Read-Host "Continue? (yes/no)"
        
        if ($confirm -eq "yes") {
            Write-Host ""
            Write-Host "🔄 Full system reset..." -ForegroundColor Cyan
            
            Write-Host "  → Stopping containers..." -ForegroundColor Gray
            docker-compose down 2>&1 | Out-Null
            
            Write-Host "  → Starting fresh..." -ForegroundColor Gray
            docker-compose -f docker-compose.dev.yml up -d 2>&1 | Out-Null
            
            Write-Host "  → Waiting for database (20s)..." -ForegroundColor Gray
            Start-Sleep -Seconds 20
            
            Write-Host "  → Fixing Prisma..." -ForegroundColor Gray
            docker exec wms-backend-dev npx prisma generate 2>&1 | Out-Null
            docker exec wms-backend-dev npx prisma migrate deploy 2>&1 | Out-Null
            
            Write-Host "  → Restarting backend..." -ForegroundColor Gray
            docker restart wms-backend-dev | Out-Null
            
            Write-Host "  → Clearing Vite cache..." -ForegroundColor Gray
            docker exec wms-frontend-dev rm -rf node_modules/.vite 2>$null
            docker restart wms-frontend-dev | Out-Null
            
            Write-Host "  → Waiting for everything (30s)..." -ForegroundColor Gray
            Start-Sleep -Seconds 30
            
            Write-Host ""
            Write-Host "✅ FULL RESET COMPLETE!" -ForegroundColor Green
            Write-Host "🌐 Try: http://localhost" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "If still not working:" -ForegroundColor Yellow
            Write-Host "  docker ps                          (Check containers)" -ForegroundColor Gray
            Write-Host "  docker logs wms-frontend-dev --tail 20" -ForegroundColor Gray
            Write-Host "  docker logs wms-backend-dev --tail 20" -ForegroundColor Gray
        }
    }
    
    "5" {
        Write-Host "Goodbye! 👋" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
