# ==========================================
# PRODUCTION VPS FULL BACKUP SCRIPT
# ==========================================
# Downloads complete production environment:
# - MySQL database dump
# - SSL certificates
# - Application code
# - Docker volumes
# - Uploads directory
# - Configuration files
# - System information
# ==========================================

param(
    [string]$VPS_IP = "148.230.107.155",
    [string]$VPS_USER = "root"
)

# Create timestamped backup directory
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = "C:\Users\USER\Videos\PRODUCTION_BACKUP_$timestamp"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   PRODUCTION VPS FULL BACKUP" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "VPS: $VPS_IP" -ForegroundColor Yellow
Write-Host "User: $VPS_USER" -ForegroundColor Yellow
Write-Host "Backup Destination: $BackupPath" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory structure
New-Item -ItemType Directory -Path "$BackupPath\database" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\ssl" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\code" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\docker" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\uploads" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\configs" -Force | Out-Null

Write-Host "✓ Backup directories created" -ForegroundColor Green
Write-Host ""

# ==========================================
# STEP 1: BACKUP DATABASE
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 1: Backing up MySQL Database" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "Creating database dump on VPS..." -ForegroundColor Yellow

# Create SQL dump on VPS
ssh ${VPS_USER}@${VPS_IP} 'docker exec wms-database mysqldump -u root -prootpassword123 --single-transaction --routines --triggers --events warehouse_wms > /tmp/production_db_backup.sql'

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database dump created on VPS" -ForegroundColor Green
    
    # Download database dump
    Write-Host "Downloading database dump..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/production_db_backup.sql "$BackupPath\database\production_database.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database backup completed!" -ForegroundColor Green
        
        # Cleanup remote file
        ssh ${VPS_USER}@${VPS_IP} 'rm -f /tmp/production_db_backup.sql'
    } else {
        Write-Host "× Failed to download database" -ForegroundColor Red
    }
} else {
    Write-Host "× Failed to create database dump" -ForegroundColor Red
}

Write-Host ""

# ==========================================
# STEP 2: BACKUP SSL CERTIFICATES
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 2: Backing up SSL Certificates" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "Checking for SSL certificates..." -ForegroundColor Yellow

# Check if certbot/letsencrypt exists
$sslExists = ssh ${VPS_USER}@${VPS_IP} 'test -d /etc/letsencrypt && echo FOUND || echo NOT_FOUND'

if ($sslExists -match "FOUND") {
    Write-Host "✓ SSL certificates found" -ForegroundColor Green
    
    # Create tarball of SSL certs on VPS
    Write-Host "Creating SSL certificates archive..." -ForegroundColor Yellow
    ssh ${VPS_USER}@${VPS_IP} 'tar -czf /tmp/ssl_backup.tar.gz -C /etc letsencrypt 2>/dev/null || tar -czf /tmp/ssl_backup.tar.gz -C /etc ssl 2>/dev/null || true'
    
    # Download SSL backup
    Write-Host "Downloading SSL certificates..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/ssl_backup.tar.gz "$BackupPath\ssl\ssl_certificates.tar.gz"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SSL certificates backed up!" -ForegroundColor Green
        
        # Cleanup
        ssh ${VPS_USER}@${VPS_IP} 'rm -f /tmp/ssl_backup.tar.gz'
    }
} else {
    Write-Host "! No SSL certificates found (OK if using self-signed)" -ForegroundColor Yellow
}

Write-Host ""

# ==========================================
# STEP 3: BACKUP CODE
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 3: Backing up Application Code" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "Creating code archive on VPS..." -ForegroundColor Yellow

# Create tarball of entire project (excluding node_modules and large files)
ssh ${VPS_USER}@${VPS_IP} 'cd /root; tar -czf /tmp/production_code_backup.tar.gz --exclude=node_modules --exclude=*.log --exclude=.git --exclude=dist --exclude=DOCKER_BACKUP_* "NEW START"'

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Code archive created on VPS" -ForegroundColor Green
    
    # Download code backup
    Write-Host "Downloading code archive..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/production_code_backup.tar.gz "$BackupPath\code\production_code.tar.gz"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Code backup completed!" -ForegroundColor Green
        
        # Cleanup
        ssh ${VPS_USER}@${VPS_IP} 'rm -f /tmp/production_code_backup.tar.gz'
    }
}

Write-Host ""

