# ============================================
# 🛡️ SAFE MIGRATION SCRIPT
# ============================================
# Use this instead of direct prisma migrate commands
# It automatically creates backup before migrating
# ============================================

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "C:\WMS_FULL_BACKUPS\pre-migration"
$backupFile = "$backupDir\PRE_MIGRATION_$timestamp.sql"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " 🛡️ SAFE PRISMA MIGRATION WITH AUTO-BACKUP" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create backup
Write-Host "[1/3] Creating pre-migration backup..." -ForegroundColor Yellow

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction --routines --triggers warehouse_wms 2>$null > $backupFile

if (-not (Test-Path $backupFile) -or (Get-Item $backupFile).Length -lt 1000) {
    Write-Host "❌ Backup failed! Aborting migration." -ForegroundColor Red
    exit 1
}

$size = [math]::Round((Get-Item $backupFile).Length / 1KB, 2)
Write-Host "      ✅ Backup created: $size KB" -ForegroundColor Green
Write-Host "      Location: $backupFile" -ForegroundColor Gray
Write-Host ""

# Step 2: Run migration
Write-Host "[2/3] Running Prisma migrations..." -ForegroundColor Yellow
$result = docker exec wms-backend npx prisma migrate deploy 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "      ✅ Migrations applied successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Step 3: Verify
    Write-Host "[3/3] Verifying database..." -ForegroundColor Yellow
    $tables = docker exec wms-database mysql -u wms_user -pwmspassword123 warehouse_wms -e "SHOW TABLES" 2>$null | Measure-Object -Line
    Write-Host "      ✅ Database has $($tables.Lines) tables" -ForegroundColor Green
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host " ✅ MIGRATION COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    
    # Remove this backup since migration was successful
    # Keep pre-migration backups for 24 hours only
    Get-ChildItem $backupDir -Filter "PRE_MIGRATION_*.sql" | 
        Where-Object { $_.CreationTime -lt (Get-Date).AddHours(-24) } | 
        Remove-Item -Force
        
} else {
    Write-Host "      ❌ Migration FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host " 🔄 TO RESTORE DATABASE:" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this command:" -ForegroundColor Cyan
    Write-Host "Get-Content '$backupFile' | docker exec -i wms-database mysql -u wms_user -pwmspassword123 warehouse_wms" -ForegroundColor White
    Write-Host ""
    exit 1
}
