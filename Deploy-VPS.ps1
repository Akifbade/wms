# ========================================
# VPS BACKUP & SYNC - WINDOWS POWERSHELL
# ========================================
# Use this script from Windows with PuTTY/SSH

param(
    [string]$VpsIp = "148.230.107.155",
    [string]$VpsUser = "root",
    [string]$VpsPassword = "Qgocargo@123",
    [string]$Action = "backup"  # backup, sync, or full
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🚀 WMS VPS DEPLOYMENT TOOL" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Test if plink (PuTTY) is available
$plinkPath = "plink.exe"
$pscpPath = "pscp.exe"

if (-not (Get-Command $plinkPath -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PuTTY (plink.exe) not found in PATH" -ForegroundColor Red
    Write-Host "Please install PuTTY or add it to your PATH" -ForegroundColor Yellow
    exit 1
}

$VpsHost = "${VpsUser}@${VpsIp}"

Write-Host ""
Write-Host "🔌 Testing VPS connection..." -ForegroundColor Yellow

# Create plink command with password
$plinkCmd = "echo y | plink -pw `"$VpsPassword`" $VpsHost `"echo 'Connection successful'`""
Invoke-Expression $plinkCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cannot connect to VPS" -ForegroundColor Red
    Write-Host "Check VPS IP, username, and password" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ VPS connection verified" -ForegroundColor Green

if ($Action -eq "backup" -or $Action -eq "full") {
    Write-Host ""
    Write-Host "💾 Step 1: Creating full backup on VPS..." -ForegroundColor Yellow
    
    # Upload backup script using pscp with password
    & $pscpPath -pw "$VpsPassword" "vps-backup.sh" "${VpsHost}:/root/"
    
    # Execute backup
    & $plinkPath -pw "$VpsPassword" $VpsHost "chmod +x /root/vps-backup.sh && /root/vps-backup.sh"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup completed successfully" -ForegroundColor Green
        
        # Get latest backup filename
        $backupFile = & $plinkPath -pw "$VpsPassword" $VpsHost "ls -t /root/wms-backups/wms_full_backup_*.tar.gz | head -1"
        
        Write-Host ""
        Write-Host "📥 Downloading backup to local machine..." -ForegroundColor Yellow
        $localBackupDir = ".\vps-backups"
        if (-not (Test-Path $localBackupDir)) {
            New-Item -ItemType Directory -Path $localBackupDir | Out-Null
        }
        
        & $pscpPath -pw "$VpsPassword" "${VpsHost}:${backupFile}" "$localBackupDir\"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Backup downloaded to: $localBackupDir" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Could not download backup (it's still on VPS)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[ERROR] Backup failed" -ForegroundColor Red
        exit 1
    }
}

if ($Action -eq "sync" -or $Action -eq "full") {
    Write-Host ""
    Write-Host "🛑 Step 2: Stopping containers on VPS..." -ForegroundColor Yellow
    & $plinkPath -pw "$VpsPassword" $VpsHost "cd '/root/NEW START' && docker-compose down"
    Write-Host "✅ Containers stopped" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📤 Step 3: Syncing backend files..." -ForegroundColor Yellow
    & $pscpPath -pw "$VpsPassword" -r "backend\src" "${VpsHost}:/root/NEW START/backend/"
    & $pscpPath -pw "$VpsPassword" -r "backend\prisma" "${VpsHost}:/root/NEW START/backend/"
    & $pscpPath -pw "$VpsPassword" "backend\package.json" "${VpsHost}:/root/NEW START/backend/"
    & $pscpPath -pw "$VpsPassword" "backend\tsconfig.json" "${VpsHost}:/root/NEW START/backend/"
    & $pscpPath -pw "$VpsPassword" "backend\Dockerfile" "${VpsHost}:/root/NEW START/backend/"
    Write-Host "✅ Backend synced" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📤 Step 4: Syncing frontend files..." -ForegroundColor Yellow
    & $pscpPath -pw "$VpsPassword" -r "frontend\src" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" -r "frontend\public" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" "frontend\package.json" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" "frontend\vite.config.ts" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" "frontend\tsconfig*.json" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" "frontend\index.html" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" "frontend\Dockerfile" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" "frontend\nginx.conf" "${VpsHost}:/root/NEW START/frontend/"
    & $pscpPath -pw "$VpsPassword" "frontend\docker-entrypoint.sh" "${VpsHost}:/root/NEW START/frontend/"
    Write-Host "✅ Frontend synced" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🐳 Step 5: Syncing Docker configs..." -ForegroundColor Yellow
    & $pscpPath -pw "$VpsPassword" "docker-compose*.yml" "${VpsHost}:/root/NEW START/"
    & $pscpPath -pw "$VpsPassword" -r "config" "${VpsHost}:/root/NEW START/"
    Write-Host "✅ Docker configs synced" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🏗️  Step 6: Rebuilding containers..." -ForegroundColor Yellow
    & $plinkPath -pw "$VpsPassword" $VpsHost "cd '/root/NEW START' && docker-compose build"
    
    Write-Host ""
    Write-Host "🚀 Step 7: Starting containers..." -ForegroundColor Yellow
    & $plinkPath -pw "$VpsPassword" $VpsHost "cd '/root/NEW START' && docker-compose up -d"
    
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "📊 Step 8: Checking deployment status..." -ForegroundColor Yellow
    & $plinkPath -pw "$VpsPassword" $VpsHost "cd '/root/NEW START' && docker-compose ps"
    
    Write-Host ""
    Write-Host "[INFO] Backend logs (last 20 lines):" -ForegroundColor Yellow
    & $plinkPath -pw "$VpsPassword" $VpsHost "cd '/root/NEW START' && docker-compose logs --tail=20 backend"
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] OPERATION COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[WEB] Your WMS is now running on VPS: https://qgocargo.cloud" -ForegroundColor White
Write-Host "[WEB] Direct IP access: http://$VpsIp" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:    plink -pw $VpsPassword $VpsHost 'cd ""/root/NEW START"" && docker-compose logs -f'" -ForegroundColor White
Write-Host "  Restart:      plink -pw $VpsPassword $VpsHost 'cd ""/root/NEW START"" && docker-compose restart'" -ForegroundColor White
Write-Host "  Stop:         plink -pw $VpsPassword $VpsHost 'cd ""/root/NEW START"" && docker-compose down'" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Cyan
