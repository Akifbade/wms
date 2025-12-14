# ============================================
# 🚨 CRITICAL: RUN THIS BEFORE ANY DATABASE CHANGES
# ============================================
# This script creates a quick backup before:
# - Running migrations
# - Modifying schema
# - Any risky database operations
# ============================================

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "C:\WMS_FULL_BACKUPS\quick"
$backupFile = "$backupDir\QUICK_BACKUP_$timestamp.sql"

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " 🚨 QUICK DATABASE BACKUP (BEFORE CHANGES)" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Create backup directory
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

Write-Host "Creating backup..." -ForegroundColor Cyan
docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction --routines --triggers warehouse_wms 2>$null > $backupFile

if ((Test-Path $backupFile) -and (Get-Item $backupFile).Length -gt 1000) {
    $size = [math]::Round((Get-Item $backupFile).Length / 1KB, 2)
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host " ✅ BACKUP CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Location: $backupFile" -ForegroundColor Cyan
    Write-Host "Size: $size KB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To restore if something goes wrong:" -ForegroundColor Yellow
    Write-Host "  Get-Content '$backupFile' | docker exec -i wms-database mysql -u wms_user -pwmspassword123 warehouse_wms" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Backup failed! DO NOT proceed with changes!" -ForegroundColor Red
    exit 1
}
