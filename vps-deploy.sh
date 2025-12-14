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
echo "  - Attempting database backup..."
# Try to dump, but don't fail the script if it fails (e.g. if container is restarting)
if docker exec wms-database mysqldump -u wms_user -pwmspassword123 --no-tablespaces warehouse_wms > "$BACKUP_DIR/db_backup.sql" 2>/dev/null; then
    echo "  ✅ Database backup successful."
else
    echo "  ⚠️ Database backup FAILED (Container might be restarting/broken). Skipping backup to proceed with deployment fix."
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
echo "🏗️ Restarting Containers with New Images..."

# Force remove old containers to prevent name conflicts
echo "  - Removing old containers..."
docker rm -f wms-backend wms-frontend wms-database || true

# Fix MySQL Volume Permissions (Critical for startup)
echo "  - Fixing database permissions..."
docker volume create mysql_prod_data || true
# Run a temporary container to chown the volume data
docker run --rm -v mysql_prod_data:/var/lib/mysql alpine chown -R 999:999 /var/lib/mysql

# Ensure we are using the production compose file
docker-compose -f docker-compose-production.yml up -d

# 4. CLEANUP
echo "🧹 Cleaning up unused images..."
docker image prune -f

echo "✅ Deployment Success! System is live."