# ==========================================
# STEP 4: BACKUP DOCKER VOLUMES
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 4: Backing up Docker Volumes" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "Getting list of Docker volumes..." -ForegroundColor Yellow

$volumes = ssh ${VPS_USER}@${VPS_IP} 'docker volume ls -q'

if ($volumes) {
    Write-Host "✓ Found Docker volumes" -ForegroundColor Green
    
    Write-Host "Creating Docker volumes backup..." -ForegroundColor Yellow
    
    # Backup all docker volumes
    ssh ${VPS_USER}@${VPS_IP} 'docker run --rm -v /var/lib/docker/volumes:/volumes -v /tmp:/backup alpine tar -czf /backup/docker_volumes_backup.tar.gz /volumes'
    
    # Download volumes backup
    Write-Host "Downloading Docker volumes..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/docker_volumes_backup.tar.gz "$BackupPath\docker\docker_volumes.tar.gz"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker volumes backed up!" -ForegroundColor Green
        
        # Cleanup
        ssh ${VPS_USER}@${VPS_IP} 'rm -f /tmp/docker_volumes_backup.tar.gz'
    }
} else {
    Write-Host "! No Docker volumes found" -ForegroundColor Yellow
}

Write-Host ""

# ==========================================
# STEP 5: BACKUP UPLOADS
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 5: Backing up Uploads Directory" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "Creating uploads archive..." -ForegroundColor Yellow

# Backup uploads directory
ssh ${VPS_USER}@${VPS_IP} 'cd "/root/NEW START"; tar -czf /tmp/uploads_backup.tar.gz backend/uploads 2>/dev/null || true'

# Download uploads backup
Write-Host "Downloading uploads..." -ForegroundColor Yellow
scp ${VPS_USER}@${VPS_IP}:/tmp/uploads_backup.tar.gz "$BackupPath\uploads\uploads.tar.gz"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Uploads backed up!" -ForegroundColor Green
    
    # Cleanup
    ssh ${VPS_USER}@${VPS_IP} 'rm -f /tmp/uploads_backup.tar.gz'
}

Write-Host ""

# ==========================================
# STEP 6: BACKUP CONFIGURATION FILES
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 6: Backing up Configuration Files" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "Downloading configuration files..." -ForegroundColor Yellow

# Download important config files
scp ${VPS_USER}@${VPS_IP}:"/root/NEW START/docker-compose.yml" "$BackupPath\configs\docker-compose.yml" 2>$null
scp ${VPS_USER}@${VPS_IP}:"/root/NEW START/docker-compose.staging.yml" "$BackupPath\configs\docker-compose.staging.yml" 2>$null
scp ${VPS_USER}@${VPS_IP}:"/root/NEW START/backend/.env" "$BackupPath\configs\backend.env" 2>$null
scp ${VPS_USER}@${VPS_IP}:"/root/NEW START/frontend/.env" "$BackupPath\configs\frontend.env" 2>$null
scp ${VPS_USER}@${VPS_IP}:"/root/NEW START/backend/prisma/schema.prisma" "$BackupPath\configs\schema.prisma" 2>$null

Write-Host "✓ Configuration files backed up!" -ForegroundColor Green
Write-Host ""

# ==========================================
# STEP 7: GATHER SYSTEM INFO
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 7: Gathering System Information" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

Write-Host "Gathering system info..." -ForegroundColor Yellow

# Get system info and save directly
$systemInfo = ssh ${VPS_USER}@${VPS_IP} 'echo "=== SYSTEM INFO ==="; uname -a; echo ""; echo "=== DOCKER VERSION ==="; docker --version; docker-compose --version 2>/dev/null || echo "not found"; echo ""; echo "=== DOCKER CONTAINERS ==="; docker ps -a; echo ""; echo "=== DOCKER IMAGES ==="; docker images; echo ""; echo "=== DISK USAGE ==="; df -h'

$systemInfo | Out-File -FilePath "$BackupPath\SYSTEM_INFO.txt" -Encoding UTF8

Write-Host "✓ System info gathered!" -ForegroundColor Green
Write-Host ""

# ==========================================
# STEP 8: CREATE BACKUP MANIFEST
# ==========================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " STEP 8: Creating Backup Manifest" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

