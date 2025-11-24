# Fresh VPS Deployment Script
# Deploy WMS to VPS with Docker

$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$VPS_PATH = "/root/NEW START"

Write-Host "🚀 Starting Fresh VPS Deployment..." -ForegroundColor Green

# Files to deploy
$filesToDeploy = @(
    "backend",
    "frontend", 
    "docker-compose.yml",
    "docker-compose.prod.yml",
    ".env"
)

Write-Host "📦 Compressing project files..." -ForegroundColor Yellow

# Create temporary deployment package
$tempDir = "$env:TEMP\wms-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy essential files
foreach ($item in $filesToDeploy) {
    if (Test-Path $item) {
        Write-Host "  ✓ Copying $item" -ForegroundColor Gray
        Copy-Item -Path $item -Destination $tempDir -Recurse -Force
    }
}

# Create production docker-compose if not exists
if (-not (Test-Path "docker-compose.prod.yml")) {
    Write-Host "  ✓ Creating docker-compose.prod.yml" -ForegroundColor Gray
    Copy-Item "docker-compose.yml" "$tempDir\docker-compose.prod.yml"
}

# Compress to tar.gz
$archivePath = "$env:TEMP\wms-deploy.tar.gz"
Write-Host "📦 Creating archive..." -ForegroundColor Yellow
tar -czf $archivePath -C $tempDir .

# Upload to VPS using SCP
Write-Host "⬆️  Uploading to VPS..." -ForegroundColor Yellow
scp $archivePath "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/wms-deploy.tar.gz"

# Extract and deploy on VPS
Write-Host "🔧 Deploying on VPS..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_HOST}" @"
cd '$VPS_PATH'
tar -xzf wms-deploy.tar.gz
rm wms-deploy.tar.gz

# Stop any running containers
docker-compose down 2>/dev/null || true

# Build and start services
echo '🐳 Building Docker containers...'
docker-compose up -d --build

# Wait for database to be ready
echo '⏳ Waiting for database...'
sleep 15

# Run database migrations
echo '📊 Setting up database...'
docker exec wms-backend npx prisma db push --accept-data-loss

# Seed database
echo '🌱 Seeding database...'
docker exec wms-backend npm run seed

echo '✅ Deployment complete!'
docker ps
"@

# Cleanup
Remove-Item $tempDir -Recurse -Force
Remove-Item $archivePath -Force

Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 Access WMS at: http://$VPS_HOST" -ForegroundColor Cyan
Write-Host "🔑 Login: admin@demo.com / demo123" -ForegroundColor Cyan
