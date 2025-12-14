$ErrorActionPreference = "Stop"
$pscpPath = "C:\Program Files\PuTTY\pscp.exe"
$plinkPath = "C:\Program Files\PuTTY\plink.exe"
$password = "Qgocargo@123"
$vps = "root@148.230.107.155"
$remoteBase = "/root/NEW START"

Write-Host "🚀 Deploying Job Materials Manager..." -ForegroundColor Cyan

# 1. Upload JobMaterialsManager.tsx
Write-Host "📤 Uploading JobMaterialsManager.tsx..." -ForegroundColor Yellow
$localFile = "frontend\src\components\moving-jobs\JobMaterialsManager.tsx"
$remoteFile = "${remoteBase}/frontend/src/components/moving-jobs/JobMaterialsManager.tsx"
$remoteArg = "${vps}:${remoteFile}"
& $pscpPath -pw $password $localFile $remoteArg

# 2. Rebuild Frontend
Write-Host "🔄 Rebuilding Frontend on VPS..." -ForegroundColor Yellow
$cmd = "cd '/root/NEW START'; docker-compose up -d --build frontend"
& $plinkPath -batch -pw $password $vps $cmd

Write-Host "✅ Job Materials Manager Deployed!" -ForegroundColor Green
