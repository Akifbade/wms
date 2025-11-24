#!/bin/bash
# 🔄 AUTO-BACKUP SETUP SCRIPT FOR WMS PRODUCTION
# Run this ONCE on VPS to setup automatic backups every 5 minutes

set -e

echo "🛡️ Setting up WMS Database Auto-Backup System..."

# Create backup directory
echo "📁 Creating backup directory..."
mkdir -p /root/wms-backups
mkdir -p /root/volume-backups

# Create backup script
echo "📝 Creating backup script..."
cat > /root/backup-wms-db.sh << 'EOF'
#!/bin/bash
# WMS Database Backup Script
# Runs every 5 minutes via cron

BACKUP_DIR="/root/wms-backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="wms-database"
DB_NAME="warehouse_wms"
DB_USER="root"
DB_PASS="Qgocargo@123"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Backup MySQL database
echo "[$(date)] Creating backup: wms_backup_$DATE.sql"
docker exec $CONTAINER mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > "$BACKUP_DIR/wms_backup_$DATE.sql" 2>/dev/null

# Compress backup
gzip "$BACKUP_DIR/wms_backup_$DATE.sql"

# Check if backup successful
if [ -f "$BACKUP_DIR/wms_backup_$DATE.sql.gz" ]; then
    SIZE=$(du -h "$BACKUP_DIR/wms_backup_$DATE.sql.gz" | cut -f1)
    echo "[$(date)] ✅ Backup successful: wms_backup_$DATE.sql.gz ($SIZE)"
else
    echo "[$(date)] ❌ Backup failed!"
    exit 1
fi

# Keep only last 100 backups (auto-delete old ones)
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/wms_backup_*.sql.gz 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt 100 ]; then
    echo "[$(date)] Cleaning old backups (keeping last 100)..."
    ls -t $BACKUP_DIR/wms_backup_*.sql.gz | tail -n +101 | xargs -r rm
fi

echo "[$(date)] Total backups: $(ls -1 $BACKUP_DIR/wms_backup_*.sql.gz | wc -l)"
EOF

chmod +x /root/backup-wms-db.sh

# Test backup manually
echo "🧪 Testing backup script..."
/root/backup-wms-db.sh

# Setup cron job for every 5 minutes
echo "⏰ Setting up cron job (every 5 minutes)..."
(crontab -l 2>/dev/null | grep -v "backup-wms-db.sh"; echo "*/5 * * * * /root/backup-wms-db.sh >> /root/backup.log 2>&1") | crontab -

# Create daily volume backup cron (at 2 AM)
echo "💾 Setting up daily volume backup (2 AM)..."
cat > /root/backup-volume.sh << 'EOF'
#!/bin/bash
# Daily Volume Backup Script

BACKUP_DIR="/root/volume-backups"
DATE=$(date +%Y%m%d)
VOLUME="newstart_mysql-data"

mkdir -p $BACKUP_DIR

echo "[$(date)] Creating volume backup..."

# Backup volume without stopping containers
docker run --rm \
  -v $VOLUME:/data:ro \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/mysql-volume-$DATE.tar.gz /data

if [ -f "$BACKUP_DIR/mysql-volume-$DATE.tar.gz" ]; then
    SIZE=$(du -h "$BACKUP_DIR/mysql-volume-$DATE.tar.gz" | cut -f1)
    echo "[$(date)] ✅ Volume backup successful: mysql-volume-$DATE.tar.gz ($SIZE)"
else
    echo "[$(date)] ❌ Volume backup failed!"
    exit 1
fi

# Keep only last 7 daily volume backups
ls -t $BACKUP_DIR/mysql-volume-*.tar.gz | tail -n +8 | xargs -r rm

echo "[$(date)] Total volume backups: $(ls -1 $BACKUP_DIR/mysql-volume-*.tar.gz | wc -l)"
EOF

chmod +x /root/backup-volume.sh

# Add volume backup to cron (daily at 2 AM)
(crontab -l 2>/dev/null | grep -v "backup-volume.sh"; echo "0 2 * * * /root/backup-volume.sh >> /root/backup.log 2>&1") | crontab -

# Create restore script
echo "🔄 Creating restore script..."
cat > /root/restore-wms-db.sh << 'EOF'
#!/bin/bash
# WMS Database Restore Script

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /root/wms-backups/wms_backup_*.sql.gz | tail -10
    exit 1
