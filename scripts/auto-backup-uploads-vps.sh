#!/bin/bash
# AUTO BACKUP UPLOADS SCRIPT FOR VPS
# Runs every hour via crontab
# Add to crontab: 0 * * * * /root/NEW\ START/scripts/auto-backup-uploads-vps.sh

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_DIR="/root/WMS_UPLOAD_BACKUPS"
UPLOADS_PATH="/root/NEW START/backend/uploads"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
cd "$UPLOADS_PATH"
tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" .

# Keep only last 48 backups (2 days)
cd "$BACKUP_DIR"
ls -t uploads_backup_*.tar.gz 2>/dev/null | tail -n +49 | xargs -r rm -f

echo "Backup created: $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"

# Also sync to docker volume as extra safety
docker exec wms-backend cp -r /app/uploads /app/uploads_backup_$TIMESTAMP 2>/dev/null || true
