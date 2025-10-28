#!/bin/bash

# ============================================
# COMPLETE BACKUP & RECOVERY SYSTEM FOR VPS
# ============================================
# Install location: /root/backup-manager.sh
# Run with: bash /root/backup-manager.sh [command]
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/backup.log"
LOCK_FILE="/tmp/backup.lock"

# Database credentials (same as docker-compose)
DB_USER="root"
DB_PASS="Qgocargo@123"
PROD_DB="warehouse_wms"
STAGING_DB="warehouse_wms_staging"

# ============================================
# FUNCTIONS
# ============================================

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

# Error function
error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" >> $LOG_FILE
    echo -e "${RED}❌ ERROR: $1${NC}"
}

# Success function
success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1" >> $LOG_FILE
    echo -e "${GREEN}✅ $1${NC}"
}

# Init function
init_backup_system() {
    mkdir -p $BACKUP_DIR
    touch $LOG_FILE
    success "Backup system initialized at $BACKUP_DIR"
}

# ============================================
# QUICK DATABASE BACKUP (Every 5 minutes)
# ============================================

backup_database_quick() {
    log "Starting quick database backup..."
    
    if [ -f "$LOCK_FILE" ]; then
        log "Backup already in progress, skipping..."
        return 0
    fi
    
    touch $LOCK_FILE
    
    try {
        # Export production database
        log "Exporting production database..."
        docker exec wms-database mysqldump \
            -u $DB_USER \
            -p$DB_PASS \
            --single-transaction \
            --quick \
            $PROD_DB > "$BACKUP_DIR/database-$TIMESTAMP.sql"
        
        # Compress
        log "Compressing backup..."
        gzip -f "$BACKUP_DIR/database-$TIMESTAMP.sql"
        
        SIZE=$(ls -lh "$BACKUP_DIR/database-$TIMESTAMP.sql.gz" | awk '{print $5}')
        success "Database backup created: database-$TIMESTAMP.sql.gz (${SIZE})"
        
        # Keep only last 288 backups (24 hours at 5-min intervals)
        log "Cleaning old backups (keeping 24 hours)..."
        find $BACKUP_DIR -name "database-*.sql.gz" -mmin +1440 -delete
        
    } catch {
        error "Database backup failed!"
        rm -f "$BACKUP_DIR/database-$TIMESTAMP.sql" "$BACKUP_DIR/database-$TIMESTAMP.sql.gz"
    } finally {
        rm -f $LOCK_FILE
    }
}

# ============================================
# FULL SYSTEM BACKUP (Daily at 2 AM)
# ============================================

backup_full_system() {
    log "Starting full system backup..."
    
    if [ -f "$LOCK_FILE" ]; then
        log "Backup already in progress, skipping..."
        return 0
    fi
    
    touch $LOCK_FILE
    
    try {
        TEMP_DIR="/tmp/backup-$TIMESTAMP"
        mkdir -p $TEMP_DIR
        
        # 1. Export production database
        log "Exporting production database..."
        docker exec wms-database mysqldump \
            -u $DB_USER \
            -p$DB_PASS \
            --single-transaction \
            --quick \
            $PROD_DB > "$TEMP_DIR/warehouse_wms.sql"
        
        success "Production database exported"
        
        # 2. Export staging database (if exists)
        log "Exporting staging database..."
        docker exec staging-database mysqldump \
            -u $DB_USER \
            -p$DB_PASS \
            --single-transaction \
            --quick \
            $STAGING_DB > "$TEMP_DIR/warehouse_wms_staging.sql" 2>/dev/null || {
            log "Staging database not found (this is OK)"
        }
        
        # 3. Backup volumes
        log "Backing up Docker volumes..."
        docker run --rm -v wms-db-data:/data \
            -v $TEMP_DIR:/backup \
            alpine tar czf /backup/volumes.tar.gz -C / data 2>/dev/null || {
            log "Volume backup skipped (this is OK)"
        }
        
        # 4. Backup configuration files
        log "Backing up configuration files..."
        cd /root/NEW\ START || cd /root
        tar czf "$TEMP_DIR/config.tar.gz" \
            docker-compose.yml \
            docker-compose-dual-env.yml \
            frontend/nginx.conf \
            backend/.env 2>/dev/null || {
            log "Some config files not found (this is OK)"
        }
        
        # 5. Create final backup archive
        log "Creating final backup archive..."
        tar czf "$BACKUP_DIR/full-system-$TIMESTAMP.tar.gz" \
            -C $TEMP_DIR .
        
        SIZE=$(ls -lh "$BACKUP_DIR/full-system-$TIMESTAMP.tar.gz" | awk '{print $5}')
        success "Full system backup created: full-system-$TIMESTAMP.tar.gz (${SIZE})"
        
        # Cleanup temp
        rm -rf $TEMP_DIR
        
        # Keep only last 7 daily backups
        log "Cleaning old backups (keeping 7 days)..."
        find $BACKUP_DIR -name "full-system-*.tar.gz" -mtime +7 -delete
        
    } catch {
        error "Full system backup failed!"
        rm -rf /tmp/backup-$TIMESTAMP
    } finally {
        rm -f $LOCK_FILE
    }
}

