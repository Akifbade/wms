#!/bin/bash

# BACKUP MANAGER FOR VPS
# Automatic database and full system backup

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup.log"
LOCK_FILE="/tmp/backup.lock"

DB_USER="root"
DB_PASS="Qgocargo@123"
PROD_DB="warehouse_wms"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

init() {
    mkdir -p $BACKUP_DIR
    touch $LOG_FILE
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1" >> $LOG_FILE
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1" >> $LOG_FILE
    echo -e "${RED}❌ $1${NC}"
}

backup_quick() {
    log "Starting quick database backup..."
    
    if [ -f "$LOCK_FILE" ]; then
        log "Backup in progress, skipping..."
        return 0
    fi
    
    touch $LOCK_FILE
    
    docker exec wms-database mysqldump \
        -u $DB_USER \
        -p$DB_PASS \
        --single-transaction \
        --quick \
        $PROD_DB > "$BACKUP_DIR/database-$TIMESTAMP.sql" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        gzip -f "$BACKUP_DIR/database-$TIMESTAMP.sql"
        SIZE=$(ls -lh "$BACKUP_DIR/database-$TIMESTAMP.sql.gz" 2>/dev/null | awk '{print $5}')
        success "Database backup: database-$TIMESTAMP.sql.gz (${SIZE})"
        
        # Keep only last 288 backups (24 hours)
        find $BACKUP_DIR -name "database-*.sql.gz" -mmin +1440 -delete 2>/dev/null
    else
        error "Database backup failed!"
        rm -f "$BACKUP_DIR/database-$TIMESTAMP.sql"
    fi
    
    rm -f $LOCK_FILE
}

backup_full() {
    log "Starting full system backup..."
    
    if [ -f "$LOCK_FILE" ]; then
        log "Backup in progress, skipping..."
        return 0
    fi
    
    touch $LOCK_FILE
    TEMP_DIR="/tmp/backup-$TIMESTAMP"
    mkdir -p $TEMP_DIR
    
    # Export database
    log "Exporting database..."
    docker exec wms-database mysqldump \
        -u $DB_USER \
        -p$DB_PASS \
        --single-transaction \
        --quick \
        $PROD_DB > "$TEMP_DIR/warehouse_wms.sql" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        success "Database exported"
    fi
    
    # Backup config
    log "Backing up configuration..."
    cd /root/NEW\ START 2>/dev/null || cd /root 2>/dev/null
    tar czf "$TEMP_DIR/config.tar.gz" \
        docker-compose.yml \
        docker-compose-dual-env.yml \
        frontend/nginx.conf 2>/dev/null || true
    
    # Create final archive
    log "Creating archive..."
    tar czf "$BACKUP_DIR/full-system-$TIMESTAMP.tar.gz" \
        -C $TEMP_DIR . 2>/dev/null
    
    if [ $? -eq 0 ]; then
        SIZE=$(ls -lh "$BACKUP_DIR/full-system-$TIMESTAMP.tar.gz" 2>/dev/null | awk '{print $5}')
        success "Full backup created: full-system-$TIMESTAMP.tar.gz (${SIZE})"
        
        # Keep only 7 daily backups
        find $BACKUP_DIR -name "full-system-*.tar.gz" -mtime +7 -delete 2>/dev/null
    else
        error "Full backup creation failed!"
    fi
    
    rm -rf $TEMP_DIR
    rm -f $LOCK_FILE
}

restore_db() {
    FILE=$1
    if [ ! -f "$FILE" ]; then
        error "File not found: $FILE"
        return 1
    fi
    
    log "Restoring from: $FILE"
    
    WORK_FILE=$FILE
    if [[ $FILE == *.gz ]]; then
        WORK_FILE="/tmp/restore_$TIMESTAMP.sql"
        gunzip -c $FILE > $WORK_FILE
    fi
    
    docker exec -i wms-database mysql \
        -u $DB_USER \
        -p$DB_PASS \
        $PROD_DB < $WORK_FILE 2>/dev/null
    
    if [ $? -eq 0 ]; then
        success "Database restored!"
        docker restart wms-backend 2>/dev/null
    else
        error "Restore failed!"
        return 1
    fi
    
    rm -f "/tmp/restore_$TIMESTAMP.sql"
}

list_backups() {
    echo -e "${GREEN}📁 Backup Status${NC}"
    echo "════════════════════════════════════════"
    echo ""
    
    echo -e "${YELLOW}Database Backups (5-min interval):${NC}"
    COUNT=$(ls -1 $BACKUP_DIR/database-*.sql.gz 2>/dev/null | wc -l)
    echo "Count: $COUNT"
    ls -lh $BACKUP_DIR/database-*.sql.gz 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'
    
    echo ""
    echo -e "${YELLOW}Full Backups (daily):${NC}"
    COUNT=$(ls -1 $BACKUP_DIR/full-system-*.tar.gz 2>/dev/null | wc -l)
    echo "Count: $COUNT"
    ls -lh $BACKUP_DIR/full-system-*.tar.gz 2>/dev/null | tail -3 | awk '{print "  " $9 " (" $5 ")"}'
    
    echo ""
    echo "════════════════════════════════════════"
}

main() {
    init
    
    case "${1:-help}" in
        quick)
            backup_quick
            ;;
        full)
            backup_full
            ;;
        restore-db)
            restore_db "$2"
            ;;
        list)
            list_backups
            ;;
        *)
            echo "Usage: $0 {quick|full|restore-db|list}"
            ;;
    esac
}

main "$@"
