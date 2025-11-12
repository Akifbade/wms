#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Restore WMS from backup (Database + Files)
    
.DESCRIPTION
    Restores your WMS system from a backup created by auto-backup-system.ps1
    Can be used on local machine or VPS for disaster recovery
    
.PARAMETER BackupFile
    Path to the backup ZIP file to restore from
    
.PARAMETER SkipDatabase
    Skip database restoration (restore only files)
    
.PARAMETER SkipFiles
    Skip file restoration (restore only database)
    
.EXAMPLE
    .\restore-backup.ps1 -BackupFile "C:\WMS_BACKUPS\WMS_BACKUP_2025-11-12_02-00-00.zip"
    .\restore-backup.ps1 -BackupFile ".\backup.zip" -SkipDatabase
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [switch]$SkipDatabase,
    [switch]$SkipFiles,
    [switch]$Force
)

# ==================== CONFIGURATION ====================
$DatabaseContainer = "wms-database"
$BackendContainer = "wms-backend"
$FrontendContainer = "wms-frontend"

# Database credentials
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

function Write-Warning-Custom {
    param($Message)
    Write-Status "⚠️  $Message" -Color Yellow
}

# ==================== VALIDATION ====================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
Write-Host "    🔄 WMS BACKUP RESTORATION" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
Write-Host ""

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Error-Custom "Backup file not found: $BackupFile"
    exit 1
}

Write-Status "Backup File: $BackupFile"
Write-Status "File Size: $([math]::Round((Get-Item $BackupFile).Length / 1MB, 2)) MB"
Write-Host ""

# Warning
if (-not $Force) {
    Write-Warning-Custom "⚠️  WARNING: This will OVERWRITE your current data!"
    Write-Host ""
    Write-Host "What will be restored:" -ForegroundColor Yellow
    if (-not $SkipDatabase) { Write-Host "   ✓ Database (all tables will be replaced)" }
    if (-not $SkipFiles) { Write-Host "   ✓ Uploaded files (images, documents)" }
    Write-Host ""
    
    $confirm = Read-Host "Are you sure you want to continue? Type 'YES' to proceed"
    
    if ($confirm -ne 'YES') {
        Write-Error-Custom "Restoration cancelled"
        exit 0
    }
}

# ==================== EXTRACT BACKUP ====================
Write-Host ""
Write-Status "📦 Extracting backup..." -Color Cyan

$TempDir = Join-Path $env:TEMP "WMS_RESTORE_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