# ============================================
# RESTORE DATABASE
# ============================================

restore_database() {
    local RESTORE_FILE=$1
    
    if [ -z "$RESTORE_FILE" ] || [ ! -f "$RESTORE_FILE" ]; then
        error "Restore file not found: $RESTORE_FILE"
        return 1
    fi
    
    echo -e "${YELLOW}⚠️  WARNING!${NC}"
    echo "Restoring database from: $RESTORE_FILE"
    echo "This will OVERWRITE current production database!"
    echo ""
    read -p "Type 'YES' to confirm: " confirm
    
    if [ "$confirm" != "YES" ]; then
        log "Database restore cancelled by user"
        return 1
    fi
    
    log "Starting database restore from $RESTORE_FILE..."
    
    try {
        # Extract if compressed
        WORK_FILE=$RESTORE_FILE
        if [[ $RESTORE_FILE == *.gz ]]; then
            WORK_FILE="/tmp/restore_$TIMESTAMP.sql"
            log "Extracting compressed file..."
            gunzip -c $RESTORE_FILE > $WORK_FILE
        fi
        
        # Restore
        log "Restoring to production database..."
        docker exec -i wms-database mysql \
            -u $DB_USER \
            -p$DB_PASS \
            $PROD_DB < $WORK_FILE
        
        success "Database restored successfully!"
        success "Restart backend to apply changes..."
        docker restart wms-backend
        
        success "Database restore complete!"
        
    } catch {
        error "Database restore failed!"
        return 1
    } finally {
        [ -f "/tmp/restore_$TIMESTAMP.sql" ] && rm -f "/tmp/restore_$TIMESTAMP.sql"
    }
}

# ============================================
# RESTORE FULL SYSTEM
# ============================================

restore_full_system() {
    local RESTORE_FILE=$1
    
    if [ -z "$RESTORE_FILE" ] || [ ! -f "$RESTORE_FILE" ]; then
        error "Restore file not found: $RESTORE_FILE"
        return 1
    fi
    
    echo -e "${RED}⚠️  CRITICAL WARNING!${NC}"
    echo "FULL SYSTEM RESTORE - THIS IS NOT REVERSIBLE!"
    echo "Restoring from: $RESTORE_FILE"
    echo ""
    echo "This will:"
    echo "  1. Stop all services"
    echo "  2. Restore database"
    echo "  3. Restore volumes"
    echo "  4. Restore configurations"
    echo "  5. Restart all services"
    echo ""
    read -p "Type 'RESTORE' to confirm: " confirm
    
    if [ "$confirm" != "RESTORE" ]; then
        log "Full system restore cancelled by user"
        return 1
    fi
    
    log "Starting full system restore..."
    
    try {
        TEMP_DIR="/tmp/restore-full-$TIMESTAMP"
        mkdir -p $TEMP_DIR
        cd $TEMP_DIR
        
        # 1. Stop services
        log "Stopping services..."
        cd /root/NEW\ START || cd /root
        docker-compose down || true
        
        # 2. Extract backup
        log "Extracting backup..."
        cd $TEMP_DIR
        tar xzf $RESTORE_FILE
        
        # 3. Restore database
        log "Restoring database..."
        cd /root/NEW\ START || cd /root
        docker-compose up -d wms-database
        sleep 10
        
        if [ -f "$TEMP_DIR/warehouse_wms.sql" ]; then
            docker exec -i wms-database mysql \
                -u $DB_USER \
                -p$DB_PASS \
                -e "DROP DATABASE IF EXISTS $PROD_DB; CREATE DATABASE $PROD_DB;" || true
            
            docker exec -i wms-database mysql \
                -u $DB_USER \
                -p$DB_PASS \
                $PROD_DB < "$TEMP_DIR/warehouse_wms.sql"
            
            success "Production database restored"
        fi
        
        if [ -f "$TEMP_DIR/warehouse_wms_staging.sql" ]; then
            docker exec -i wms-database mysql \
                -u $DB_USER \
                -p$DB_PASS \
                -e "DROP DATABASE IF EXISTS $STAGING_DB; CREATE DATABASE $STAGING_DB;" || true
            
            docker exec -i wms-database mysql \
                -u $DB_USER \
                -p$DB_PASS \
                $STAGING_DB < "$TEMP_DIR/warehouse_wms_staging.sql"
            
            success "Staging database restored"
        fi
        
        # 4. Restore volumes
        if [ -f "$TEMP_DIR/volumes.tar.gz" ]; then
            log "Restoring volumes..."
            docker run --rm -v wms-db-data:/data \
                -v $TEMP_DIR:/backup \
                alpine tar xzf /backup/volumes.tar.gz -C / || true
            success "Volumes restored"
        fi
        
        # 5. Restore configuration
        if [ -f "$TEMP_DIR/config.tar.gz" ]; then
            log "Restoring configurations..."
            cd /root/NEW\ START || cd /root
            tar xzf "$TEMP_DIR/config.tar.gz" || true
            success "Configurations restored"
        fi
        
        # 6. Start services
        log "Starting services..."
        cd /root/NEW\ START || cd /root
        docker-compose up -d
        
        sleep 10
        
        success "FULL SYSTEM RESTORE COMPLETE!"
        success "Services are now running"
        
        # Cleanup
        rm -rf $TEMP_DIR
        
    } catch {
        error "Full system restore failed!"
        return 1
    }
}

