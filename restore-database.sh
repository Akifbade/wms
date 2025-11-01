#!/bin/bash
# Database Restore Script
# Usage: ./restore-database.sh backup_20251027_184530.sql.gz

if [ -z "$1" ]; then
    echo "❌ Error: Please provide backup file name"
    echo "Usage: ./restore-database.sh backup_20251027_184530.sql.gz"
    echo ""
    echo "Available backups:"
    ls -lh /root/database-backups/
    exit 1
fi

BACKUP_FILE="/root/database-backups/$1"
CONTAINER_NAME="wms-database"
DB_NAME="warehouse_wms"
DB_USER="root"
DB_PASS="rootpassword"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE current database with backup!"
echo "📁 Backup file: $1"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🔄 Restoring database..."

# Decompress and restore
gunzip < $BACKUP_FILE | docker exec -i $CONTAINER_NAME mysql -u $DB_USER -p$DB_PASS $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    echo "🔄 Restarting backend..."
    docker-compose restart backend
else
    echo "❌ Restore failed!"
    exit 1
fi
