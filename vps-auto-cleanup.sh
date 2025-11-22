#!/bin/bash
# VPS Auto-Cleanup & Resource Monitor
# Purpose: Prevent memory exhaustion and crashes
# Run via cron: */30 * * * * /root/NEW\ START/vps-auto-cleanup.sh

LOGFILE="/root/cleanup.log"
MEMORY_THRESHOLD=85  # Alert if memory > 85%
SWAP_THRESHOLD=50    # Alert if swap > 50%

echo "=== Cleanup $(date) ===" >> $LOGFILE

# 1. Check memory usage
MEMORY_USED=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
SWAP_USED=$(free | grep Swap | awk '{print ($3/$2) * 100.0}' | cut -d. -f1 2>/dev/null || echo 0)

echo "Memory: ${MEMORY_USED}% | Swap: ${SWAP_USED}%" >> $LOGFILE

# 2. Stop VS Code server if running (permanent block)
if pgrep -f "vscode-server" > /dev/null; then
    echo "VS Code detected - killing..." >> $LOGFILE
    pkill -9 -f "vscode-server"
    rm -rf ~/.vscode-server ~/.vscode-server-insiders /tmp/vscode-* 2>/dev/null
fi

# 3. Clean Docker cache if memory high (SAFE - excludes volumes & running containers)
if [ "$MEMORY_USED" -gt "$MEMORY_THRESHOLD" ]; then
    echo "Memory HIGH (${MEMORY_USED}%) - cleaning Docker..." >> $LOGFILE
    # Only clean: stopped containers, unused networks, dangling images
    # NEVER touches: volumes, running containers, named images
    docker system prune -f --volumes=false >> $LOGFILE 2>&1
fi

# 4. Stop staging if running (production only mode)
# NOTE: Staging auto-starts during GitHub Actions deployment
if docker ps | grep -q "wms-staging"; then
    # Check if staging was recently started (within last 10 minutes)
    STAGING_UPTIME=$(docker inspect wms-staging-backend --format='{{.State.StartedAt}}' 2>/dev/null || echo "")
    if [ -n "$STAGING_UPTIME" ]; then
        STARTED_TS=$(date -d "$STAGING_UPTIME" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$STAGING_UPTIME" +%s 2>/dev/null)
        CURRENT_TS=$(date +%s)
        UPTIME_MINUTES=$(( ($CURRENT_TS - $STARTED_TS) / 60 ))
        
        # Only stop if running for more than 30 minutes (deployment finished)
        if [ "$UPTIME_MINUTES" -gt 30 ]; then
            echo "Staging running for ${UPTIME_MINUTES}min - stopping to save memory..." >> $LOGFILE
            cd "/root/NEW START" && docker-compose -f docker-compose-staging-isolated.yml down >> $LOGFILE 2>&1
        else
            echo "Staging recently started (${UPTIME_MINUTES}min ago) - keeping running (deployment in progress)" >> $LOGFILE
        fi
    fi
fi

# 5. Clean old logs (keep last 7 days) - SAFE: only .log files, never database/uploads
find /root/NEW\ START/backend/logs -name "*.log" -mtime +7 -delete 2>/dev/null
find /tmp -name "*.tmp" -mtime +1 -delete 2>/dev/null
# PROTECTION: Never touch uploads or database backups
# /app/uploads - PROTECTED (user files)
# mysql_data volume - PROTECTED (database)
# /backups - PROTECTED (database backups)

# 6. Restart production if unhealthy
if ! docker exec wms-backend wget -qO- http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "Backend unhealthy - restarting..." >> $LOGFILE
    cd "/root/NEW START" && docker-compose restart backend >> $LOGFILE 2>&1
fi

echo "Cleanup complete" >> $LOGFILE
echo "" >> $LOGFILE
