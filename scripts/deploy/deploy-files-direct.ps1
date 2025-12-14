$ErrorActionPreference = "Stop"
$pscpPath = "C:\Program Files\PuTTY\pscp.exe"
$plinkPath = "C:\Program Files\PuTTY\plink.exe"
$password = "Qgocargo@123"
$vps = "root@148.230.107.155"
$remoteBase = "/root/NEW START"

if (-not (Test-Path $pscpPath)) {
    Write-Error "PSCP not found at $pscpPath"
    exit 1
}

Write-Host "🚀 Deploying modified files directly to VPS..." -ForegroundColor Cyan

# 1. Upload Login.tsx
Write-Host "📤 Uploading Login.tsx..." -ForegroundColor Yellow
$localLogin = "frontend\src\pages\Login\Login.tsx"
$remoteLogin = "${remoteBase}/frontend/src/pages/Login/Login.tsx"
# Note: The quoting here is specific to ensure pscp receives the quotes around the remote path
& $pscpPath -pw $password $localLogin "${vps}:`"${remoteLogin}`""

# 2. Upload MaterialReports.tsx
Write-Host "📤 Uploading MaterialReports.tsx..." -ForegroundColor Yellow
$localMat = "frontend\src\pages\Materials\MaterialReports.tsx"
$remoteMat = "${remoteBase}/frontend/src/pages/Materials/MaterialReports.tsx"
& $pscpPath -pw $password $localMat "${vps}:`"${remoteMat}`""

# 3. Rebuild Frontend
Write-Host "🔄 Rebuilding Frontend on VPS..." -ForegroundColor Yellow
# Use single quotes for the path to handle spaces correctly in bash
$buildCmd = "cd '/root/NEW START' && docker-compose up -d --build frontend"
& $plinkPath -batch -pw $password $vps $buildCmd

Write-Host "✅ Done! Changes should be live after the build completes." -ForegroundColor Green