fi

BACKUP_FILE="$1"
DB_NAME="warehouse_wms"
DB_USER="root"
DB_PASS="Qgocargo@123"
CONTAINER="wms-database"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will restore database from backup!"
echo "📁 Backup file: $BACKUP_FILE"
echo "🗄️  Database: $DB_NAME"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled."
    exit 0
fi

echo "🔄 Restoring database..."

# Decompress and restore
gunzip -c "$BACKUP_FILE" | docker exec -i $CONTAINER mysql -u $DB_USER -p$DB_PASS $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    echo "🔍 Verifying data..."
    docker exec $CONTAINER mysql -u $DB_USER -p$DB_PASS -e "SELECT COUNT(*) as user_count FROM $DB_NAME.User;"
else
    echo "❌ Restore failed!"
    exit 1
fi
EOF

chmod +x /root/restore-wms-db.sh

# Create backup health check script
echo "📊 Creating backup health check..."
cat > /root/check-backups.sh << 'EOF'
#!/bin/bash
# Backup Health Check Script

echo "📊 WMS Backup Health Status"
echo "============================"
echo ""

# SQL Backups
echo "🗄️  SQL Backups:"
BACKUP_COUNT=$(ls -1 /root/wms-backups/wms_backup_*.sql.gz 2>/dev/null | wc -l)
echo "   Total backups: $BACKUP_COUNT"

if [ $BACKUP_COUNT -gt 0 ]; then
    LATEST=$(ls -t /root/wms-backups/wms_backup_*.sql.gz | head -1)
    LATEST_SIZE=$(du -h "$LATEST" | cut -f1)
    LATEST_DATE=$(stat -c %y "$LATEST" | cut -d. -f1)
    echo "   Latest backup: $(basename $LATEST)"
    echo "   Size: $LATEST_SIZE"
    echo "   Created: $LATEST_DATE"
else
    echo "   ⚠️  No backups found!"
fi

echo ""

# Volume Backups
echo "💾 Volume Backups:"
VOLUME_COUNT=$(ls -1 /root/volume-backups/mysql-volume-*.tar.gz 2>/dev/null | wc -l)
echo "   Total backups: $VOLUME_COUNT"

if [ $VOLUME_COUNT -gt 0 ]; then
    LATEST_VOL=$(ls -t /root/volume-backups/mysql-volume-*.tar.gz | head -1)
    LATEST_VOL_SIZE=$(du -h "$LATEST_VOL" | cut -f1)
    LATEST_VOL_DATE=$(stat -c %y "$LATEST_VOL" | cut -d. -f1)
    echo "   Latest backup: $(basename $LATEST_VOL)"
    echo "   Size: $LATEST_VOL_SIZE"
    echo "   Created: $LATEST_VOL_DATE"
fi

echo ""

# Cron Status
echo "⏰ Cron Jobs:"
crontab -l | grep -E "backup-wms-db|backup-volume" || echo "   ⚠️  No cron jobs found!"

echo ""

# Database Status
echo "🗄️  Database Status:"
docker exec wms-database mysql -u root -pQgocargo@123 -e "SELECT COUNT(*) as user_count FROM warehouse_wms.User;" 2>/dev/null && echo "   ✅ Database accessible" || echo "   ❌ Database not accessible"

echo ""
echo "✅ Health check complete!"
EOF

chmod +x /root/check-backups.sh

# Display final status
echo ""
echo "✅ ======================================"
echo "✅  Auto-Backup System Setup Complete!"
echo "✅ ======================================"
echo ""
echo "📋 Summary:"
echo "   🔄 SQL Backups: Every 5 minutes"
echo "   💾 Volume Backups: Daily at 2 AM"
echo "   📁 Backup Location: /root/wms-backups/"
echo "   📦 Volume Location: /root/volume-backups/"
echo "   📊 Retention: 100 SQL backups, 7 volume backups"
echo ""
echo "🔧 Useful Commands:"
echo "   Check backup status: /root/check-backups.sh"
echo "   View backup log: tail -f /root/backup.log"
echo "   List backups: ls -lh /root/wms-backups/"
echo "   Restore backup: /root/restore-wms-db.sh /root/wms-backups/wms_backup_YYYYMMDD_HHMMSS.sql.gz"
echo ""
echo "📊 Current Status:"
/root/check-backups.sh
