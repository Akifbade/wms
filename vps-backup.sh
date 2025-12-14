#!/bin/bash

# ========================================
# VPS FULL BACKUP SCRIPT
# ========================================
# This script creates a complete backup of the WMS system
# Database + Files + Docker Configs + Uploads

BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/root/wms-backups/backup_${BACKUP_DATE}"
PROJECT_DIR="/root/NEW START"

echo "============================================="
echo "VPS FULL SYSTEM BACKUP - ${BACKUP_DATE}"
echo "============================================="

# Create backup directory
mkdir -p "${BACKUP_DIR}"
cd "${BACKUP_DIR}"

echo ""
echo "📁 Step 1: Creating directory structure..."
mkdir -p database
mkdir -p uploads
mkdir -p configs
mkdir -p docker
mkdir -p code

echo ""
echo "💾 Step 2: Backing up MySQL Database..."
# Get database credentials from docker-compose
DB_NAME="warehouse_wms"
DB_USER="root"
DB_PASS="rootpassword123"
DB_CONTAINER="wms-database"

# Backup using mysqldump from container
docker exec ${DB_CONTAINER} mysqldump -u${DB_USER} -p${DB_PASS} ${DB_NAME} > database/${DB_NAME}_${BACKUP_DATE}.sql

if [ $? -eq 0 ]; then
    echo "✅ Database backup created: ${DB_NAME}_${BACKUP_DATE}.sql"
    # Compress database backup
    gzip database/${DB_NAME}_${BACKUP_DATE}.sql
    echo "✅ Database backup compressed"
else
    echo "❌ Database backup failed!"
    exit 1
fi

echo ""
echo "📂 Step 3: Backing up Uploads & Files..."
# Copy all uploads from backend container or volume
docker cp wms-backend:/app/uploads ./uploads/
if [ $? -eq 0 ]; then
    echo "✅ Uploads backed up"
else
    echo "⚠️  Uploads backup failed or empty"
fi

# Copy public files
docker cp wms-backend:/app/public ./uploads/public 2>/dev/null || true

echo ""
echo "⚙️  Step 4: Backing up Docker configurations..."
cd ${PROJECT_DIR}
cp docker-compose*.yml ${BACKUP_DIR}/docker/
cp .env ${BACKUP_DIR}/docker/.env 2>/dev/null || true
cp -r config ${BACKUP_DIR}/configs/ 2>/dev/null || true

echo "✅ Docker configs backed up"

echo ""
echo "🔧 Step 5: Backing up project code..."
cd ${PROJECT_DIR}
# Exclude node_modules and build artifacts
tar -czf ${BACKUP_DIR}/code/wms-code_${BACKUP_DATE}.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='uploads' \
    backend/ frontend/ scripts/ database/ docs/ 2>/dev/null || true

echo "✅ Project code backed up"

echo ""
echo "📊 Step 6: Backing up Docker volumes..."
docker volume ls | grep wms > ${BACKUP_DIR}/docker/volumes_list.txt
echo "✅ Docker volumes list saved"

echo ""
echo "📝 Step 7: Creating backup manifest..."
cat > ${BACKUP_DIR}/BACKUP_INFO.txt << EOF
========================================
WMS BACKUP INFORMATION
========================================
Backup Date: ${BACKUP_DATE}
Server: VPS
Project Directory: ${PROJECT_DIR}

CONTENTS:
- database/${DB_NAME}_${BACKUP_DATE}.sql.gz
- uploads/ (all uploaded files)
- docker/ (docker-compose files and .env)
- configs/ (nginx and other configs)
- code/wms-code_${BACKUP_DATE}.tar.gz

DOCKER CONTAINERS STATUS:
$(docker ps --filter name=wms)

DISK USAGE:
$(du -sh ${BACKUP_DIR})

========================================
EOF

echo "✅ Backup manifest created"

echo ""
echo "🗜️  Step 8: Creating final compressed archive..."
cd /root/wms-backups
tar -czf "wms_full_backup_${BACKUP_DATE}.tar.gz" "backup_${BACKUP_DATE}/"
ARCHIVE_SIZE=$(du -sh "wms_full_backup_${BACKUP_DATE}.tar.gz" | cut -f1)

echo "✅ Final archive created: wms_full_backup_${BACKUP_DATE}.tar.gz"
echo "📦 Archive size: ${ARCHIVE_SIZE}"

echo ""
echo "🧹 Step 9: Cleaning up temporary files..."
rm -rf "backup_${BACKUP_DATE}"
echo "✅ Cleanup complete"

echo ""
echo "============================================="
echo "✅ BACKUP COMPLETED SUCCESSFULLY!"
echo "============================================="
echo "📦 Backup file: /root/wms-backups/wms_full_backup_${BACKUP_DATE}.tar.gz"
echo "📊 Size: ${ARCHIVE_SIZE}"
echo ""
echo "To download this backup to your local machine, run:"
echo "scp root@your-vps-ip:/root/wms-backups/wms_full_backup_${BACKUP_DATE}.tar.gz ."
echo "============================================="
