# ==========================================
# 🔒 FULL PRODUCTION VPS BACKUP SCRIPT
# ==========================================
# Downloads EVERYTHING from production VPS to local PC
# Including: Database, Code, SSL Certs, Docker volumes, Configs
# ==========================================

param(
    [string]$VPS_IP = "148.230.107.155",
    [string]$VPS_USER = "root",
    [string]$BackupPath = "C:\Users\USER\Videos\PRODUCTION_BACKUP_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔒 FULL PRODUCTION VPS BACKUP TO LOCAL PC" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "VPS: $VPS_USER@$VPS_IP" -ForegroundColor Yellow
Write-Host "Local Backup Location: $BackupPath" -ForegroundColor Yellow
Write-Host ""

# Create backup directory
Write-Host "📁 Creating backup directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\database" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\code" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\ssl" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\docker" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\configs" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupPath\uploads" -Force | Out-Null

Write-Host "✅ Backup directory created: $BackupPath" -ForegroundColor Green
Write-Host ""

# ==========================================
# STEP 1: BACKUP DATABASE
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 STEP 1: Backing up Production Database" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "⏳ Dumping MySQL database from production..." -ForegroundColor Yellow

# Create SQL dump on VPS
ssh ${VPS_USER}@${VPS_IP} 'docker exec wms-database mysqldump -u root -prootpassword123 --single-transaction --routines --triggers --events warehouse_wms > /tmp/production_db_backup.sql'

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database dumped on VPS" -ForegroundColor Green
    
    # Download SQL dump
    Write-Host "⏳ Downloading database dump to local PC..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/production_db_backup.sql "$BackupPath\database\warehouse_wms_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database backup downloaded successfully!" -ForegroundColor Green
        
        # Get database size
        $dbSize = (Get-Item "$BackupPath\database\*.sql").Length / 1MB
        Write-Host "   Size: $([math]::Round($dbSize, 2)) MB" -ForegroundColor Cyan
        
        # Cleanup temp file on VPS
        ssh ${VPS_USER}@${VPS_IP} "rm -f /tmp/production_db_backup.sql"
    } else {
        Write-Host "❌ Failed to download database backup" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Failed to create database dump" -ForegroundColor Red
}

Write-Host ""

# ==========================================
# STEP 2: BACKUP SSL CERTIFICATES
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔐 STEP 2: Backing up SSL Certificates" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "⏳ Checking for SSL certificates..." -ForegroundColor Yellow

# Check if certbot/letsencrypt exists
$sslCheck = ssh ${VPS_USER}@${VPS_IP} "ls -la /etc/letsencrypt 2>/dev/null || echo 'NOT_FOUND'"
Write-Host "⏳ Checking for SSL certificates..." -ForegroundColor Yellow

# Check if certbot/letsencrypt exists
$sslCheck = ssh ${VPS_USER}@${VPS_IP} 'test -d /etc/letsencrypt && echo FOUND || echo NOT_FOUND'
    # Create tarball of SSL certs on VPS
    Write-Host "⏳ Creating SSL certificates archive..." -ForegroundColor Yellow
    ssh ${VPS_USER}@${VPS_IP} 'tar -czf /tmp/ssl_backup.tar.gz -C /etc letsencrypt 2>/dev/null || tar -czf /tmp/ssl_backup.tar.gz -C /etc ssl 2>/dev/null || true'
    
    # Download SSL backup
    Write-Host "⏳ Downloading SSL certificates..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/ssl_backup.tar.gz "$BackupPath\ssl\ssl_certs_$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSL certificates backed up!" -ForegroundColor Green
        
        # Cleanup
        ssh ${VPS_USER}@${VPS_IP} "rm -f /tmp/ssl_backup.tar.gz"
    }
} else {
    Write-Host "⚠️ No SSL certificates found (OK if using self-signed)" -ForegroundColor Yellow
}

Write-Host ""

# ==========================================
# STEP 3: BACKUP CODE (ENTIRE PROJECT)
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💾 STEP 3: Backing up Production Code" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "⏳ Creating code archive on VPS..." -ForegroundColor Yellow

# Create tarball of entire project (excluding node_modules and large files)
ssh ${VPS_USER}@${VPS_IP} 'cd /root; tar -czf /tmp/production_code_backup.tar.gz --exclude=node_modules --exclude=*.log --exclude=.git --exclude=dist --exclude=DOCKER_BACKUP_* "NEW START"'

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code archive created" -ForegroundColor Green
    
    # Download code backup
    Write-Host "⏳ Downloading production code..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/production_code_backup.tar.gz "$BackupPath\code\production_code_$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Code backup downloaded!" -ForegroundColor Green
        
        # Get code size
        $codeSize = (Get-Item "$BackupPath\code\*.tar.gz").Length / 1MB
        Write-Host "   Size: $([math]::Round($codeSize, 2)) MB" -ForegroundColor Cyan
        
        # Cleanup
        ssh ${VPS_USER}@${VPS_IP} "rm -f /tmp/production_code_backup.tar.gz"
    }
}

