#!/bin/bash
set -e

# ==========================================
# VPS DEPLOYMENT SCRIPT (ROBUST VERSION)
# ==========================================

echo "🚀 Starting VPS Deployment..."
cd "/root/NEW START"

# 1. BACKUP (Non-fatal)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/root/backups/pre_deploy_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating Backup in $BACKUP_DIR..."

# Backup Database (non-fatal)
echo "  - Attempting database backup..."
if docker exec wms-database mysqldump -u wms_user -pwmspassword123 --no-tablespaces warehouse_wms > "$BACKUP_DIR/db_backup.sql" 2>/dev/null; then
    echo "  ✅ Database backup successful."
else
    echo "  ⚠️ Database backup skipped (container not ready)."
fi

# Backup Uploads
if [ -d "backend/uploads" ]; then
    echo "  - Backing up uploads..."
    cp -r backend/uploads "$BACKUP_DIR/uploads" 2>/dev/null || true
fi

echo "✅ Backup Complete."

# 2. CLEANUP OLD NETWORKS AND CONTAINERS
echo "🧹 Cleaning up old resources..."
docker stop wms-backend wms-frontend wms-database 2>/dev/null || true
docker rm -f wms-backend wms-frontend wms-database 2>/dev/null || true

# Remove old/duplicate networks
docker network rm newstart_wms-network 2>/dev/null || true
docker network rm wms-prod-network 2>/dev/null || true
docker network rm newstart_default 2>/dev/null || true

# Create fresh network
docker network rm wms-network 2>/dev/null || true
echo "🌐 Creating fresh Docker network..."
docker network create wms-network

# 3. FIX DATABASE VOLUME PERMISSIONS
echo "🔧 Fixing database permissions..."
docker volume create mysql_prod_data 2>/dev/null || true
docker run --rm -v mysql_prod_data:/var/lib/mysql alpine chown -R 999:999 /var/lib/mysql 2>/dev/null || true

# 4. START DATABASE
echo "🗄️ Starting database..."
docker run -d --name wms-database \
  --network wms-network \
  -e MYSQL_ROOT_PASSWORD=rootpassword123 \
  -e MYSQL_DATABASE=warehouse_wms \
  -e MYSQL_USER=wms_user \
  -e MYSQL_PASSWORD=wmspassword123 \
  -p 3307:3306 \
  -v mysql_prod_data:/var/lib/mysql \
  --restart always \
  mysql:8.0

echo "⏳ Waiting 20s for database..."
sleep 20

# 5. START BACKEND
echo "⚙️ Starting backend..."
docker run -d --name wms-backend \
  --network wms-network \
  -e NODE_ENV=production \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@wms-database:3306/warehouse_wms' \
  -e JWT_SECRET='your-production-jwt-secret-here' \
  -e PORT=5000 \
  -e CORS_ORIGIN='https://qgocargo.cloud,https://www.qgocargo.cloud,http://localhost' \
  -p 5000:5000 \
  -v "/root/NEW START/backend/uploads:/app/uploads" \
  --restart always \
  ghcr.io/akifbade/wms-backend:latest

echo "⏳ Waiting 10s for backend..."
sleep 10

# 6. START FRONTEND
echo "🌐 Starting frontend..."
docker run -d --name wms-frontend \
  --network wms-network \
  -e VITE_API_URL=https://qgocargo.cloud/api \
  -p 80:80 \
  -p 443:443 \
  -v "/root/NEW START/frontend/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  --restart always \
  ghcr.io/akifbade/wms-frontend:latest

echo "⏳ Waiting 5s for frontend..."
sleep 5

# 7. VERIFY NETWORK CONNECTIVITY
echo "🔍 Verifying network connectivity..."
docker network inspect wms-network --format '{{range .Containers}}{{.Name}} {{end}}'

# Test from inside frontend
echo "🔍 Testing frontend → backend connection..."
if docker exec wms-frontend wget -q -O- http://wms-backend:5000/api/health 2>/dev/null | grep -q "ok"; then
    echo "✅ Internal connectivity: OK"
else
    echo "❌ Internal connectivity: FAILED"
    docker logs wms-backend --tail 20
fi

# 8. EXTERNAL HEALTH CHECK
echo "🔍 Running external health checks..."
if curl -s http://localhost:5000/api/health | grep -q "ok"; then
    echo "✅ Backend API: HEALTHY"
else
    echo "❌ Backend API: Check 'docker logs wms-backend'"
fi

# 9. CLEANUP UNUSED
echo "🧹 Cleaning up unused images..."
docker image prune -f
docker network prune -f 2>/dev/null || true

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo ""
echo "Network containers:"
docker network inspect wms-network --format '{{range .Containers}}  - {{.Name}}{{"\n"}}{{end}}'
