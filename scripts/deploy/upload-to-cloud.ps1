#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Upload WMS backups to cloud storage for extra safety
    
.DESCRIPTION
    Uploads backup files to Google Drive, OneDrive, or Dropbox
    Requires rclone (https://rclone.org/)
    
.PARAMETER BackupFile
    Path to backup file to upload (if not specified, uploads latest backup)
    
.PARAMETER CloudProvider
    Cloud provider: gdrive, onedrive, dropbox
    
.EXAMPLE
    .\upload-to-cloud.ps1 -CloudProvider gdrive
    .\upload-to-cloud.ps1 -BackupFile "C:\WMS_BACKUPS\backup.zip" -CloudProvider onedrive
#>

param(
    [string]$BackupFile,
    [Parameter(Mandatory=$true)]
    [ValidateSet('gdrive', 'onedrive', 'dropbox')]
    [string]$CloudProvider
)

# Check if rclone is installed
$rcloneInstalled = Get-Command rclone -ErrorAction SilentlyContinue

if (-not $rcloneInstalled) {
    Write-Host ""
    Write-Host "❌ rclone is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To use cloud backup, install rclone:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Using winget:" -ForegroundColor Cyan
    Write-Host "   winget install Rclone.Rclone" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Using Chocolatey:" -ForegroundColor Cyan
    Write-Host "   choco install rclone" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3 - Manual download:" -ForegroundColor Cyan
    Write-Host "   https://rclone.org/downloads/" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, configure your cloud provider:" -ForegroundColor Yellow
    Write-Host "   rclone config" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Get backup file
if (-not $BackupFile) {
    $BackupRootDir = "C:\WMS_BACKUPS"
    
    if (-not (Test-Path $BackupRootDir)) {
        Write-Host "❌ No backups found in $BackupRootDir" -ForegroundColor Red
        exit 1
    }
    
    $latestBackup = Get-ChildItem -Path $BackupRootDir -Filter "WMS_BACKUP_*.zip" | 
                    Sort-Object LastWriteTime -Descending | 
                    Select-Object -First 1
    
    if (-not $latestBackup) {
        Write-Host "❌ No backup files found" -ForegroundColor Red
        exit 1
    }
    
    $BackupFile = $latestBackup.FullName
    Write-Host "📦 Using latest backup: $($latestBackup.Name)" -ForegroundColor Cyan
}

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

$fileName = Split-Path $BackupFile -Leaf
$fileSize = (Get-Item $BackupFile).Length / 1MB

Write-Host ""
Write-Host "☁️  Uploading to $CloudProvider..." -ForegroundColor Cyan
Write-Host "   File: $fileName"
Write-Host "   Size: $([math]::Round($fileSize, 2)) MB"
Write-Host ""

# Upload to cloud
$remotePath = "${CloudProvider}:WMS_Backups/$fileName"

try {
    rclone copy $BackupFile "$remotePath" --progress
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Backup uploaded successfully to $CloudProvider!" -ForegroundColor Green
        Write-Host ""
    } else {
        throw "Upload failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Upload failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure rclone is configured:" -ForegroundColor Yellow
    Write-Host "   rclone config" -ForegroundColor White
    Write-Host ""
    exit 1
}
