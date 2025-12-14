#!/bin/bash
set -e

# ==========================================
# VPS DEPLOYMENT SCRIPT
# ==========================================

echo "🚀 Starting VPS Deployment..."
cd "/root/NEW START"

# 1. BACKUP
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/root/backups/pre_deploy_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating Backup in $BACKUP_DIR..."

# Backup Database
if docker ps | grep -q wms-database; then
    echo "  - Backing up database..."
    docker exec wms-database mysqldump -u wms_user -pwmspassword123 --no-tablespaces warehouse_wms > "$BACKUP_DIR/db_backup.sql"
else
    echo "  ⚠️ Database container not running, skipping DB backup."
fi

# Backup Uploads
if [ -d "backend/uploads" ]; then
    echo "  - Backing up uploads..."
    cp -r backend/uploads "$BACKUP_DIR/uploads"
fi

# Backup Env
cp .env "$BACKUP_DIR/.env" || true

echo "✅ Backup Complete."

# 2. UPDATE CODE
echo "⬇️ Pulling latest code..."
git fetch origin stable/prisma-mysql-production
git reset --hard origin/stable/prisma-mysql-production

# 3. REBUILD & RESTART
echo "🏗️ Rebuilding Containers..."
# Ensure we are using the production compose file
docker-compose -f docker-compose-production.yml down --remove-orphans
docker-compose -f docker-compose-production.yml up -d --build

# 4. CLEANUP
echo "🧹 Cleaning up unused images..."
docker image prune -f

echo "✅ Deployment Success! System is live."
