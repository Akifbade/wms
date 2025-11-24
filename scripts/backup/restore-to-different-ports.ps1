# RESTORE BACKUP TO DIFFERENT PORTS
# This allows you to run the restored system alongside your current system
# ================================================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  WMS RESTORE TO DIFFERENT PORTS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$backupZip = Get-ChildItem "C:\WMS_FULL_BACKUPS\WMS_FULL_SYSTEM_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $backupZip) {
    Write-Host "❌ No backup found in C:\WMS_FULL_BACKUPS\" -ForegroundColor Red
    exit
}

Write-Host "📦 Using backup: $($backupZip.Name)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 Restored system will run on:" -ForegroundColor Yellow
Write-Host "   Frontend:    http://localhost:81" -ForegroundColor Cyan
Write-Host "   Backend:     http://localhost:5001" -ForegroundColor Cyan
Write-Host "   Database:    localhost:3308" -ForegroundColor Cyan
Write-Host "   phpMyAdmin:  http://localhost:8082" -ForegroundColor Cyan
Write-Host ""
Write-Host "🟢 Current system stays on:" -ForegroundColor Green
Write-Host "   Frontend:    http://localhost:80" -ForegroundColor Cyan
Write-Host "   Backend:     http://localhost:5000" -ForegroundColor Cyan
Write-Host "   Database:    localhost:3307" -ForegroundColor Cyan
Write-Host "   phpMyAdmin:  http://localhost:8081" -ForegroundColor Cyan
Write-Host ""

$continue = Read-Host "Continue? (yes/no)"
if ($continue -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Red
    exit
}

$testLocation = "C:\WMS_RESTORED"

# Clean up old test if exists
if (Test-Path $testLocation) {
    Write-Host "🧹 Cleaning old restored system..." -ForegroundColor Yellow
    Set-Location $testLocation
    docker-compose down 2>$null
    Set-Location ..
    Remove-Item $testLocation -Recurse -Force
}

# Extract backup
Write-Host "📂 Extracting backup to: $testLocation" -ForegroundColor Cyan
Expand-Archive -Path $backupZip.FullName -DestinationPath $testLocation -Force
Write-Host "   ✅ Extracted" -ForegroundColor Green

# Modify docker-compose.yml for different ports
Write-Host "🔧 Configuring different ports..." -ForegroundColor Cyan

$dockerCompose = Get-Content "$testLocation\docker-compose.yml" -Raw

# Change ports
$dockerCompose = $dockerCompose -replace '"80:80"', '"81:80"'
$dockerCompose = $dockerCompose -replace '5000:5000', '5001:5000'
$dockerCompose = $dockerCompose -replace '3307:3306', '3308:3306'
$dockerCompose = $dockerCompose -replace '8081:80', '8082:80'

# Change container names to avoid conflicts
$dockerCompose = $dockerCompose -replace 'container_name: wms-', 'container_name: wms-restored-'
$dockerCompose = $dockerCompose -replace 'wms-backend', 'wms-restored-backend'
$dockerCompose = $dockerCompose -replace 'wms-database', 'wms-restored-database'
$dockerCompose = $dockerCompose -replace 'wms-frontend', 'wms-restored-frontend'
$dockerCompose = $dockerCompose -replace 'wms-phpmyadmin', 'wms-restored-phpmyadmin'

# Change network name
$dockerCompose = $dockerCompose -replace 'wms-network', 'wms-restored-network'

Set-Content "$testLocation\docker-compose.yml" -Value $dockerCompose

Write-Host "   ✅ Ports configured" -ForegroundColor Green

# Start containers
Write-Host "🐳 Starting Docker containers..." -ForegroundColor Cyan
Set-Location $testLocation
docker-compose up -d --build 2>&1 | Select-Object -Last 10

Write-Host ""
Write-Host "⏳ Waiting for containers to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Import database
Write-Host "📊 Importing database..." -ForegroundColor Cyan
if (Test-Path "database\database.sql") {
    Get-Content "database\database.sql" | docker exec -i wms-restored-database mysql -u wms_user -pwmspassword123 warehouse_wms
    Write-Host "   ✅ Database imported" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No database backup found" -ForegroundColor Yellow
}

# Build frontend
Write-Host "🎨 Building frontend..." -ForegroundColor Cyan
if (Test-Path "frontend") {
    Set-Location frontend
    npm install --silent 2>&1 | Out-Null
    npm run build 2>&1 | Out-Null
    Set-Location ..
    Write-Host "   ✅ Frontend built" -ForegroundColor Green
}

# Final restart
Write-Host "🔄 Final restart..." -ForegroundColor Cyan
docker-compose restart 2>&1 | Out-Null
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  ✅ RESTORED SYSTEM IS RUNNING!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access restored system:" -ForegroundColor Cyan
Write-Host "   Frontend:    http://localhost:81" -ForegroundColor Yellow
Write-Host "   Backend:     http://localhost:5001/api/health" -ForegroundColor Yellow
Write-Host "   phpMyAdmin:  http://localhost:8082" -ForegroundColor Yellow
Write-Host ""
Write-Host "🟢 Your current system still running:" -ForegroundColor Green
Write-Host "   Frontend:    http://localhost:80" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 To stop restored system:" -ForegroundColor Red
Write-Host "   cd $testLocation" -ForegroundColor White
Write-Host "   docker-compose down" -ForegroundColor White
Write-Host ""
Write-Host "📁 Restored system location: $testLocation" -ForegroundColor Cyan
Write-Host ""

# Go back to original location
Set-Location "C:\Users\USER\Videos\NEW START"
