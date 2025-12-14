#!/bin/bash

# ========================================
# VPS PROJECT SYNC & DEPLOYMENT SCRIPT
# ========================================
# Safely syncs local project to VPS with backup

set -e  # Exit on error

VPS_HOST="root@your-vps-ip"  # Update with your VPS IP
VPS_PROJECT_DIR="/root/wms"
LOCAL_PROJECT_DIR="."
BACKUP_BEFORE_SYNC=true

echo "============================================="
echo "🚀 VPS SYNC & DEPLOYMENT SCRIPT"
echo "============================================="

# Step 1: Test VPS connection
echo ""
echo "🔌 Step 1: Testing VPS connection..."
if ssh ${VPS_HOST} "echo 'Connection successful'"; then
    echo "✅ VPS connection verified"
else
    echo "❌ Cannot connect to VPS. Check your SSH credentials."
    exit 1
fi

# Step 2: Create backup on VPS before sync
if [ "$BACKUP_BEFORE_SYNC" = true ]; then
    echo ""
    echo "💾 Step 2: Creating backup on VPS before sync..."
    
    # Upload backup script to VPS
    scp vps-backup.sh ${VPS_HOST}:/root/
    
    # Execute backup on VPS
    ssh ${VPS_HOST} "chmod +x /root/vps-backup.sh && /root/vps-backup.sh"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup created successfully"
    else
        echo "❌ Backup failed. Aborting sync for safety."
        exit 1
    fi
fi

# Step 3: Stop running containers on VPS
echo ""
echo "🛑 Step 3: Stopping containers on VPS..."
ssh ${VPS_HOST} "cd ${VPS_PROJECT_DIR} && docker-compose down"
echo "✅ Containers stopped"

# Step 4: Sync project files to VPS (excluding node_modules, dist, etc.)
echo ""
echo "📤 Step 4: Syncing project files to VPS..."
rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='uploads/*' \
    --exclude='*.log' \
    --exclude='.env' \
    ${LOCAL_PROJECT_DIR}/ ${VPS_HOST}:${VPS_PROJECT_DIR}/

echo "✅ Project files synced"

# Step 5: Sync docker-compose files
echo ""
echo "🐳 Step 5: Syncing Docker configurations..."
scp docker-compose*.yml ${VPS_HOST}:${VPS_PROJECT_DIR}/
scp -r config ${VPS_HOST}:${VPS_PROJECT_DIR}/ 2>/dev/null || true
echo "✅ Docker configs synced"

# Step 6: Build and start containers on VPS
echo ""
echo "🏗️  Step 6: Building containers on VPS..."
ssh ${VPS_HOST} "cd ${VPS_PROJECT_DIR} && docker-compose build"

echo ""
echo "🚀 Step 7: Starting containers on VPS..."
ssh ${VPS_HOST} "cd ${VPS_PROJECT_DIR} && docker-compose up -d"

# Step 8: Check container status
echo ""
echo "📊 Step 8: Verifying deployment..."
sleep 5
ssh ${VPS_HOST} "cd ${VPS_PROJECT_DIR} && docker-compose ps"

echo ""
echo "🔍 Step 9: Checking backend logs..."
ssh ${VPS_HOST} "cd ${VPS_PROJECT_DIR} && docker-compose logs --tail=20 backend"

echo ""
echo "============================================="
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "============================================="
echo ""
echo "🌐 Your WMS should now be running on VPS"
echo "📝 Check logs: ssh ${VPS_HOST} 'cd ${VPS_PROJECT_DIR} && docker-compose logs -f'"
echo "🔄 Restart: ssh ${VPS_HOST} 'cd ${VPS_PROJECT_DIR} && docker-compose restart'"
echo "============================================="
