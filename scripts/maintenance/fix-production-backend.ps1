# Quick Fix for Production Backend Issues
# Run this if staging works but production doesn't

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("restart", "rebuild", "copy-from-staging", "check-env", "reset-db")]
    [string]$Action = "restart"
)

$SERVER = "148.230.107.155"
$USER = "root"
$SSH_KEY = "~/.ssh/id_rsa"

Write-Host "🔧 Production Backend Quick Fix" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    "restart" {
        Write-Host "🔄 Restarting backend container..." -ForegroundColor Yellow
        
        ssh -i $SSH_KEY "${USER}@${SERVER}" @"
cd '/root/NEW START'
echo '1. Stopping backend...'
docker-compose stop wms-backend

echo '2. Starting backend...'
docker-compose up -d wms-backend

echo '3. Waiting 10 seconds...'
sleep 10

echo '4. Checking status...'
docker ps | grep wms-backend

echo '5. Checking logs...'
docker logs --tail 20 wms-backend
"@
        
        Write-Host ""
        Write-Host "✅ Backend restarted!" -ForegroundColor Green
        Write-Host "Test: http://qgocargo.cloud/api/health" -ForegroundColor Cyan
    }
    
    "rebuild" {
        Write-Host "🏗️  Rebuilding backend container..." -ForegroundColor Yellow
        Write-Host "⚠️  This will take 2-3 minutes" -ForegroundColor Yellow
        
        ssh -i $SSH_KEY "${USER}@${SERVER}" @"
cd '/root/NEW START'
echo '1. Stopping backend...'
docker-compose stop wms-backend

echo '2. Rebuilding (no cache)...'
docker-compose build --no-cache wms-backend

echo '3. Starting backend...'
docker-compose up -d wms-backend

echo '4. Waiting 15 seconds...'
sleep 15

echo '5. Checking logs...'
docker logs --tail 30 wms-backend
"@
        
        Write-Host ""
        Write-Host "✅ Backend rebuilt!" -ForegroundColor Green
    }
    
    "copy-from-staging" {
        Write-Host "📦 Copying configuration from staging..." -ForegroundColor Yellow
        
        ssh -i $SSH_KEY "${USER}@${SERVER}" @"
cd '/root/NEW START'
echo '1. Backing up production .env...'
cp backend/.env backend/.env.backup-`$(date +%Y%m%d-%H%M%S)

echo '2. Checking staging .env...'
if [ -f staging-backend/.env ]; then
    echo 'Staging .env found, copying...'
    cp staging-backend/.env backend/.env.staging-copy
    echo ''
    echo 'STAGING ENV:'
    cat staging-backend/.env
    echo ''
    echo 'Now update backend/.env with production values:'
    echo '  - FRONTEND_URL=http://qgocargo.cloud'
    echo '  - NODE_ENV=production'
    echo ''
    echo 'Run: nano backend/.env'
else
    echo 'Staging .env not found!'
    echo 'Checking if we can extract from staging container...'
    docker exec wms-staging-backend cat /app/.env > backend/.env.from-staging
    cat backend/.env.from-staging
fi

echo ''
echo '3. After updating .env, restart backend:'
echo '   docker restart wms-backend'
"@
        
        Write-Host ""
        Write-Host "⚠️  Don't forget to update production-specific values!" -ForegroundColor Yellow
    }
    
    "check-env" {
        Write-Host "🔍 Checking environment variables..." -ForegroundColor Yellow
        
        ssh -i $SSH_KEY "${USER}@${SERVER}" @"
cd '/root/NEW START'
echo '=== Production Backend .env ==='
cat backend/.env
echo ''
echo '=== Backend Container Environment ==='
docker exec wms-backend printenv | grep -E 'DB_|NODE_ENV|PORT|FRONTEND' | sort
echo ''
echo '=== Database Container Status ==='
docker ps | grep wms-database
echo ''
echo '=== Test Database Connection ==='
docker exec wms-backend nc -zv wms-database 3306
"@
    }
    
    "reset-db" {
        Write-Host "⚠️  WARNING: This will reset the database!" -ForegroundColor Red
        Write-Host "⚠️  ALL DATA WILL BE LOST!" -ForegroundColor Red
        Write-Host ""
        
        $confirm = Read-Host "Type 'YES' to confirm database reset"
        
        if ($confirm -eq "YES") {
            Write-Host "💣 Resetting database..." -ForegroundColor Yellow
            
            ssh -i $SSH_KEY "${USER}@${SERVER}" @"
cd '/root/NEW START'
echo '1. Creating backup...'
docker exec wms-database mysqldump -u root -p'your_mysql_root_password' wms_db > backup-`$(date +%Y%m%d-%H%M%S).sql

echo '2. Stopping containers...'
docker-compose down

echo '3. Removing database volume...'
docker volume rm "new start_mysql-data"

echo '4. Starting containers...'
docker-compose up -d

echo '5. Waiting for database to initialize...'
sleep 20

echo '6. Running migrations...'
docker exec -it wms-backend npm run migrate

echo '7. Checking database...'
docker exec wms-database mysql -u root -p'your_mysql_root_password' wms_db -e 'SHOW TABLES;'
"@
            
            Write-Host ""
            Write-Host "✅ Database reset complete!" -ForegroundColor Green
        } else {
            Write-Host "❌ Database reset cancelled" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "📋 Usage Examples:" -ForegroundColor Cyan
Write-Host "  .\fix-production-backend.ps1 -Action restart           # Quick restart"
Write-Host "  .\fix-production-backend.ps1 -Action rebuild           # Full rebuild"
Write-Host "  .\fix-production-backend.ps1 -Action copy-from-staging # Copy staging config"
Write-Host "  .\fix-production-backend.ps1 -Action check-env         # Check environment"
Write-Host "  .\fix-production-backend.ps1 -Action reset-db          # Reset database (dangerous!)"
