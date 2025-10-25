#!/bin/bash
# Automated Backup Script

BACKUP_DIR="${BACKUP_DIR:-/backup}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "🔄 Starting backup process..."
echo "Timestamp: $TIMESTAMP"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "📊 Backing up database..."
docker exec wms-database mysqldump \
    -u root \
    -p"${DB_ROOT_PASSWORD:-rootpassword}" \
    "${DB_NAME:-warehouse_wms}" \
    > "$BACKUP_DIR/database_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database backup completed"
    gzip "$BACKUP_DIR/database_$TIMESTAMP.sql"
else
    echo "❌ Database backup failed"
    exit 1
fi

# Backup uploads
echo "📁 Backing up uploads..."
if [ -d "./backend/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" backend/uploads/
    echo "✅ Uploads backup completed"
fi

# Backup environment file
echo "⚙️  Backing up environment..."
cp .env "$BACKUP_DIR/env_$TIMESTAMP.bak"

# Remove old backups
echo "🧹 Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo ""
echo "✅ Backup completed successfully!"
echo "📦 Backup location: $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | grep "$TIMESTAMP"
