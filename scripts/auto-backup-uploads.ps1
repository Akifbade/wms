# AUTO BACKUP UPLOADS SCRIPT
# This script runs every hour to backup uploads folder
# Deploy this to VPS and add to crontab

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\WMS_UPLOAD_BACKUPS"
$uploadsPath = "C:\Users\USER\Videos\NEW START\backend\uploads"

# Create backup directory if not exists
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Create backup
$backupFile = "$backupDir\uploads_backup_$timestamp.zip"
Compress-Archive -Path "$uploadsPath\*" -DestinationPath $backupFile -Force

# Keep only last 48 backups (2 days worth of hourly backups)
Get-ChildItem $backupDir -Filter "uploads_backup_*.zip" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -Skip 48 | 
    Remove-Item -Force

Write-Host "Backup created: $backupFile"