# Calculate sizes
$dbSize = if (Test-Path "$BackupPath\database\production_database.sql") { [Math]::Round((Get-Item "$BackupPath\database\production_database.sql").Length / 1MB, 2) } else { 0 }
$codeSize = if (Test-Path "$BackupPath\code\production_code.tar.gz") { [Math]::Round((Get-Item "$BackupPath\code\production_code.tar.gz").Length / 1MB, 2) } else { 0 }
$sslSize = if (Test-Path "$BackupPath\ssl\ssl_certificates.tar.gz") { [Math]::Round((Get-Item "$BackupPath\ssl\ssl_certificates.tar.gz").Length / 1MB, 2) } else { 0 }
$dockerSize = if (Test-Path "$BackupPath\docker\docker_volumes.tar.gz") { [Math]::Round((Get-Item "$BackupPath\docker\docker_volumes.tar.gz").Length / 1MB, 2) } else { 0 }
$uploadsSize = if (Test-Path "$BackupPath\uploads\uploads.tar.gz") { [Math]::Round((Get-Item "$BackupPath\uploads\uploads.tar.gz").Length / 1MB, 2) } else { 0 }
$totalSize = $dbSize + $codeSize + $sslSize + $dockerSize + $uploadsSize

# Create manifest
$manifest = @"
========================================
PRODUCTION VPS FULL BACKUP MANIFEST
========================================
Backup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
VPS: ${VPS_IP}
Backup Location: ${BackupPath}

========================================
BACKUP CONTENTS
========================================

[DATABASE]
File: database/production_database.sql
Size: $dbSize MB
Description: Full MySQL dump of warehouse_wms database
Restore: docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms < production_database.sql

[SSL CERTIFICATES]
File: ssl/ssl_certificates.tar.gz
Size: $sslSize MB
Description: Complete SSL/TLS certificate bundle
Restore: tar -xzf ssl_certificates.tar.gz -C /etc

[APPLICATION CODE]
File: code/production_code.tar.gz
Size: $codeSize MB
Description: Complete 'NEW START' project folder
Excludes: node_modules, dist, .git, logs
Restore: tar -xzf production_code.tar.gz -C /root

[DOCKER VOLUMES]
File: docker/docker_volumes.tar.gz
Size: $dockerSize MB
Description: All Docker persistent volumes
Restore: tar -xzf docker_volumes.tar.gz -C /

[UPLOADS]
File: uploads/uploads.tar.gz
Size: $uploadsSize MB
Description: User-uploaded files
Restore: tar -xzf uploads.tar.gz -C /root/NEW_START

[CONFIGURATION FILES]
Directory: configs/
Files:
  - docker-compose.yml
  - docker-compose.staging.yml
  - backend.env
  - frontend.env
  - schema.prisma

========================================
TOTAL BACKUP SIZE: $totalSize MB
========================================

========================================
RESTORE INSTRUCTIONS
========================================

1. Upload backups to VPS:
   scp -r $BackupPath root@${VPS_IP}:/tmp/restore

2. Stop containers:
   ssh root@${VPS_IP}
   cd /root/NEW_START
   docker-compose down

3. Restore database:
   docker-compose up -d wms-database
   docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms < /tmp/restore/database/production_database.sql

4. Restore code (if needed):
   cd /root
   tar -xzf /tmp/restore/code/production_code.tar.gz

5. Restore SSL certs:
   tar -xzf /tmp/restore/ssl/ssl_certificates.tar.gz -C /etc

6. Restore uploads:
   cd /root/NEW_START
   tar -xzf /tmp/restore/uploads/uploads.tar.gz

7. Restart services:
   docker-compose up -d
   docker ps

========================================
BACKUP COMPLETE!
========================================
"@

$manifest | Out-File -FilePath "$BackupPath\BACKUP_MANIFEST.txt" -Encoding UTF8

Write-Host "✓ Backup manifest created!" -ForegroundColor Green
Write-Host ""

# ==========================================
# SUMMARY
# ==========================================
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "   BACKUP COMPLETE!" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $dbSize MB" -ForegroundColor Cyan
Write-Host "Code: $codeSize MB" -ForegroundColor Cyan
Write-Host "SSL: $sslSize MB" -ForegroundColor Cyan
Write-Host "Docker: $dockerSize MB" -ForegroundColor Cyan
Write-Host "Uploads: $uploadsSize MB" -ForegroundColor Cyan
Write-Host "-----------------------------" -ForegroundColor Gray
Write-Host "TOTAL: $totalSize MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backup saved to:" -ForegroundColor White
Write-Host "$BackupPath" -ForegroundColor Green
Write-Host ""
Write-Host "Read BACKUP_MANIFEST.txt for restore instructions." -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
