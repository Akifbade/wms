# Automated Backup Script for Windows

param(
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 30
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "🔄 Starting backup process..." -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp" -ForegroundColor White
Write-Host ""

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Backup database
Write-Host "📊 Backing up database..." -ForegroundColor Cyan
$dbBackupFile = Join-Path $BackupDir "database_$timestamp.sql"
docker exec wms-database mysqldump -u root -prootpassword warehouse_wms > $dbBackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database backup completed" -ForegroundColor Green
    
    # Compress backup
    Compress-Archive -Path $dbBackupFile -DestinationPath "$dbBackupFile.zip"
    Remove-Item $dbBackupFile
} else {
    Write-Host "❌ Database backup failed" -ForegroundColor Red
    exit 1
}

# Backup uploads
Write-Host "📁 Backing up uploads..." -ForegroundColor Cyan
if (Test-Path ".\backend\uploads") {
    $uploadsBackup = Join-Path $BackupDir "uploads_$timestamp.zip"
    Compress-Archive -Path ".\backend\uploads\*" -DestinationPath $uploadsBackup
    Write-Host "✅ Uploads backup completed" -ForegroundColor Green
}

# Backup environment file
Write-Host "⚙️  Backing up environment..." -ForegroundColor Cyan
Copy-Item ".env" -Destination (Join-Path $BackupDir "env_$timestamp.bak")

# Remove old backups
Write-Host "🧹 Cleaning old backups (older than $RetentionDays days)..." -ForegroundColor Cyan
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem $BackupDir | Where-Object { $_.CreationTime -lt $cutoffDate } | Remove-Item -Force

Write-Host ""
Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
Write-Host "📦 Backup location: $BackupDir" -ForegroundColor White
Get-ChildItem $BackupDir | Where-Object { $_.Name -like "*$timestamp*" } | Format-Table Name, Length, CreationTime
