$ErrorActionPreference = "Stop"
$pscpPath = "C:\Program Files\PuTTY\pscp.exe"
$plinkPath = "C:\Program Files\PuTTY\plink.exe"
$password = "Qgocargo@123"
$vps = "root@148.230.107.155"
$remoteBase = "/root/NEW START"

Write-Host "Deploying New Login Screen..." -ForegroundColor Cyan

# 1. Upload Login.tsx
Write-Host "Uploading Login.tsx..." -ForegroundColor Yellow
$localFile = "frontend\src\pages\Login\Login.tsx"
$remoteFile = "${remoteBase}/frontend/src/pages/Login/Login.tsx"
$remoteArg = "${vps}:${remoteFile}"
& $pscpPath -pw $password $localFile $remoteArg

# 2. Rebuild Frontend
Write-Host "Rebuilding Frontend on VPS (This may take a minute)..." -ForegroundColor Yellow
$cmd = "cd '/root/NEW START'; docker-compose up -d --build frontend"
& $plinkPath -batch -pw $password $vps $cmd

Write-Host "✅ New Login Screen Deployed Successfully!" -ForegroundColor Green
Write-Host "Check it at: http://148.230.107.155" -ForegroundColor Cyan
