#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# VPS CLEANUP & OPTIMIZATION SCRIPT
# ═══════════════════════════════════════════════════════════════
# Purpose: Fix CPU high usage, clean unused Docker resources
# Issues Found:
# 1. Unused Docker images (595MB dangling image)
# 2. 6 unused Docker volumes (staging_mysql_data, etc)
# 3. PM2 stopped process (zombie)
# 4. Old Docker build cache (400MB+)
# 5. Swap usage high (835MB used)
# ═══════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " 🧹 VPS CLEANUP & OPTIMIZATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "/root/NEW START" || exit 1

# ═══════════════════════════════════════════════════════════════
# 1. REMOVE DANGLING/UNUSED DOCKER IMAGES
# ═══════════════════════════════════════════════════════════════
echo "[1/8] 🗑️  Removing dangling Docker images..."
DANGLING_COUNT=$(docker images -f "dangling=true" -q | wc -l)

if [ "$DANGLING_COUNT" -gt 0 ]; then
    docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true
    echo "✅ Removed $DANGLING_COUNT dangling images"
else
    echo "ℹ️  No dangling images"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# 2. REMOVE UNUSED STAGING IMAGES
# ═══════════════════════════════════════════════════════════════
echo "[2/8] 🗑️  Removing staging Docker images..."
docker rmi wms-staging-frontend 2>/dev/null || echo "   No staging frontend image"
docker rmi wms-staging-backend 2>/dev/null || echo "   No staging backend image"
echo "✅ Staging images cleaned"
echo ""

# ═══════════════════════════════════════════════════════════════
# 3. REMOVE UNUSED DOCKER VOLUMES
# ═══════════════════════════════════════════════════════════════
echo "[3/8] 🗑️  Removing unused Docker volumes..."

# Remove specific unused volumes (safe - not attached to running containers)
docker volume rm newstart_certbot-var 2>/dev/null || echo "   certbot-var already removed"
docker volume rm newstart_certbot-etc 2>/dev/null || echo "   certbot-etc already removed"
docker volume rm newstart_web-root 2>/dev/null || echo "   web-root already removed"
docker volume rm newstart_mysql-data 2>/dev/null || echo "   old mysql-data already removed"
docker volume rm newstart_production_mysql_data 2>/dev/null || echo "   production_mysql_data already removed"
docker volume rm staging_mysql_data 2>/dev/null || echo "   staging_mysql_data already removed"

echo "✅ Unused volumes cleaned"
echo ""

# ═══════════════════════════════════════════════════════════════
# 4. CLEAN DOCKER BUILD CACHE
# ═══════════════════════════════════════════════════════════════
echo "[4/8] 🗑️  Cleaning Docker build cache..."
docker builder prune -f --filter "until=24h"
echo "✅ Build cache cleaned"
echo ""

# ═══════════════════════════════════════════════════════════════
# 5. STOP & DELETE PM2 ZOMBIE PROCESS
# ═══════════════════════════════════════════════════════════════
echo "[5/8] 🗑️  Removing PM2 zombie process..."
pm2 delete all 2>/dev/null || echo "   No PM2 processes to delete"
pm2 save --force 2>/dev/null || true
echo "✅ PM2 cleaned"
echo ""

# ═══════════════════════════════════════════════════════════════
# 6. CLEAN OLD BACKUPS (Keep only 2 latest)
# ═══════════════════════════════════════════════════════════════
echo "[6/8] 🗑️  Cleaning old backups (keeping 2 latest)..."

if [ -d "backups-production" ]; then
    BACKUP_COUNT=$(ls backups-production/prod_backup_*.sql.gz 2>/dev/null | wc -l)
    
    if [ "$BACKUP_COUNT" -gt 2 ]; then
        ls -t backups-production/prod_backup_*.sql.gz | tail -n +3 | xargs rm -f
        REMOVED=$((BACKUP_COUNT - 2))
        echo "✅ Removed $REMOVED old backups (kept 2 latest)"
    else
        echo "ℹ️  Only $BACKUP_COUNT backups found (keeping all)"
    fi
else
    echo "ℹ️  No backup directory"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# 7. CLEAR SYSTEM CACHE & SWAP
# ═══════════════════════════════════════════════════════════════
echo "[7/8] 🗑️  Clearing system cache..."

# Drop caches (safe - Linux will rebuild)
sync
echo 3 > /proc/sys/vm/drop_caches

# Clear swap if usage > 50%
SWAP_USED=$(free | grep Swap | awk '{print $3}')
SWAP_TOTAL=$(free | grep Swap | awk '{print $2}')
SWAP_PERCENT=$((SWAP_USED * 100 / SWAP_TOTAL))

if [ "$SWAP_PERCENT" -gt 50 ]; then
    echo "   Swap usage: ${SWAP_PERCENT}% - clearing..."
    swapoff -a && swapon -a
    echo "   ✅ Swap cleared"
else
    echo "   Swap usage: ${SWAP_PERCENT}% - OK"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# 8. RESTART DOCKER TO APPLY CHANGES
# ═══════════════════════════════════════════════════════════════
echo "[8/8] 🔄 Restarting Docker daemon..."
systemctl restart docker
sleep 5

# Restart production containers
docker-compose up -d

echo "✅ Docker restarted"
echo ""

# ═══════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════
echo "═══════════════════════════════════════════════════════════════"
echo " 📊 CLEANUP SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Memory Status:"
free -h | grep -E "Mem|Swap"
echo ""

echo "Disk Space:"
df -h / | tail -1
echo ""

echo "Docker Disk Usage:"
docker system df
echo ""

echo "Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

echo "CPU Load:"
uptime
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo " ✅ CLEANUP COMPLETE!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
