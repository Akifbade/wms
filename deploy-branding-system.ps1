#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploying Branding System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$VPS_IP = "72.60.215.188"
$VPS_USER = "root"
$VPS_PATH = "/var/www/wms"

# Step 1: Create Prisma Migration
Write-Host "[1/6] Creating Prisma migration..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Videos\NEW START\backend"
npx prisma migrate dev --name add_branding_fields

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to create migration" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Migration created successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Build Frontend
Write-Host "[2/6] Building frontend..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Videos\NEW START\frontend"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Create archive with frontend and migration
Write-Host "[3/6] Creating deployment archive..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Videos\NEW START"

# Create a temp directory for deployment
$tempDir = "temp-deploy"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy frontend dist
Copy-Item -Recurse -Force "frontend\dist" "$tempDir\frontend-dist"

# Copy migration files
Copy-Item -Recurse -Force "backend\prisma\migrations" "$tempDir\migrations"

# Copy schema.prisma
Copy-Item -Force "backend\prisma\schema.prisma" "$tempDir\schema.prisma"

# Create tar.gz archive
tar -czf branding-deploy.tar.gz -C $tempDir .

Write-Host "✓ Archive created: branding-deploy.tar.gz" -ForegroundColor Green
Write-Host ""

# Step 4: Upload to VPS
Write-Host "[4/6] Uploading to VPS..." -ForegroundColor Yellow
scp branding-deploy.tar.gz "${VPS_USER}@${VPS_IP}:/tmp/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Upload failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Uploaded to VPS" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy on VPS
Write-Host "[5/6] Deploying on VPS..." -ForegroundColor Yellow

$deployCommands = @"
cd /tmp
tar -xzf branding-deploy.tar.gz

# Backup current files
cd $VPS_PATH
cp -r frontend/dist frontend/dist.backup-`$(date +%Y%m%d-%H%M%S)

# Deploy frontend
rm -rf frontend/dist/*
cp -r /tmp/frontend-dist/* frontend/dist/

# Deploy migration
cp -r /tmp/migrations/* backend/prisma/migrations/
cp /tmp/schema.prisma backend/prisma/schema.prisma

# Run migration
cd backend
npx prisma migrate deploy
npx prisma generate

# Restart services
pm2 restart wms-backend
systemctl restart nginx

echo "✓ Deployment complete"
"@

ssh "${VPS_USER}@${VPS_IP}" $deployCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Deployed successfully" -ForegroundColor Green
Write-Host ""

# Step 6: Cleanup
Write-Host "[6/6] Cleaning up..." -ForegroundColor Yellow
Remove-Item -Force branding-deploy.tar.gz
Remove-Item -Recurse -Force $tempDir
Write-Host "✓ Cleanup complete" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Visit: https://72.60.215.188" -ForegroundColor White
Write-Host "2. Login and go to Settings → Branding & Appearance" -ForegroundColor White
Write-Host "3. Upload your logo and customize colors" -ForegroundColor White
Write-Host "4. Save and logout to see changes on login page" -ForegroundColor White
Write-Host ""
