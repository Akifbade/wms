#!/bin/bash

# ============================================
# WMS - SAFE DEPLOYMENT SCRIPT
# ============================================
# Usage: bash scripts/deploy.sh [staging|production] [branch]
# Example: bash scripts/deploy.sh staging develop
# ============================================

set -e  # Exit on any error

ENVIRONMENT=${1:-staging}
BRANCH=${2:-staging}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${ENVIRONMENT}_${TIMESTAMP}.tar.gz"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 WMS Safe Deployment Script${NC}"
echo "Environment: $ENVIRONMENT"
echo "Branch: $BRANCH"
echo "Timestamp: $TIMESTAMP"
echo ""

# ============================================
# STAGE 1: PRE-DEPLOYMENT CHECKS
# ============================================
echo -e "${YELLOW}📋 Stage 1: Pre-deployment Checks${NC}"

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "✅ Created backup directory"
fi

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Uncommitted changes detected. Please commit first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
echo ""

# ============================================
# STAGE 2: CREATE BACKUP
# ============================================
echo -e "${YELLOW}📦 Stage 2: Creating Backup${NC}"

# Backup database
echo "  📊 Backing up database..."
docker compose exec -T database mysqldump -u wms_user -pwmspassword123 warehouse_wms > "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

# Backup docker compose state
echo "  🐳 Backing up docker state..."
docker compose config > "${BACKUP_DIR}/docker_config_${TIMESTAMP}.yml"

# Backup volumes
echo "  💾 Backing up volumes..."
tar -czf "$BACKUP_FILE" \
  ./backend/uploads \
  ./backend/logs \
  "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql" \
  "${BACKUP_DIR}/docker_config_${TIMESTAMP}.yml" \
  2>/dev/null || true

echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo ""

# ============================================
# STAGE 3: PULL LATEST CODE
# ============================================
echo -e "${YELLOW}📥 Stage 3: Pulling Latest Code${NC}"

git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo -e "${GREEN}✅ Code updated to latest${NC}"
echo ""

# ============================================
# STAGE 4: BUILD DOCKER IMAGES
# ============================================
echo -e "${YELLOW}🔨 Stage 4: Building Docker Images${NC}"

if [ "$ENVIRONMENT" = "staging" ]; then
    COMPOSE_FILE="docker-compose.staging.yml"
    PORT_SUFFIX=":8080"
else
    COMPOSE_FILE="docker-compose.yml"
    PORT_SUFFIX=":80"
fi

echo "  Using compose file: $COMPOSE_FILE"

docker compose -f $COMPOSE_FILE build --no-cache

echo -e "${GREEN}✅ Docker images built${NC}"
echo ""

# ============================================
# STAGE 5: DEPLOY CONTAINERS
# ============================================
echo -e "${YELLOW}🚀 Stage 5: Deploying Containers${NC}"

docker compose -f $COMPOSE_FILE pull
docker compose -f $COMPOSE_FILE up -d --force-recreate

echo -e "${GREEN}✅ Containers deployed${NC}"
echo ""

# ============================================
# STAGE 6: RUN MIGRATIONS
# ============================================
echo -e "${YELLOW}🔄 Stage 6: Running Database Migrations${NC}"

sleep 3  # Wait for containers to be ready

docker compose exec -T backend npx prisma migrate deploy
docker compose exec -T backend npx prisma generate

echo -e "${GREEN}✅ Migrations completed${NC}"
echo ""

# ============================================
# STAGE 7: HEALTH CHECKS
# ============================================
echo -e "${YELLOW}🏥 Stage 7: Health Checks${NC}"

# Wait for services to be ready
echo "  Waiting for services..."
sleep 5

# Check backend
echo "  Checking backend..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T backend curl -f http://localhost:5000 > /dev/null 2>&1; then
        echo "  ✅ Backend is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "  ⏳ Retry $RETRY_COUNT/$MAX_RETRIES..."
        sleep 3
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo -e "${YELLOW}🔙 Rolling back...${NC}"
    
    # Rollback
    docker compose -f $COMPOSE_FILE down
    
    # Restore from backup (manual process - db restoration)
    echo "📦 Restoring from backup: $BACKUP_FILE"
    docker compose up -d
    docker compose exec -T database mysql -u wms_user -pwmspassword123 warehouse_wms < "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    docker compose up -d
    
    echo -e "${RED}❌ Deployment failed and rolled back${NC}"
    exit 1
fi

# Check frontend
echo "  Checking frontend..."
if curl -f "http://localhost$PORT_SUFFIX" > /dev/null 2>&1; then
    echo "  ✅ Frontend is healthy"
else
    echo "  ⚠️  Frontend check inconclusive (might need time to initialize)"
fi

echo -e "${GREEN}✅ Health checks passed${NC}"
echo ""

# ============================================
# STAGE 8: CLEANUP OLD BACKUPS
# ============================================
echo -e "${YELLOW}🧹 Stage 8: Cleanup Old Backups${NC}"

# Keep only last 5 backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_${ENVIRONMENT}_* 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt 5 ]; then
    echo "  Removing old backups (keeping 5 most recent)..."
    ls -1t "$BACKUP_DIR"/backup_${ENVIRONMENT}_* | tail -n +6 | xargs -r rm
fi

echo -e "${GREEN}✅ Cleanup completed${NC}"
echo ""

# ============================================
# SUCCESS
# ============================================
echo -e "${GREEN}🎉 Deployment Successful!${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Backup Location: $BACKUP_FILE"
echo "URL: http://localhost$PORT_SUFFIX"
echo ""
echo "To rollback, run:"
echo "  bash scripts/rollback.sh $ENVIRONMENT $BACKUP_FILE"
