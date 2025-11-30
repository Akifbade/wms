#!/bin/bash
# SAFE CONTAINER REBUILD SCRIPT
# This script ALWAYS backs up uploads before any container changes
# USE THIS INSTEAD OF docker-compose commands directly!

echo "=========================================="
echo "  🔒 SAFE CONTAINER REBUILD"
echo "=========================================="

BACKUP_DIR="/root/WMS_UPLOAD_BACKUPS"
UPLOADS_PATH="/root/NEW START/backend/uploads"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Step 1: MANDATORY BACKUP
echo ""
echo "Step 1: Creating mandatory backup..."
mkdir -p "$BACKUP_DIR"
cd "$UPLOADS_PATH"
BACKUP_FILE="$BACKUP_DIR/PRE_REBUILD_$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_FILE" .
echo "✅ Backup created: $BACKUP_FILE"

# Step 2: Verify backup
BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "   Backup size: $BACKUP_SIZE"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ BACKUP FAILED! ABORTING REBUILD!"
    exit 1
fi

# Step 3: Verify volume mount before proceeding
echo ""
echo "Step 2: Verifying volume mount..."
MOUNT_CHECK=$(docker inspect wms-backend --format='{{range .Mounts}}{{.Destination}}{{println}}{{end}}' 2>/dev/null | grep "/app/uploads")
if [ -z "$MOUNT_CHECK" ]; then
    echo "⚠️  WARNING: Backend container has NO volume mount for uploads!"
    echo "   This is dangerous. Proceeding with extra caution..."
fi

# Step 4: Rebuild
echo ""
echo "Step 3: Rebuilding containers..."
cd "/root/NEW START"
docker-compose down
docker-compose up -d --build

# Step 5: Wait and verify
echo ""
echo "Step 4: Waiting for containers..."
sleep 15

# Step 6: Verify uploads after rebuild
echo ""
echo "Step 5: Verifying uploads after rebuild..."
AFTER_COUNT=$(docker exec wms-backend ls -la /app/uploads/shipments/ 2>/dev/null | wc -l)
echo "   Shipment images count: $AFTER_COUNT"

if [ "$AFTER_COUNT" -lt 5 ]; then
    echo "❌ WARNING: Few images detected! Restoring from backup..."
    cd "$UPLOADS_PATH"
    tar -xzf "$BACKUP_FILE"
    echo "✅ Restored from backup"
fi

echo ""
echo "=========================================="
echo "  ✅ REBUILD COMPLETE"
echo "  📁 Backup saved: $BACKUP_FILE"
echo "=========================================="