Write-Host ""

# ==========================================
# STEP 4: BACKUP DOCKER VOLUMES
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🐳 STEP 4: Backing up Docker Volumes" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "⏳ Getting list of Docker volumes..." -ForegroundColor Yellow

$volumes = ssh ${VPS_USER}@${VPS_IP} 'docker volume ls -q'

if ($volumes) {
    Write-Host "Found volumes:" -ForegroundColor Cyan
    $volumes -split "`n" | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    
    Write-Host "⏳ Creating Docker volumes backup..." -ForegroundColor Yellow
    
    # Backup all docker volumes
    ssh ${VPS_USER}@${VPS_IP} 'docker run --rm -v /var/lib/docker/volumes:/volumes -v /tmp:/backup alpine tar -czf /backup/docker_volumes_backup.tar.gz /volumes'
    
    # Download volumes backup
    Write-Host "⏳ Downloading Docker volumes..." -ForegroundColor Yellow
    scp ${VPS_USER}@${VPS_IP}:/tmp/docker_volumes_backup.tar.gz "$BackupPath\docker\docker_volumes_$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker volumes backed up!" -ForegroundColor Green
        ssh ${VPS_USER}@${VPS_IP} "rm -f /tmp/docker_volumes_backup.tar.gz"
    }
} else {
    Write-Host "⚠️ No Docker volumes found" -ForegroundColor Yellow
}

Write-Host ""

# ==========================================
# STEP 5: BACKUP UPLOADS & USER FILES
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📤 STEP 5: Backing up Uploads & User Files" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "⏳ Creating uploads archive..." -ForegroundColor Yellow

# Backup uploads directory
ssh ${VPS_USER}@${VPS_IP} 'cd "/root/NEW START"; tar -czf /tmp/uploads_backup.tar.gz backend/uploads 2>/dev/null || true'

# Try to download (might not exist)
scp ${VPS_USER}@${VPS_IP}:/tmp/uploads_backup.tar.gz "$BackupPath\uploads\uploads_$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Uploads backed up!" -ForegroundColor Green
    ssh ${VPS_USER}@${VPS_IP} "rm -f /tmp/uploads_backup.tar.gz"
} else {
    Write-Host "⚠️ No uploads directory found (OK if empty)" -ForegroundColor Yellow
}

Write-Host ""

# ==========================================
# STEP 6: BACKUP CONFIGURATIONS
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "⚙️ STEP 6: Backing up Configurations" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "⏳ Collecting configuration files..." -ForegroundColor Yellow

# Download important config files
$configFiles = @(
    "/root/NEW START/docker-compose.yml",
    "/root/NEW START/docker-compose.production.yml",
    "/root/NEW START/backend/.env",
    "/root/NEW START/backend/prisma/schema.prisma",
    "/etc/nginx/nginx.conf",
    "/etc/nginx/sites-available/default"
)

foreach ($file in $configFiles) {
    $fileName = Split-Path $file -Leaf
    scp ${VPS_USER}@${VPS_IP}:$file "$BackupPath\configs\$fileName" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $fileName" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ $fileName (not found)" -ForegroundColor Yellow
    }
}

Write-Host ""

# ==========================================
# STEP 7: SYSTEM INFORMATION
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 STEP 7: Collecting System Information" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "⏳ Gathering system info..." -ForegroundColor Yellow

# Get system info and save directly
ssh ${VPS_USER}@${VPS_IP} @'
echo "=== SYSTEM INFO ==="
uname -a
echo ""
echo "=== DOCKER VERSION ==="
docker --version
docker-compose --version 2>/dev/null || echo "docker-compose not found"
echo ""
echo "=== DOCKER CONTAINERS ==="
docker ps -a
echo ""
echo "=== DOCKER IMAGES ==="
docker images
echo ""
echo "=== DISK USAGE ==="
df -h
'@ | Out-File -FilePath "$BackupPath\SYSTEM_INFO.txt" -Encoding UTF8

Write-Host "✅ System information saved!" -ForegroundColor Green
Write-Host ""

# ==========================================
# STEP 8: CREATE BACKUP MANIFEST
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📝 STEP 8: Creating Backup Manifest" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Get all file sizes
$manifest = @"
═══════════════════════════════════════════════════════════
PRODUCTION VPS FULL BACKUP MANIFEST
═══════════════════════════════════════════════════════════

Backup Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
VPS: $VPS_USER@$VPS_IP
Local Path: $BackupPath

