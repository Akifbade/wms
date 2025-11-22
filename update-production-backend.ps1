# Update Production Backend with Latest Code
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "UPDATING PRODUCTION BACKEND WITH LATEST CODE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Sync backend code to VPS
Write-Host "[1/3] Syncing backend code to VPS..." -ForegroundColor Yellow
Write-Host "This will ask for password once..." -ForegroundColor Gray

# Create archive of backend source
Compress-Archive -Path "backend\src\*" -DestinationPath "backend-src.zip" -Force
Compress-Archive -Path "backend\package.json","backend\tsconfig.json","backend\Dockerfile" -DestinationPath "backend-config.zip" -Force

# Transfer files
scp backend-src.zip backend-config.zip root@148.230.107.155:/tmp/

# Clean up local archives
Remove-Item backend-src.zip, backend-config.zip -Force

Write-Host "   Code transferred" -ForegroundColor Green

# Step 2: Extract and rebuild on VPS (single SSH session)
Write-Host ""
Write-Host "[2/3] Extracting code and rebuilding backend..." -ForegroundColor Yellow
Write-Host "This will take 2-3 minutes on VPS..." -ForegroundColor Gray

ssh root@148.230.107.155 @"
cd '/root/NEW START/backend'
rm -rf src
unzip -q /tmp/backend-src.zip -d .
unzip -o -q /tmp/backend-config.zip -d .
rm /tmp/backend-src.zip /tmp/backend-config.zip

echo ''
echo 'Building backend container...'
cd '/root/NEW START'
docker-compose build --no-cache backend

echo ''
echo 'Starting updated backend...'
docker-compose up -d backend

echo ''
echo 'Waiting for backend to start...'
sleep 5

echo ''
echo 'Backend version:'
curl -s http://localhost:5000/api/health | grep -o '"version":"[^"]*"'
"@

Write-Host ""
Write-Host "[3/3] Verifying production..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

ssh root@148.230.107.155 "docker ps | grep backend"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "BACKEND UPDATE COMPLETE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production now has all latest features:" -ForegroundColor Cyan
Write-Host "  - Material edit/delete options" -ForegroundColor White
Write-Host "  - All new functionality from local" -ForegroundColor White
Write-Host ""
