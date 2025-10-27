#!/bin/sh
# Automated Database Backup - Runs every 5 minutes like Git auto-commit
# Saves only if database has changes

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="wms-database"
DB_NAME="warehouse_wms"
DB_USER="root"
DB_PASS="rootpassword"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate current backup
CURRENT_BACKUP="$BACKUP_DIR/temp_current.sql"
docker exec $CONTAINER_NAME mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $CURRENT_BACKUP 2>/dev/null

# Check if database has changes (compare with last backup)
LAST_BACKUP=$(ls -t $BACKUP_DIR/backup_*.sql 2>/dev/null | head -1)

if [ -f "$LAST_BACKUP" ]; then
    # Compare checksums
    CURRENT_MD5=$(md5sum $CURRENT_BACKUP | cut -d' ' -f1)
    LAST_MD5=$(md5sum $LAST_BACKUP | cut -d' ' -f1)
    
    if [ "$CURRENT_MD5" = "$LAST_MD5" ]; then
        echo "[$(date)] ⏭️  No database changes - skipping backup"
        rm $CURRENT_BACKUP
        exit 0
    fi
fi

# Database has changes - save backup
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
mv $CURRENT_BACKUP $BACKUP_FILE
gzip $BACKUP_FILE

echo "[$(date)] ✅ Database backup created: backup_$TIMESTAMP.sql.gz"

# Keep only last 100 backups (to prevent disk space issues)
ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +101 | xargs rm -f 2>/dev/null

# Show storage info
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
echo "[$(date)] 📊 Total backups: $BACKUP_COUNT | Storage: $TOTAL_SIZE"
