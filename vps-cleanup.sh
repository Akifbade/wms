#!/bin/bash
# VPS Resource Cleanup Script
# Automatically fixes high CPU, RAM, and disk usage issues

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🔧 VPS RESOURCE CLEANUP SCRIPT                    ║"
echo "║         Auto-fix High CPU/RAM/Disk Issues                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️ ${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_section() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ $1"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

# Get current disk usage
get_disk_usage() {
    df -h / | tail -1 | awk '{print $5}' | sed 's/%//'
}

get_disk_free() {
    df -h / | tail -1 | awk '{print $4}'
}

# ============================================================
log_section "📊 BEFORE CLEANUP - Current Status"
# ============================================================

BEFORE_DISK=$(get_disk_usage)
BEFORE_FREE=$(get_disk_free)

echo "Disk Usage: ${BEFORE_DISK}%"
echo "Disk Free: ${BEFORE_FREE}"
echo ""
echo "Memory Usage:"
free -h | head -2 | tail -1

echo ""
echo "Docker Stats:"
docker system df | grep -E "^TYPE|Images|Containers"

# ============================================================
log_section "🧹 STEP 1: Backup Files Cleanup"
# ============================================================

BACKUPS_PATH="/root/NEW START/backups"
if [ -d "$BACKUPS_PATH" ]; then
    BACKUP_SIZE_BEFORE=$(du -sh "$BACKUPS_PATH" 2>/dev/null | awk '{print $1}')
    
    log_warn "Backup directory found: $BACKUP_SIZE_BEFORE"
    log_info "Keeping last 3 backups, removing older ones..."
    
    cd "$BACKUPS_PATH"
    # Keep last 3, delete older
    ls -t | tail -n +4 | while read old_backup; do
        if [ -d "$old_backup" ]; then
            log_info "Removing: $old_backup"
            rm -rf "$old_backup"
        fi
    done
    
    BACKUP_SIZE_AFTER=$(du -sh "$BACKUPS_PATH" 2>/dev/null | awk '{print $1}')
    log_info "Backup cleanup complete. New size: $BACKUP_SIZE_AFTER"
else
    log_warn "Backup directory not found"
fi

# ============================================================
log_section "🔄 STEP 2: Remove Old Build Backups"
# ============================================================

OLD_BACKENDS="/root/NEW START/backend_local_backup_"*
OLD_FRONTENDS="/root/NEW START/frontend_local_backup_"*

for backup in $OLD_BACKENDS $OLD_FRONTENDS; do
    if [ -d "$backup" ]; then
        SIZE=$(du -sh "$backup" | awk '{print $1}')
        log_info "Removing old backup: $(basename $backup) ($SIZE)"
        rm -rf "$backup"
    fi
done

log_info "Old build backups removed"

# ============================================================
log_section "🐳 STEP 3: Docker System Cleanup"
# ============================================================

log_info "Removing unused Docker images..."
docker image prune -a -f --filter "until=168h" > /dev/null

log_info "Removing unused containers..."
docker container prune -f > /dev/null

log_info "Removing unused volumes..."
docker volume prune -f > /dev/null

log_info "Clearing build cache..."
docker builder prune -a -f > /dev/null

log_info "Docker cleanup complete"

# ============================================================
log_section "🔧 STEP 4: Restart High-Memory Services"
# ============================================================

log_info "Checking service health..."

# Restart git watcher if it's using too much memory
log_info "Restarting wms-git-watcher (cleanup memory leak)..."
docker restart wms-git-watcher > /dev/null 2>&1 || log_warn "Git watcher restart failed (may not exist)"

# Restart backend if needed
log_info "Restarting wms-backend..."
docker restart wms-backend > /dev/null 2>&1 || log_warn "Backend restart failed"

log_info "Services restarted"

# ============================================================
log_section "🗑️  STEP 5: Clean Application Logs"
# ============================================================

log_info "Clearing old logs..."

# Find and truncate old log files
find /root/NEW\ START -name "*.log" -type f -mtime +7 -exec rm {} \; 2>/dev/null || true

# Truncate current logs to free memory
for logfile in /var/log/syslog /var/log/auth.log; do
    if [ -f "$logfile" ]; then
        truncate -s 100M "$logfile" 2>/dev/null || true
    fi
done

log_info "Log cleanup complete"

# ============================================================
log_section "📦 STEP 6: Git Repository Optimization"
# ============================================================

log_info "Optimizing git repository..."
cd "/root/NEW START"

# Garbage collection
git gc --aggressive > /dev/null 2>&1 || log_warn "Git GC failed"

# Remove reflog
git reflog expire --expire=now --all > /dev/null 2>&1 || log_warn "Reflog expire failed"

# Final cleanup
git prune > /dev/null 2>&1 || log_warn "Git prune failed"

log_info "Git optimization complete"

# ============================================================
log_section "✨ CLEANUP COMPLETE"
# ============================================================

AFTER_DISK=$(get_disk_usage)
AFTER_FREE=$(get_disk_free)

echo ""
echo "📊 RESULTS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Disk Usage:  ${BEFORE_DISK}% → ${AFTER_DISK}%"
if (( $(echo "$BEFORE_DISK > $AFTER_DISK" | bc -l) )); then
    SAVED=$((BEFORE_DISK - AFTER_DISK))
    echo -e "Improvement: ${GREEN}${SAVED}% freed up!${NC}"
else
    echo -e "Status: ${YELLOW}No significant change${NC}"
fi

echo ""
echo "Disk Free:   ${BEFORE_FREE} → ${AFTER_FREE}"
echo ""

echo "Current Disk Usage:"
df -h / | tail -1 | awk '{printf "  %s used / %s total (%s available)\n", $3, $2, $4}'

echo ""
echo "Memory Status:"
free -h | head -2 | tail -1 | awk '{printf "  %s used / %s total\n", $3, $2}'

echo ""
echo "Docker Status:"
docker system df | grep -E "^TYPE|Images|Containers|Volumes|Build" | head -5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_info "VPS cleanup completed successfully! 🎉"
echo ""

# Check if we should warn about remaining issues
CURRENT_DISK=$(get_disk_usage)
if (( CURRENT_DISK > 80 )); then
    log_warn "Disk usage still HIGH (${CURRENT_DISK}%)"
    log_warn "Additional cleanup may be needed"
    echo "  Consider:"
    echo "    - Archiving database to external storage"
    echo "    - Removing test/staging databases"
    echo "    - Upgrading disk size"
elif (( CURRENT_DISK > 70 )); then
    log_warn "Disk usage still elevated (${CURRENT_DISK}%)"
    log_info "Continue monitoring"
else
    log_info "Disk usage now healthy (${CURRENT_DISK}%)"
fi

echo ""
echo "✅ Cleanup finished at $(date '+%Y-%m-%d %H:%M:%S')"
