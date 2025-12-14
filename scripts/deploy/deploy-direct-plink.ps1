# Direct Deployment via PuTTY (Plink/PSCP)
# Bypasses Git/Staging - Direct File Upload

$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$VPS_PASS = "Akif@8788881688" # From previous scripts
$VPS_PATH = "/root/NEW START"

Write-Host "🚀 Starting Direct Deployment via PuTTY..." -ForegroundColor Cyan

# 1. Build Frontend
Write-Host "🔨 Building Frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1 
}
Set-Location ..

# 2. Upload Frontend
Write-Host "📤 Uploading Frontend (dist)..." -ForegroundColor Yellow
# Upload contents of dist to frontend/dist on VPS
# We use -pw to provide password. -batch to avoid interactive prompts.
# Note: pscp requires 'y' for host key caching on first run, -batch might fail if host key not cached.
# We assume host key is cached or we accept it manually once.
# echo y | plink ... might work for host key.

$pscpArgs = @("-r", "-batch", "-pw", $VPS_PASS, "frontend/dist", "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/")
Write-Host "   Running: pscp frontend/dist -> ${VPS_PATH}/frontend/" -ForegroundColor Gray
& pscp $pscpArgs
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Upload failed" -ForegroundColor Red; exit 1 }

# 3. Upload Backend Code
Write-Host "📤 Uploading Backend (src)..." -ForegroundColor Yellow
$pscpArgsBackend = @("-r", "-batch", "-pw", $VPS_PASS, "backend/src", "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/")
& pscp $pscpArgsBackend

Write-Host "📤 Uploading Backend (config)..." -ForegroundColor Yellow
& pscp -batch -pw $VPS_PASS "backend/package.json" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/"
& pscp -batch -pw $VPS_PASS "backend/prisma/schema.prisma" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/prisma/"

# 4. Restart Services
Write-Host "🔄 Restarting Services on VPS..." -ForegroundColor Yellow
$cmd = "cd '${VPS_PATH}' && docker-compose up -d --build frontend backend && docker exec wms-backend npx prisma migrate deploy && echo '✅ Services Restarted'"
& plink -batch -pw $VPS_PASS ${VPS_USER}@${VPS_HOST} $cmd

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