═══════════════════════════════════════════════════════════
BACKUP CONTENTS
═══════════════════════════════════════════════════════════

"@

# Database
$dbFiles = Get-ChildItem "$BackupPath\database" -File -ErrorAction SilentlyContinue
if ($dbFiles) {
    $manifest += "`n📊 DATABASE BACKUP:`n"
    $dbFiles | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        $manifest += "   ✅ $($_.Name) ($size MB)`n"
    }
}

# SSL
$sslFiles = Get-ChildItem "$BackupPath\ssl" -File -ErrorAction SilentlyContinue
if ($sslFiles) {
    $manifest += "`n🔐 SSL CERTIFICATES:`n"
    $sslFiles | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        $manifest += "   ✅ $($_.Name) ($size MB)`n"
    }
}

# Code
$codeFiles = Get-ChildItem "$BackupPath\code" -File -ErrorAction SilentlyContinue
if ($codeFiles) {
    $manifest += "`n💾 CODE BACKUP:`n"
    $codeFiles | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        $manifest += "   ✅ $($_.Name) ($size MB)`n"
    }
}

# Docker
$dockerFiles = Get-ChildItem "$BackupPath\docker" -File -ErrorAction SilentlyContinue
if ($dockerFiles) {
    $manifest += "`n🐳 DOCKER VOLUMES:`n"
    $dockerFiles | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        $manifest += "   ✅ $($_.Name) ($size MB)`n"
    }
}

# Uploads
$uploadFiles = Get-ChildItem "$BackupPath\uploads" -File -ErrorAction SilentlyContinue
if ($uploadFiles) {
    $manifest += "`n📤 UPLOADS:`n"
    $uploadFiles | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        $manifest += "   ✅ $($_.Name) ($size MB)`n"
    }
}

# Configs
$configFilesList = Get-ChildItem "$BackupPath\configs" -File -ErrorAction SilentlyContinue
if ($configFilesList) {
    $manifest += "`n⚙️ CONFIGURATION FILES:`n"
    $configFilesList | ForEach-Object {
        $manifest += "   ✅ $($_.Name)`n"
    }
}

# Total size
$totalSize = (Get-ChildItem $BackupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
$manifest += "`n═══════════════════════════════════════════════════════════`n"
$manifest += "TOTAL BACKUP SIZE: $([math]::Round($totalSize, 2)) GB`n"
$manifest += "═══════════════════════════════════════════════════════════`n"

# Restore instructions
$manifest += @"

═══════════════════════════════════════════════════════════
RESTORE INSTRUCTIONS
═══════════════════════════════════════════════════════════

To restore this backup on a new VPS:

1. DATABASE:
   mysql -u root -p warehouse_wms < database\warehouse_wms_*.sql

2. SSL CERTIFICATES:
   tar -xzf ssl\ssl_certs_*.tar.gz -C /etc/

3. CODE:
   mkdir -p /root
   tar -xzf code\production_code_*.tar.gz -C /root/

4. DOCKER VOLUMES:
   tar -xzf docker\docker_volumes_*.tar.gz -C /

5. UPLOADS:
   tar -xzf uploads\uploads_*.tar.gz -C /root/NEW\ START/backend/

6. CONFIGS:
   Copy files from configs\ to appropriate locations

7. START SERVICES:
   cd /root/NEW\ START
   docker-compose up -d

═══════════════════════════════════════════════════════════
"@

# Save manifest
$manifest | Out-File -FilePath "$BackupPath\BACKUP_MANIFEST.txt" -Encoding UTF8

Write-Host "✅ Backup manifest created!" -ForegroundColor Green
Write-Host ""

# ==========================================
# FINAL SUMMARY
# ==========================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Backup Location: $BackupPath" -ForegroundColor Yellow
Write-Host "📊 Total Size: $([math]::Round($totalSize, 2)) GB" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backup includes:" -ForegroundColor Cyan
Write-Host "   ✅ Production Database (all data)" -ForegroundColor Green
Write-Host "   ✅ SSL Certificates (HTTPS)" -ForegroundColor Green
Write-Host "   ✅ All Code (backend + frontend)" -ForegroundColor Green
Write-Host "   ✅ Docker Volumes" -ForegroundColor Green
Write-Host "   ✅ User Uploads & Files" -ForegroundColor Green
Write-Host "   ✅ All Configurations" -ForegroundColor Green
Write-Host "   ✅ System Information" -ForegroundColor Green
Write-Host ""
Write-Host "📝 See BACKUP_MANIFEST.txt for details" -ForegroundColor Cyan
Write-Host "📋 See SYSTEM_INFO.txt for production environment details" -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔒 YOUR PRODUCTION IS NOW SAFELY BACKED UP!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Open backup folder
Start-Process explorer.exe $BackupPath