# ============================================
# LIST BACKUPS
# ============================================

list_backups() {
    echo -e "${GREEN}📁 Backup System Status${NC}"
    echo "════════════════════════════════════════"
    echo ""
    
    echo -e "${YELLOW}Quick Backups (5-min interval, 24h retention):${NC}"
    COUNT=$(ls -1 $BACKUP_DIR/database-*.sql.gz 2>/dev/null | wc -l)
    echo "Count: $COUNT backups"
    ls -lh $BACKUP_DIR/database-*.sql.gz 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'
    
    echo ""
    echo -e "${YELLOW}Full Backups (daily at 2 AM, 7-day retention):${NC}"
    COUNT=$(ls -1 $BACKUP_DIR/full-system-*.tar.gz 2>/dev/null | wc -l)
    echo "Count: $COUNT backups"
    ls -lh $BACKUP_DIR/full-system-*.tar.gz 2>/dev/null | tail -7 | awk '{print "  " $9 " (" $5 ")"}'
    
    echo ""
    echo -e "${YELLOW}Space Used:${NC}"
    du -sh $BACKUP_DIR | awk '{print "  Total: " $1}'
    
    echo ""
    echo -e "${YELLOW}Recent Log:${NC}"
    tail -5 $LOG_FILE | awk '{print "  " $0}'
    
    echo ""
    echo "════════════════════════════════════════"
}

# ============================================
# MAIN MENU
# ============================================

main() {
    init_backup_system
    
    case "${1:-help}" in
        quick)
            backup_database_quick
            ;;
        full)
            backup_full_system
            ;;
        restore-db)
            restore_database "$2"
            ;;
        restore-full)
            restore_full_system "$2"
            ;;
        list)
            list_backups
            ;;
        help|--help|-h)
            echo "╔════════════════════════════════════════╗"
            echo "║  BACKUP & RECOVERY SYSTEM              ║"
            echo "╚════════════════════════════════════════╝"
            echo ""
            echo "Usage: $0 {command} [args]"
            echo ""
            echo "Commands:"
            echo "  quick [FILE]            Quick database backup (5-min interval)"
            echo "  full                    Full system backup (daily)"
            echo "  restore-db FILE         Restore database from backup"
            echo "  restore-full FILE       Full system restore"
            echo "  list                    List all backups"
            echo "  help                    Show this help"
            echo ""
            echo "Examples:"
            echo "  $0 quick"
            echo "  $0 full"
            echo "  $0 list"
            echo "  $0 restore-db /root/backups/database-20251028_000000.sql.gz"
            echo "  $0 restore-full /root/backups/full-system-20251028_000000.tar.gz"
            echo ""
            ;;
        *)
            error "Unknown command: $1"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
