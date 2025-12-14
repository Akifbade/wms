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

# 2. SETUP NETWORK
echo "🌐 Setting up Docker network..."
docker network create wms-network 2>/dev/null || true

# 3. STOP OLD CONTAINERS
echo "🛑 Stopping old containers..."
docker stop wms-backend wms-frontend 2>/dev/null || true
docker rm -f wms-backend wms-frontend 2>/dev/null || true

# 4. CHECK IF DATABASE EXISTS
if docker ps -q -f name=wms-database | grep -q .; then
    echo "✅ Database already running, connecting to network..."
    docker network connect wms-network wms-database 2>/dev/null || true
else
    echo "🗄️ Starting database..."
    docker rm -f wms-database 2>/dev/null || true
    docker volume create mysql_prod_data 2>/dev/null || true
    docker run --rm -v mysql_prod_data:/var/lib/mysql alpine chown -R 999:999 /var/lib/mysql 2>/dev/null || true
    
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
    
    echo "⏳ Waiting 30s for database to initialize..."
    sleep 30
fi

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

# 7. WAIT AND VERIFY
echo "⏳ Waiting 10 seconds for services to start..."
sleep 10

# 8. HEALTH CHECK
echo "🔍 Running health checks..."
if curl -s http://localhost:5000/api/health | grep -q "ok"; then
    echo "✅ Backend: HEALTHY"
else
    echo "❌ Backend: Check logs with 'docker logs wms-backend'"
fi

if curl -s -o /dev/null -w '%{http_code}' http://localhost:80 | grep -q "200\|301\|302"; then
    echo "✅ Frontend: HEALTHY"
else
    echo "❌ Frontend: Check logs with 'docker logs wms-frontend'"
fi

# 9. CLEANUP
echo "🧹 Cleaning up unused images..."
docker image prune -f

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
docker ps --format 'table {{.Names}}\t{{.Status}}'
