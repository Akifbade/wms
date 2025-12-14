$ErrorActionPreference = "Stop"
$pscpPath = "C:\Program Files\PuTTY\pscp.exe"
$plinkPath = "C:\Program Files\PuTTY\plink.exe"
$password = "Qgocargo@123"
$vps = "root@148.230.107.155"
$remoteBase = "/root/NEW START"

Write-Host "🚀 Deploying Backend Fix..." -ForegroundColor Cyan

# 1. Upload materials.ts
Write-Host "📤 Uploading materials.ts..." -ForegroundColor Yellow
$localFile = "backend\src\routes\materials.ts"
$remoteFile = "${remoteBase}/backend/src/routes/materials.ts"
$remoteArg = "${vps}:${remoteFile}"
& $pscpPath -pw $password $localFile $remoteArg

# 2. Restart Backend
Write-Host "🔄 Restarting Backend on VPS..." -ForegroundColor Yellow
# Use semicolon for bash command separation just in case, though && is standard bash
$cmd = "cd '/root/NEW START' && docker-compose up -d --build backend"
& $plinkPath -batch -pw $password $vps $cmd

Write-Host "✅ Backend Fix Deployed!" -ForegroundColor Green