try {
    Expand-Archive -Path $BackupFile -DestinationPath $TempDir -Force
    Write-Success "Backup extracted to temporary location"
    
    # Find the actual backup folder (it's nested inside)
    $BackupFolder = Get-ChildItem -Path $TempDir -Directory | Select-Object -First 1
    
    if (-not $BackupFolder) {
        throw "Could not find backup contents"
    }
    
    $BackupPath = $BackupFolder.FullName
    Write-Status "Backup contents: $BackupPath"
    
} catch {
    Write-Error-Custom "Failed to extract backup: $_"
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# ==================== SHOW BACKUP INFO ====================
$MetadataFile = Join-Path $BackupPath "BACKUP_INFO.json"

if (Test-Path $MetadataFile) {
    Write-Host ""
    Write-Status "📋 Backup Information:" -Color Cyan
    
    try {
        $metadata = Get-Content $MetadataFile -Raw | ConvertFrom-Json
        Write-Host "   Created: $($metadata.BackupDate)"
        Write-Host "   Version: $($metadata.AppVersion)"
        Write-Host "   From: $($metadata.SystemInfo.Hostname) ($($metadata.SystemInfo.User))"
    } catch {
        Write-Warning-Custom "Could not read backup metadata"
    }
}

# ==================== RESTORE DATABASE ====================
if (-not $SkipDatabase) {
    Write-Host ""
    Write-Status "🗄️  RESTORING DATABASE..." -Color Cyan
    
    $DbBackupFile = Join-Path $BackupPath "database_$DbName.sql"
    
    if (-not (Test-Path $DbBackupFile)) {
        Write-Warning-Custom "Database backup file not found, skipping database restore"
    } else {
        try {
            # Check if Docker container is running
            $containerRunning = docker ps --filter "name=$DatabaseContainer" --format "{{.Names}}"
            
            if ($containerRunning -eq $DatabaseContainer) {
                Write-Status "Using Docker to restore database..."
                
                # Copy SQL file into container
                docker cp $DbBackupFile "${DatabaseContainer}:/tmp/restore.sql"
                
                # Restore database
                docker exec $DatabaseContainer mysql -u root -prootpassword -e "DROP DATABASE IF EXISTS $DbName; CREATE DATABASE $DbName;"
                docker exec $DatabaseContainer mysql -u root -prootpassword $DbName -e "source /tmp/restore.sql"
                
                # Cleanup
                docker exec $DatabaseContainer rm /tmp/restore.sql
                
                Write-Success "Database restored successfully!"
                
                # Restart backend to clear connections
                Write-Status "Restarting backend container..."
                docker-compose restart backend 2>&1 | Out-Null
                Start-Sleep -Seconds 3
                
            } else {
                # Fallback to local mysql
                Write-Status "Restoring database using local mysql..."
                mysql -h $DbHost -P $DbPort -u root -prootpassword -e "DROP DATABASE IF EXISTS $DbName; CREATE DATABASE $DbName;"
                mysql -h $DbHost -P $DbPort -u root -prootpassword $DbName < $DbBackupFile
            }
            
            Write-Success "Database restoration complete!"
            
        } catch {
            Write-Error-Custom "Database restoration failed: $_"
            Write-Warning-Custom "You may need to restore manually using the SQL file at: $DbBackupFile"
        }
    }
}

# ==================== RESTORE UPLOADS ====================
if (-not $SkipFiles) {
    Write-Host ""
    Write-Status "📁 RESTORING UPLOADS FOLDER..." -Color Cyan
    
    $UploadsBackup = Join-Path $BackupPath "uploads"
    $UploadsDestination = ".\backend\uploads"
    
    if (-not (Test-Path $UploadsBackup)) {
        Write-Warning-Custom "Uploads backup not found, skipping file restore"
    } else {
        try {
            # Backup current uploads (just in case)
            if (Test-Path $UploadsDestination) {
                $UploadsBackupOld = ".\backend\uploads_OLD_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
                Move-Item -Path $UploadsDestination -Destination $UploadsBackupOld -Force
                Write-Status "Old uploads backed up to: $UploadsBackupOld"
            }
            
            # Copy restored uploads
            Copy-Item -Path $UploadsBackup -Destination $UploadsDestination -Recurse -Force
            
            $uploadCount = (Get-ChildItem -Path $UploadsDestination -Recurse -File).Count
            Write-Success "Restored $uploadCount files to uploads folder"
            
        } catch {
            Write-Error-Custom "File restoration failed: $_"
        }
    }
}

# ==================== RESTORE CONFIGS (Optional) ====================
$ConfigsBackup = Join-Path $BackupPath "configs"

if (Test-Path $ConfigsBackup) {
    Write-Host ""
    Write-Status "⚙️  Configuration files found in backup" -Color Cyan
    $restoreConfigs = Read-Host "Do you want to restore configuration files? (y/n)"
    
    if ($restoreConfigs -eq 'y') {
        try {
            $configFiles = Get-ChildItem -Path $ConfigsBackup -File
            
            foreach ($file in $configFiles) {
                $destPath = Join-Path "." $file.Name
                Copy-Item -Path $file.FullName -Destination $destPath -Force
                Write-Status "Restored: $($file.Name)"
            }
            
            Write-Success "Configuration files restored"
            Write-Warning-Custom "You may need to restart Docker containers for config changes to take effect"
            
        } catch {
            Write-Error-Custom "Failed to restore configs: $_"
        }
    }
}

# ==================== CLEANUP ====================
Write-Host ""
Write-Status "🧹 Cleaning up temporary files..." -Color Cyan

try {
    Remove-Item -Path $TempDir -Recurse -Force
    Write-Success "Temporary files removed"
} catch {
    Write-Warning-Custom "Could not remove temp files: $TempDir"
}

# ==================== VERIFY RESTORATION ====================
Write-Host ""
Write-Status "🔍 Verifying restoration..." -Color Cyan

try {
    $containerRunning = docker ps --filter "name=$DatabaseContainer" --format "{{.Names}}"
    
    if ($containerRunning -eq $DatabaseContainer) {
        # Test database connection
        $testQuery = docker exec $DatabaseContainer mysql -u $DbUser -p$DbPassword $DbName -e "SELECT COUNT(*) as count FROM users;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database is accessible and responding"
        } else {
            Write-Warning-Custom "Could not verify database restoration"
        }
    }
    
    # Check backend API
    Start-Sleep -Seconds 2
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 200) {
        Write-Success "Backend API is responding"
    }
    
} catch {
    Write-Warning-Custom "Could not verify all services"
}

# ==================== SUMMARY ====================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "    ✅ RESTORATION COMPLETED!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test your application: http://localhost" -ForegroundColor White
Write-Host "   2. Login with your credentials" -ForegroundColor White
Write-Host "   3. Verify all data is present" -ForegroundColor White
Write-Host ""
Write-Host "If you encounter issues:" -ForegroundColor Yellow
Write-Host "   • Restart all containers: docker-compose restart" -ForegroundColor White
Write-Host "   • Check logs: docker-compose logs backend" -ForegroundColor White
Write-Host "   • SQL file location: $DbBackupFile" -ForegroundColor White
Write-Host ""
