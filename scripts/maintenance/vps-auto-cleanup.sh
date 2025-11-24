#!/bin/bash
# VPS Auto-Cleanup & Resource Monitor
# Purpose: Prevent memory exhaustion and crashes
# Run via cron: */30 * * * * /root/NEW\ START/vps-auto-cleanup.sh

LOGFILE="/root/cleanup.log"
MEMORY_THRESHOLD=80  # Alert if memory > 80% (lowered from 85%)
SWAP_THRESHOLD=40    # Alert if swap > 40% (lowered from 50%)
CPU_THRESHOLD=70     # NEW: Kill heavy processes if CPU > 70%

echo "=== Cleanup $(date) ===" >> $LOGFILE

# 1. Check system resources
MEMORY_USED=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
SWAP_USED=$(free | grep Swap | awk '{print ($3/$2) * 100.0}' | cut -d. -f1 2>/dev/null || echo 0)
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
CPU_PERCENT=$(echo "$CPU_LOAD * 50" | bc | cut -d. -f1)  # Convert load to % (2 cores = 100%)

echo "Memory: ${MEMORY_USED}% | Swap: ${SWAP_USED}% | CPU Load: ${CPU_LOAD} (${CPU_PERCENT}%)" >> $LOGFILE

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

# 3.5. CRITICAL: Remove node_modules from VPS (prevents 900MB context bloat during builds)
# These get pulled via git but should NEVER exist on VPS (Docker uses .dockerignore)
if [ -d "/root/NEW START/frontend/node_modules" ] || [ -d "/root/NEW START/backend/node_modules" ]; then
    echo "Found node_modules on VPS - removing to prevent build context bloat..." >> $LOGFILE
    rm -rf "/root/NEW START/frontend/node_modules" "/root/NEW START/backend/node_modules" 2>/dev/null
    echo "Cleaned node_modules (saves 900MB in Docker build context)" >> $LOGFILE
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
        
        # Only stop if running for more than 15 minutes (deployment finished) - REDUCED from 30
        if [ "$UPTIME_MINUTES" -gt 15 ]; then
            echo "Staging running for ${UPTIME_MINUTES}min - stopping to save memory..." >> $LOGFILE
            cd "/root/NEW START" && docker-compose -f docker-compose-staging-isolated.yml down >> $LOGFILE 2>&1
        else
            echo "Staging recently started (${UPTIME_MINUTES}min ago) - keeping running (deployment in progress)" >> $LOGFILE
        fi
    fi
fi

# 4.5. NEW: Kill runaway build processes (prevents 100% CPU)
# If npm/node/docker build processes run longer than 20 minutes, kill them
pkill -f "npm.*build" -older-than 1200 2>/dev/null || true  # 20 minutes = 1200 seconds
# Kill any stuck Vite processes
VITE_PIDS=$(pgrep -f "vite.*build" 2>/dev/null)
if [ -n "$VITE_PIDS" ]; then
    for PID in $VITE_PIDS; do
        RUNTIME=$(ps -o etimes= -p $PID 2>/dev/null | tr -d ' ')
        if [ -n "$RUNTIME" ] && [ "$RUNTIME" -gt 1200 ]; then
            echo "Killing stuck Vite process (PID: $PID, runtime: ${RUNTIME}s)" >> $LOGFILE
            kill -9 $PID 2>/dev/null
        fi
    done
fi

# 4.6. NEW: Emergency CPU protection
if [ "$CPU_PERCENT" -gt "$CPU_THRESHOLD" ]; then
    echo "CPU HIGH (${CPU_PERCENT}%) - stopping staging and cleaning..." >> $LOGFILE
    cd "/root/NEW START" && docker-compose -f docker-compose-staging-isolated.yml down 2>/dev/null
    docker system prune -f --volumes=false
    echo "Emergency CPU cleanup completed" >> $LOGFILE
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
