#!/bin/bash

# ============================================
# WMS - ROLLBACK SCRIPT
# ============================================
# Usage: bash scripts/rollback.sh [staging|production] [backup_file]
# Example: bash scripts/rollback.sh staging ./backups/backup_staging_20251030_120000.tar.gz
# ============================================

set -e

ENVIRONMENT=${1:-staging}
BACKUP_FILE=${2:-}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔙 WMS Rollback Script${NC}"
echo "Environment: $ENVIRONMENT"
echo ""

# Check backup file
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}Available backups:${NC}"
    ls -lht ./backups/backup_${ENVIRONMENT}_* 2>/dev/null | head -5
    echo ""
    echo -e "${RED}❌ No backup file specified${NC}"
    echo "Usage: bash scripts/rollback.sh $ENVIRONMENT ./backups/backup_file.tar.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Confirm rollback
echo -e "${RED}⚠️  WARNING: This will rollback to previous state${NC}"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔙 Rolling back...${NC}"

# Select compose file
if [ "$ENVIRONMENT" = "staging" ]; then
    COMPOSE_FILE="docker-compose.staging.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

# Stop containers
echo "  Stopping containers..."
docker compose -f $COMPOSE_FILE down

# Extract backup
echo "  Extracting backup..."
tar -xzf "$BACKUP_FILE" -C ./

# Restore database from backup
echo "  Restoring database..."
DB_BACKUP=$(find ./backups -name "db_backup_*.sql" -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

if [ -f "$DB_BACKUP" ]; then
    # Restart database container first
    docker compose -f $COMPOSE_FILE up -d database
    sleep 5
    
    # Restore database
    docker compose -f $COMPOSE_FILE exec -T database mysql -u wms_user -pwmspassword123 warehouse_wms < "$DB_BACKUP"
    echo "  ✅ Database restored from $DB_BACKUP"
else
    echo "  ⚠️  Database backup not found"
fi

# Restart all containers
echo "  Restarting containers..."
docker compose -f $COMPOSE_FILE up -d

# Health check
echo "  Running health checks..."
sleep 3

if docker compose -f $COMPOSE_FILE exec -T backend curl -f http://localhost:5000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend might need more time to initialize${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Rollback completed!${NC}"
echo "Previous state has been restored"
