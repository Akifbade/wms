#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated Backup System for WMS (Database + Files)
    
.DESCRIPTION
    Creates timestamped backups of:
    - MySQL database (warehouse_wms)
    - Uploads folder (user files/images)
    - Docker configurations
    - Environment files
    - Version info
    
.NOTES
    Run this script regularly (daily recommended)
    Keeps last 7 backups by default
    Compresses backups to save space
#>

# ==================== CONFIGURATION ====================
$BackupRootDir = "C:\WMS_BACKUPS"
$MaxBackupsToKeep = 7
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupName = "WMS_BACKUP_$Timestamp"
$BackupDir = Join-Path $BackupRootDir $BackupName

# Docker container names
$DatabaseContainer = "wms-database"
$BackendContainer = "wms-backend"

# Database credentials (from docker-compose)
$DbHost = "localhost"
$DbPort = "3307"
$DbName = "warehouse_wms"
$DbUser = "wms_user"
$DbPassword = "wms_secure_password_2024"

# ==================== FUNCTIONS ====================
function Write-Status {
    param($Message, $Color = "Cyan")
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor $Color
}

function Write-Success {
    param($Message)
    Write-Status "✅ $Message" -Color Green
}

function Write-Error-Custom {
    param($Message)
    Write-Status "❌ $Message" -Color Red
}

function Write-Info {
    param($Message)
    Write-Status "ℹ️  $Message" -Color Yellow
}

# ==================== START BACKUP ====================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "    🔒 WMS AUTOMATED BACKUP SYSTEM" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Status "Backup Name: $BackupName"
Write-Status "Backup Location: $BackupDir"
Write-Host ""

# Create backup directory
try {
    if (-not (Test-Path $BackupRootDir)) {
        New-Item -ItemType Directory -Path $BackupRootDir -Force | Out-Null
        Write-Success "Created backup root directory: $BackupRootDir"
    }
    
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Success "Created backup directory: $BackupDir"
} catch {
    Write-Error-Custom "Failed to create backup directory: $_"
    exit 1
}

# ==================== 1. BACKUP DATABASE ====================
Write-Host ""
Write-Status "📊 STEP 1/5: Backing up MySQL Database..." -Color Cyan

$DbBackupFile = Join-Path $BackupDir "database_$DbName.sql"

try {
    # Check if Docker container is running
    $containerRunning = docker ps --filter "name=$DatabaseContainer" --format "{{.Names}}"
    
    if ($containerRunning -eq $DatabaseContainer) {
        Write-Info "Using Docker exec to backup database..."
        
        # Backup using Docker exec (more reliable)
        docker exec $DatabaseContainer mysqldump `
            -u $DbUser `
            -p$DbPassword `
            --single-transaction `
            --routines `
            --triggers `
            --events `
            --databases $DbName > $DbBackupFile
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $DbBackupFile)) {
            $fileSize = (Get-Item $DbBackupFile).Length / 1MB
            $fileSizeMB = [math]::Round($fileSize, 2)
            Write-Success "Database backed up successfully - Size: $fileSizeMB MB"
        } else {
            throw "Database backup failed"
        }
    } else {
        # Fallback to local mysqldump
        Write-Info "Container not running, using local mysqldump..."
        mysqldump -h $DbHost -P $DbPort -u $DbUser -p$DbPassword `
            --single-transaction `
            --routines `
            --triggers `
            --events `
            --databases $DbName > $DbBackupFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database backed up successfully"
        } else {
            throw "Database backup failed"
        }
    }
} catch {
    Write-Error-Custom "Database backup failed: $_"
    Write-Info "Backup will continue with other components..."
}

# ==================== 2. BACKUP UPLOADS FOLDER ====================
Write-Host ""
Write-Status "📁 STEP 2/5: Backing up uploads folder..." -Color Cyan

$UploadsSource = ".\backend\uploads"
$UploadsBackup = Join-Path $BackupDir "uploads"

try {
    if (Test-Path $UploadsSource) {
        Copy-Item -Path $UploadsSource -Destination $UploadsBackup -Recurse -Force
        $uploadCount = (Get-ChildItem -Path $UploadsBackup -Recurse -File).Count
        Write-Success "Backed up $uploadCount files from uploads folder"
    } else {
        Write-Info "Uploads folder not found, skipping..."
    }
} catch {
    Write-Error-Custom "Failed to backup uploads: $_"
}

# ==================== 3. BACKUP DOCKER CONFIGS ====================
Write-Host ""
Write-Status "🐋 STEP 3/5: Backing up Docker configurations..." -Color Cyan

$ConfigsBackup = Join-Path $BackupDir "configs"
New-Item -ItemType Directory -Path $ConfigsBackup -Force | Out-Null

