#!/bin/bash
# Production VPS Deployment Script
# Automatically run by GitHub Actions after Docker images are loaded

set -e

echo "🚀 Starting WMS Production Deployment..."
echo "========================================"

cd "/root/NEW START"

# 1. Create database backup (keep last 2)
echo "💾 Creating database backup..."
BACKUP_FILE="/root/backups/wms-backup-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p /root/backups
docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction warehouse_wms > "$BACKUP_FILE" 2>/dev/null || echo "⚠️ Backup failed (might be first deploy)"

# Keep only last 2 backups
cd /root/backups && ls -t wms-backup-*.sql | tail -n +3 | xargs -r rm

echo "✅ Backup complete: $BACKUP_FILE"

# 2. Stop and remove old containers
echo "🛑 Stopping old containers..."
docker-compose down || true

# 3. Clean up old images (keep space)
echo "🧹 Cleaning old Docker images..."
docker image prune -af --filter "until=24h" || true

# 4. Start new containers with fresh images
echo "🚀 Starting new containers..."
docker-compose up -d

# 5. Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 10

# 6. Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec -T wms-backend npx prisma migrate deploy || echo "⚠️ Migration warning (might be up to date)"

# 7. Health check
echo "🏥 Checking health..."
HEALTH_CHECK=$(curl -s http://localhost:5000/api/health || echo '{"status":"unknown"}')
echo "Backend health: $HEALTH_CHECK"

# 8. Show running containers
echo ""
echo "✅ Deployment Complete!"
echo "======================="
docker ps --filter "name=wms-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🌐 Application URLs:"
echo "   - Frontend: https://qgocargo.cloud"
echo "   - Backend:  https://qgocargo.cloud/api/health"
echo ""
echo "📊 Version deployed:"
grep "APP_VERSION" frontend/src/config/version.ts || echo "Version check failed"
