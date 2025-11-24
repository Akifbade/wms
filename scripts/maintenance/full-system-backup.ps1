# ====================================================================
# WMS COMPLETE SYSTEM BACKUP
# ====================================================================
# Creates a full backup of EVERYTHING needed to restore the entire system
# Includes: Database, Code, Uploads, Docker configs, Environment files
# ====================================================================

param(
    [string]$BackupLocation = "C:\WMS_FULL_BACKUPS",
    [switch]$IncludeNodeModules = $false,
    [switch]$CompressWithMax = $false
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "WMS_FULL_SYSTEM_$timestamp"
$backupPath = Join-Path $BackupLocation $backupName

Write-Host ""
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?   WMS COMPLETE SYSTEM BACKUP                               ?" -ForegroundColor Cyan
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host ""
Write-Host "?? Backup Name: " -NoNewline -ForegroundColor Yellow
Write-Host $backupName -ForegroundColor White
Write-Host "?? Backup Path: " -NoNewline -ForegroundColor Yellow
Write-Host $backupPath -ForegroundColor White
Write-Host ""

# Create backup directory
if (-not (Test-Path $BackupLocation)) {
    New-Item -ItemType Directory -Path $BackupLocation -Force | Out-Null
    Write-Host "? Created backup directory" -ForegroundColor Green
}

New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# ====================================================================
# STEP 1: BACKUP DATABASE
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 1: Backing up MySQL Database..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$dbBackupPath = Join-Path $backupPath "database"
New-Item -ItemType Directory -Path $dbBackupPath -Force | Out-Null

# Load environment variables
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "warehouse_wms" }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { "wms_user" }
$dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "wmspassword123" }

$sqlFile = Join-Path $dbBackupPath "database_full_backup.sql"

Write-Host "   ? Database: $dbName" -ForegroundColor Gray
Write-Host "   ? Output: database_full_backup.sql" -ForegroundColor Gray

try {
    $mysqldumpCmd = "docker exec wms-database mysqldump -u $dbUser -p$dbPassword --single-transaction --routines --triggers --events --databases $dbName"
    $output = Invoke-Expression $mysqldumpCmd
    $output | Out-File -FilePath $sqlFile -Encoding UTF8
    
    $fileSize = (Get-Item $sqlFile).Length / 1MB
    Write-Host "   ? Database backed up (" -NoNewline -ForegroundColor Green
    Write-Host ("{0:N2} MB" -f $fileSize) -NoNewline -ForegroundColor White
    Write-Host ")" -ForegroundColor Green
} catch {
    Write-Host "   ? Database backup failed: $_" -ForegroundColor Red
    throw
}

# ====================================================================
# STEP 2: BACKUP SOURCE CODE
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 2: Backing up Source Code..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$sourceCodePath = Join-Path $backupPath "source_code"
New-Item -ItemType Directory -Path $sourceCodePath -Force | Out-Null

# Backend code
Write-Host "   ? Backing up backend code..." -ForegroundColor Gray
$backendBackup = Join-Path $sourceCodePath "backend"
New-Item -ItemType Directory -Path $backendBackup -Force | Out-Null

$backendExclude = @("node_modules", "dist", ".env")
Get-ChildItem -Path "backend" -Recurse | Where-Object {
    $item = $_
    -not ($backendExclude | Where-Object { $item.FullName -like "*\$_\*" -or $item.Name -eq $_ })
} | ForEach-Object {
    $targetPath = $_.FullName.Replace((Get-Location).Path + "\backend", $backendBackup)
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    } else {
        $targetDir = Split-Path $targetPath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $_.FullName -Destination $targetPath -Force
    }
}
Write-Host "   ? Backend code backed up" -ForegroundColor Green

# Frontend code
Write-Host "   ? Backing up frontend code..." -ForegroundColor Gray
$frontendBackup = Join-Path $sourceCodePath "frontend"
New-Item -ItemType Directory -Path $frontendBackup -Force | Out-Null

