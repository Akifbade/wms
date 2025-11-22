# ============================================================
# EMERGENCY BACKUP - VPS SSH DOWN
# ============================================================
# Use this when SSH is not accessible due to high CPU/crash
# ============================================================

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\WMS_EMERGENCY_BACKUP_$timestamp"
$VPS_IP = "148.230.107.155"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   EMERGENCY VPS BACKUP PROCEDURE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "📦 Backup directory created: $backupDir" -ForegroundColor Green
Write-Host ""

# Check SSH connectivity
Write-Host "🔍 Checking SSH connectivity..." -ForegroundColor Yellow
$sshTest = Test-NetConnection -ComputerName $VPS_IP -Port 22 -WarningAction SilentlyContinue
if (-not $sshTest.TcpTestSucceeded) {
    Write-Host "❌ SSH PORT 22 IS NOT ACCESSIBLE" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️ IMMEDIATE ACTIONS REQUIRED:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTION 1: CREATE VPS SNAPSHOT (RECOMMENDED)" -ForegroundColor Cyan
    Write-Host "  1. Go to your VPS hosting provider dashboard" -ForegroundColor White
    Write-Host "  2. Find 'Snapshots' or 'Backups' section" -ForegroundColor White
    Write-Host "  3. Click 'Create Snapshot' or 'Take Backup'" -ForegroundColor White
    Write-Host "  4. Wait for snapshot to complete (5-15 minutes)" -ForegroundColor White
    Write-Host "  ✅ This captures EVERYTHING (database, files, configs)" -ForegroundColor Green
    Write-Host ""
    Write-Host "OPTION 2: USE WEB CONSOLE TO CREATE BACKUP" -ForegroundColor Cyan
    Write-Host "  1. Access VPS Web Console (not SSH)" -ForegroundColor White
    Write-Host "  2. Login and run these commands:" -ForegroundColor White
    Write-Host "     docker exec wms-database mysqldump -u root -prootpassword123 \\" -ForegroundColor Gray
    Write-Host "       --single-transaction warehouse_wms > /root/emergency_backup.sql" -ForegroundColor Gray
    Write-Host "     tar -czf /root/uploads_backup.tar.gz /root/'NEW START'/backend/uploads" -ForegroundColor Gray
    Write-Host "  3. Once SSH is back, download these files" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 3: REBOOT VPS FIRST" -ForegroundColor Cyan
    Write-Host "  1. Go to VPS dashboard" -ForegroundColor White
    Write-Host "  2. Click 'Reboot' or 'Restart'" -ForegroundColor White
    Write-Host "  3. Wait 3-5 minutes" -ForegroundColor White
    Write-Host "  4. Run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ SSH is accessible - proceeding with backup..." -ForegroundColor Green
Write-Host ""

# If SSH works, do the backup
Write-Host "1️⃣ Creating database backup on VPS..." -ForegroundColor Cyan
ssh root@$VPS_IP "docker exec wms-database mysqldump -u root -prootpassword123 --single-transaction --routines --triggers warehouse_wms > /tmp/emergency_backup.sql 2>&1 && echo 'Backup created successfully'"

Write-Host ""
Write-Host "2️⃣ Downloading database backup..." -ForegroundColor Cyan
scp root@${VPS_IP}:/tmp/emergency_backup.sql "$backupDir\production_database.sql"

Write-Host ""
Write-Host "3️⃣ Downloading uploads folder..." -ForegroundColor Cyan
scp -r root@${VPS_IP}:"/root/NEW START/backend/uploads" "$backupDir\uploads"

Write-Host ""
Write-Host "4️⃣ Downloading docker-compose files..." -ForegroundColor Cyan
scp root@${VPS_IP}:"/root/NEW START/docker-compose*.yml" "$backupDir\"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup contains:" -ForegroundColor Yellow
Write-Host "  - Production database" -ForegroundColor Green
Write-Host "  - All uploaded files" -ForegroundColor Green
Write-Host "  - Docker configurations" -ForegroundColor Green
Write-Host ""