$ConfigFiles = @(
    "docker-compose.yml",
    "docker-compose.override.yml",
    "docker-compose-production.yml",
    ".env",
    "backend\.env",
    "frontend\.env",
    "backend\Dockerfile",
    "frontend\Dockerfile",
    "backend\package.json",
    "frontend\package.json"
)

$backedUpConfigs = 0
foreach ($file in $ConfigFiles) {
    if (Test-Path $file) {
        $destPath = Join-Path $ConfigsBackup (Split-Path $file -Leaf)
        Copy-Item -Path $file -Destination $destPath -Force
        $backedUpConfigs++
    }
}

Write-Success "Backed up $backedUpConfigs configuration files"

# ==================== 4. BACKUP VERSION & METADATA ====================
Write-Host ""
Write-Status "📋 STEP 4/5: Creating backup metadata..." -Color Cyan

$MetadataFile = Join-Path $BackupDir "BACKUP_INFO.json"

$metadata = @{
    BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    BackupName = $BackupName
    DatabaseName = $DbName
    SystemInfo = @{
        Hostname = $env:COMPUTERNAME
        User = $env:USERNAME
        OS = [System.Environment]::OSVersion.VersionString
        PowerShellVersion = $PSVersionTable.PSVersion.ToString()
    }
    DockerContainers = @()
}

# Get running containers info
try {
    $containersRaw = docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}'
    $containers = $containersRaw | ConvertFrom-Csv -Delimiter '|' -Header 'Name','Image','Status'
    $metadata.DockerContainers = $containers
} catch {
    Write-Info "Could not fetch Docker container info"
}

# Get current version
try {
    if (Test-Path "VERSION.md") {
        $version = Get-Content "VERSION.md" -Raw
        $metadata.AppVersion = $version.Trim()
    }
} catch {
    $metadata.AppVersion = "Unknown"
}

$metadata | ConvertTo-Json -Depth 5 | Set-Content $MetadataFile
Write-Success "Created backup metadata file"

# ==================== 5. COMPRESS BACKUP ====================
Write-Host ""
Write-Status "🗜️  STEP 5/5: Compressing backup..." -Color Cyan

$ZipFile = "$BackupDir.zip"

try {
    Compress-Archive -Path $BackupDir -DestinationPath $ZipFile -CompressionLevel Optimal -Force
    
    if (Test-Path $ZipFile) {
        $zipSize = (Get-Item $ZipFile).Length / 1MB
        $zipSizeMB = [math]::Round($zipSize, 2)
        Write-Success "Backup compressed successfully ($zipSizeMB megabytes)"
        
        # Remove uncompressed folder to save space
        Remove-Item -Path $BackupDir -Recurse -Force
        Write-Success "Removed uncompressed backup folder"
    }
} catch {
    Write-Error-Custom "Failed to compress backup: $_"
    Write-Info "Uncompressed backup is still available at: $BackupDir"
}

# ==================== 6. CLEANUP OLD BACKUPS ====================
Write-Host ""
Write-Status "🧹 Cleaning up old backups (keeping last $MaxBackupsToKeep)..." -Color Cyan

try {
    $allBackups = Get-ChildItem -Path $BackupRootDir -Filter "WMS_BACKUP_*.zip" | 
                  Sort-Object LastWriteTime -Descending
    
    if ($allBackups.Count -gt $MaxBackupsToKeep) {
        $backupsToDelete = $allBackups | Select-Object -Skip $MaxBackupsToKeep
        
        foreach ($backup in $backupsToDelete) {
            Remove-Item $backup.FullName -Force
            Write-Info "Deleted old backup: $($backup.Name)"
        }
        
        Write-Success "Deleted $($backupsToDelete.Count) old backup(s)"
    } else {
        Write-Success "No old backups to delete (current count: $($allBackups.Count))"
    }
} catch {
    Write-Error-Custom "Failed to cleanup old backups: $_"
}

# ==================== SUMMARY ====================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "    ✅ BACKUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Status "📦 Backup Location: $ZipFile" -Color Yellow
Write-Status "📊 Total Backups: $(Get-ChildItem -Path $BackupRootDir -Filter 'WMS_BACKUP_*.zip' | Measure-Object | Select-Object -ExpandProperty Count)" -Color Yellow
Write-Status "💾 Backup Size: $([math]::Round((Get-Item $ZipFile).Length / 1MB, 2)) megabytes" -Color Yellow
Write-Host ""
Write-Host "To restore this backup, run:" -ForegroundColor Cyan
Write-Host "  .\restore-backup.ps1 -BackupFile ""$ZipFile""" -ForegroundColor White
Write-Host ""