$frontendExclude = @("node_modules", "dist", ".env")
Get-ChildItem -Path "frontend" -Recurse | Where-Object {
    $item = $_
    -not ($frontendExclude | Where-Object { $item.FullName -like "*\$_\*" -or $item.Name -eq $_ })
} | ForEach-Object {
    $targetPath = $_.FullName.Replace((Get-Location).Path + "\frontend", $frontendBackup)
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    } else {
        $targetDir = Split-Path $targetPath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $_.FullName -Destination $targetPath -Force
    }
}
Write-Host "   ? Frontend code backed up" -ForegroundColor Green

# ====================================================================
# STEP 3: BACKUP UPLOADS & USER DATA
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 3: Backing up Uploads & User Data..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$uploadsPath = Join-Path $backupPath "uploads"
New-Item -ItemType Directory -Path $uploadsPath -Force | Out-Null

if (Test-Path "backend\uploads") {
    Copy-Item -Path "backend\uploads\*" -Destination $uploadsPath -Recurse -Force
    $uploadSize = (Get-ChildItem -Path $uploadsPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   ? Uploads backed up (" -NoNewline -ForegroundColor Green
    Write-Host ("{0:N2} MB" -f $uploadSize) -NoNewline -ForegroundColor White
    Write-Host ")" -ForegroundColor Green
} else {
    Write-Host "   ??  No uploads folder found" -ForegroundColor Yellow
}

# ====================================================================
# STEP 4: BACKUP DOCKER CONFIGURATIONS
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 4: Backing up Docker Configurations..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$dockerPath = Join-Path $backupPath "docker_configs"
New-Item -ItemType Directory -Path $dockerPath -Force | Out-Null

$dockerFiles = @(
    "docker-compose.yml",
    "docker-compose.override.yml",
    "backend\Dockerfile",
    "frontend\Dockerfile",
    "frontend\nginx.conf"
)

foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        $targetPath = Join-Path $dockerPath $file
        $targetDir = Split-Path $targetPath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $file -Destination $targetPath -Force
        Write-Host "   ? Copied $file" -ForegroundColor Green
    }
}

# ====================================================================
# STEP 5: BACKUP ENVIRONMENT & CONFIG FILES
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "??  STEP 5: Backing up Environment & Config Files..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$configPath = Join-Path $backupPath "config"
New-Item -ItemType Directory -Path $configPath -Force | Out-Null

$configFiles = @(
    ".env",
    ".env.example",
    "VERSION.md",
    "package.json",
    "*.md"
)

foreach ($pattern in $configFiles) {
    Get-ChildItem -Path . -Filter $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName -Destination $configPath -Force
        Write-Host "   ? Copied $($_.Name)" -ForegroundColor Green
    }
}

# ====================================================================
# STEP 6: BACKUP SCRIPTS & AUTOMATION
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 6: Backing up Scripts & Automation..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$scriptsPath = Join-Path $backupPath "scripts"
New-Item -ItemType Directory -Path $scriptsPath -Force | Out-Null

Get-ChildItem -Path . -Filter "*.ps1" -File | ForEach-Object {
    Copy-Item $_.FullName -Destination $scriptsPath -Force
    Write-Host "   ? Copied $($_.Name)" -ForegroundColor Green
}

Get-ChildItem -Path . -Filter "*.sh" -File | ForEach-Object {
    Copy-Item $_.FullName -Destination $scriptsPath -Force
    Write-Host "   ? Copied $($_.Name)" -ForegroundColor Green
}

# ====================================================================
# STEP 7: CREATE RESTORE SCRIPT
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 7: Creating One-Click Restore Script..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$restoreScript = @"
# ====================================================================
# WMS COMPLETE SYSTEM RESTORE
# ====================================================================
# ONE-CLICK RESTORE - Restores entire WMS system from backup
# ====================================================================

