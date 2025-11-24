#!/bin/bash
# Automated MySQL Database Backup Script
# Runs daily backups and keeps last 7 days

BACKUP_DIR="/root/database-backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="wms-database"
DB_NAME="warehouse_wms"
DB_USER="root"
DB_PASS="rootpassword"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
echo "🔄 Creating backup: $DATE"
docker exec $CONTAINER_NAME mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql
echo "✅ Backup created: backup_$DATE.sql.gz"

# Delete backups older than 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
echo "🗑️ Old backups cleaned (keeping last 7 days)"

# Show backup size
du -h $BACKUP_DIR/backup_$DATE.sql.gz