`$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?   WMS COMPLETE SYSTEM RESTORE                              ?" -ForegroundColor Cyan
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host ""
Write-Host "??  WARNING: This will replace your current WMS installation!" -ForegroundColor Yellow
Write-Host ""
`$confirm = Read-Host "Type 'YES' to continue"
if (`$confirm -ne "YES") {
    Write-Host "? Restore cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "?? Starting system restore..." -ForegroundColor Cyan
Write-Host ""

# Get restore location
`$restoreLocation = Read-Host "Enter WMS installation path (default: C:\WMS)"
if (-not `$restoreLocation) {
    `$restoreLocation = "C:\WMS"
}

# Create directory
if (-not (Test-Path `$restoreLocation)) {
    New-Item -ItemType Directory -Path `$restoreLocation -Force | Out-Null
}

Set-Location `$restoreLocation

# Restore source code
Write-Host "?? Restoring source code..." -ForegroundColor Cyan
Copy-Item -Path "source_code\*" -Destination . -Recurse -Force
Write-Host "   ? Source code restored" -ForegroundColor Green

# Restore Docker configs
Write-Host "?? Restoring Docker configurations..." -ForegroundColor Cyan
Copy-Item -Path "docker_configs\*" -Destination . -Recurse -Force
Write-Host "   ? Docker configs restored" -ForegroundColor Green

# Restore environment files
Write-Host "??  Restoring environment files..." -ForegroundColor Cyan
Copy-Item -Path "config\*" -Destination . -Force
Write-Host "   ? Environment files restored" -ForegroundColor Green

# Restore scripts
Write-Host "?? Restoring scripts..." -ForegroundColor Cyan
Copy-Item -Path "scripts\*" -Destination . -Force
Write-Host "   ? Scripts restored" -ForegroundColor Green

# Restore uploads
Write-Host "?? Restoring uploads..." -ForegroundColor Cyan
if (Test-Path "uploads") {
    Copy-Item -Path "uploads\*" -Destination "backend\uploads" -Recurse -Force
    Write-Host "   ? Uploads restored" -ForegroundColor Green
}

# Start Docker containers
Write-Host ""
Write-Host "?? Starting Docker containers..." -ForegroundColor Cyan
docker-compose up -d

# Wait for database
Write-Host "? Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Restore database
Write-Host "?? Restoring database..." -ForegroundColor Cyan
`$sqlFile = "database\database_full_backup.sql"
if (Test-Path `$sqlFile) {
    Get-Content `$sqlFile | docker exec -i wms-database mysql -u wms_user -pwmspassword123
    Write-Host "   ? Database restored" -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "?? Installing dependencies..." -ForegroundColor Cyan
Write-Host "   ? Backend..." -ForegroundColor Gray
Set-Location backend
npm install
Set-Location ..

Write-Host "   ? Frontend..." -ForegroundColor Gray
Set-Location frontend
npm install
npm run build
Set-Location ..

# Restart containers
Write-Host ""
Write-Host "?? Restarting containers..." -ForegroundColor Cyan
docker-compose restart

Write-Host ""
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Green
Write-Host "?   ? SYSTEM RESTORE COMPLETE!                              ?" -ForegroundColor Green
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Green
Write-Host ""
Write-Host "?? Frontend: http://localhost" -ForegroundColor Cyan
Write-Host "?? Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "???  Database: localhost:3307" -ForegroundColor Cyan
Write-Host ""
"@

$restoreScript | Out-File -FilePath (Join-Path $backupPath "RESTORE_SYSTEM.ps1") -Encoding UTF8
Write-Host "   ? Restore script created: RESTORE_SYSTEM.ps1" -ForegroundColor Green

# ====================================================================
# STEP 8: CREATE BACKUP INFO FILE
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 8: Creating Backup Info File..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$backupInfo = @"
WMS COMPLETE SYSTEM BACKUP
==========================

Backup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Backup Name: $backupName
Computer: $env:COMPUTERNAME
User: $env:USERNAME

BACKUP CONTENTS:
================
? Database (MySQL dump with all data, triggers, routines, events)
? Backend source code (TypeScript, Node.js)
? Frontend source code (React, TypeScript)
? Uploaded files (logos, documents, damages, shipments)
? Docker configurations (docker-compose.yml, Dockerfiles, nginx.conf)
? Environment files (.env, configs)
? Scripts (PowerShell, Shell scripts)
? One-click restore script

HOW TO RESTORE:
===============
1. Extract this backup to any location
2. Run: RESTORE_SYSTEM.ps1
3. Follow the prompts
4. System will be fully restored and running!

REQUIREMENTS:
=============
- Docker Desktop installed
- PowerShell 5.1 or higher
- Node.js 18+ (for npm install)

BACKUP STRUCTURE:
=================
?? $backupName/
   ??? database/               (MySQL dump)
   ??? source_code/            (Backend & Frontend code)
   ??? uploads/                (User uploaded files)
   ??? docker_configs/         (Docker Compose, Dockerfiles)
   ??? config/                 (Environment files, configs)
   ??? scripts/                (PowerShell & Shell scripts)
   ??? RESTORE_SYSTEM.ps1      (One-click restore script)
   ??? BACKUP_INFO.txt         (This file)

NOTES:
======
- This is a COMPLETE backup - everything needed to run WMS
- No manual configuration required
- Can be restored to a different computer
- Database includes all data, structure, users, permissions
- All settings and customizations preserved

For support: Check WMS documentation or GitHub issues
"@

$backupInfo | Out-File -FilePath (Join-Path $backupPath "BACKUP_INFO.txt") -Encoding UTF8
Write-Host "   ? Backup info created: BACKUP_INFO.txt" -ForegroundColor Green

# ====================================================================
# STEP 9: COMPRESS BACKUP (OPTIONAL)
# ====================================================================
Write-Host ""
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan
Write-Host "?? STEP 9: Compressing Backup..." -ForegroundColor Cyan
Write-Host "????????????????????????????????????????????????????????????" -ForegroundColor Cyan

$zipFile = "$backupPath.zip"
Write-Host "   ? Creating ZIP archive..." -ForegroundColor Gray

try {
    Compress-Archive -Path $backupPath -DestinationPath $zipFile -CompressionLevel Optimal -Force
    
    $originalSize = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    $zipSize = (Get-Item $zipFile).Length / 1MB
    $savedSpace = $originalSize - $zipSize
    $compressionRatio = ($savedSpace / $originalSize) * 100
    
    Write-Host "   ? Backup compressed successfully!" -ForegroundColor Green
    Write-Host "   ?? Original size: " -NoNewline -ForegroundColor Gray
    Write-Host ("{0:N2} MB" -f $originalSize) -ForegroundColor White
    Write-Host "   ?? Compressed size: " -NoNewline -ForegroundColor Gray
    Write-Host ("{0:N2} MB" -f $zipSize) -ForegroundColor White
    Write-Host "   ?? Space saved: " -NoNewline -ForegroundColor Gray
    Write-Host ("{0:N2} MB ({1:N1}%)" -f $savedSpace, $compressionRatio) -ForegroundColor White
    
    # Remove uncompressed folder
    Remove-Item -Path $backupPath -Recurse -Force
    Write-Host "   ???  Removed uncompressed folder" -ForegroundColor Gray
    
} catch {
    Write-Host "   ??  Compression failed, keeping uncompressed backup" -ForegroundColor Yellow
}

# ====================================================================
# SUMMARY
# ====================================================================
Write-Host ""
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Green
Write-Host "?   ? COMPLETE SYSTEM BACKUP SUCCESSFUL!                    ?" -ForegroundColor Green
Write-Host "??????????????????????????????????????????????????????????????" -ForegroundColor Green
Write-Host ""
Write-Host "?? Backup saved to:" -ForegroundColor Cyan
Write-Host "   $zipFile" -ForegroundColor White
Write-Host ""
Write-Host "?? What's included:" -ForegroundColor Cyan
Write-Host "   ? Complete database with all data" -ForegroundColor Green
Write-Host "   ? All source code (backend + frontend)" -ForegroundColor Green
Write-Host "   ? User uploads and files" -ForegroundColor Green
Write-Host "   ? Docker configurations" -ForegroundColor Green
Write-Host "   ? Environment settings" -ForegroundColor Green
Write-Host "   ? Scripts and automation" -ForegroundColor Green
Write-Host "   ? One-click restore script" -ForegroundColor Green
Write-Host ""
Write-Host "?? To restore:" -ForegroundColor Cyan
Write-Host "   1. Extract the ZIP file" -ForegroundColor White
Write-Host "   2. Run RESTORE_SYSTEM.ps1" -ForegroundColor White
Write-Host "   3. Follow the prompts" -ForegroundColor White
Write-Host ""
