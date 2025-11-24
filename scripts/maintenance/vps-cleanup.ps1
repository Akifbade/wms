#!/usr/bin/env pwsh
# VPS Resource Cleanup Script (PowerShell Version)
# Runs cleanup commands on remote VPS via SSH

param(
    [string]$VPSHost = "root@148.230.107.155",
    [bool]$AutoConfirm = $false
)

$ErrorActionPreference = "Continue"

Write-Host @"
╔════════════════════════════════════════════════════════════╗
║         🔧 VPS RESOURCE CLEANUP - PowerShell              ║
║         Auto-fix High CPU/RAM/Disk Issues                 ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Colors
$SuccessColor = @{ForegroundColor = "Green"}
$ErrorColor = @{ForegroundColor = "Red"}
$WarnColor = @{ForegroundColor = "Yellow"}
$InfoColor = @{ForegroundColor = "Cyan"}

function Log-Info {
    param([string]$Message)
    Write-Host "✅ $Message" @SuccessColor
}

function Log-Warn {
    param([string]$Message)
    Write-Host "⚠️  $Message" @WarnColor
}

function Log-Error {
    param([string]$Message)
    Write-Host "❌ $Message" @ErrorColor
}

function Log-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" @InfoColor
    Write-Host "║ $Title" @InfoColor
    Write-Host "╚════════════════════════════════════════════════════════════╝" @InfoColor
    Write-Host ""
}

# Confirmation
if (-not $AutoConfirm) {
    Write-Host ""
    Write-Host "This will cleanup your VPS and free up disk space." @WarnColor
    Write-Host "Actions:" @WarnColor
    Write-Host "  - Remove old backups (keeping last 3)" -ForegroundColor Gray
    Write-Host "  - Delete old build backups" -ForegroundColor Gray
    Write-Host "  - Docker system cleanup" -ForegroundColor Gray
    Write-Host "  - Restart high-memory services" -ForegroundColor Gray
    Write-Host "  - Clear old logs" -ForegroundColor Gray
    Write-Host "  - Optimize git repository" -ForegroundColor Gray
    Write-Host ""
    
    $response = Read-Host "Continue? (yes/no)"
    if ($response -ne "yes") {
        Write-Host "Cancelled" @ErrorColor
        exit 1
    }
}

# Get initial stats
Log-Section "📊 BEFORE CLEANUP - Current Status"

$statsScript = @'
echo "=== DISK USAGE ==="
df -h / | tail -1 | awk '{print "  "$3" used / "$2" total ("$5" usage)"}' 
echo ""
echo "=== MEMORY USAGE ==="
free -h | grep -E "^Mem:" | awk '{print "  "$3" used / "$2" total"}'
echo ""
echo "=== DOCKER ==="
docker system df | grep -E "^TYPE|Images|Containers"
'@

Write-Host "Connecting to VPS..." @InfoColor
$beforeStats = ssh $VPSHost $statsScript
Write-Host $beforeStats

# Run cleanup on remote VPS
Log-Section "🧹 RUNNING CLEANUP ON VPS"

$cleanupScript = @'
#!/bin/bash
set -e

# Step 1: Backup cleanup
echo "📦 Cleaning old backups..."
cd "/root/NEW START/backups" 2>/dev/null
ls -t 2>/dev/null | tail -n +4 | while read old; do
    if [ -n "$old" ]; then
        echo "  Removing: $old"
        rm -rf "$old"
    fi
done
echo "✅ Backup cleanup done"
echo ""

# Step 2: Remove old build backups
echo "📦 Removing old build backups..."
rm -rf "/root/NEW START/backend_local_backup_"* 2>/dev/null
rm -rf "/root/NEW START/frontend_local_backup_"* 2>/dev/null
echo "✅ Build backups removed"
echo ""

# Step 3: Docker cleanup
echo "🐳 Docker system cleanup..."
docker image prune -a -f --filter "until=168h" > /dev/null 2>&1
docker container prune -f > /dev/null 2>&1
docker volume prune -f > /dev/null 2>&1
docker builder prune -a -f > /dev/null 2>&1
echo "✅ Docker cleanup done"
echo ""

# Step 4: Restart services
echo "🔄 Restarting services..."
docker restart wms-git-watcher > /dev/null 2>&1 || true
docker restart wms-backend > /dev/null 2>&1 || true
echo "✅ Services restarted"
echo ""

# Step 5: Clean logs
echo "🗑️  Clearing old logs..."
find "/root/NEW START" -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
truncate -s 100M /var/log/syslog 2>/dev/null || true
truncate -s 100M /var/log/auth.log 2>/dev/null || true
echo "✅ Logs cleaned"
echo ""

# Step 6: Git optimization
echo "📦 Git repository optimization..."
cd "/root/NEW START"
git gc --aggressive > /dev/null 2>&1 || true
git reflog expire --expire=now --all > /dev/null 2>&1 || true
git prune > /dev/null 2>&1 || true
echo "✅ Git optimization done"
echo ""

echo "✅ ALL CLEANUP COMPLETE!"
'@

Write-Host "Executing cleanup commands..." @InfoColor
$result = ssh $VPSHost $cleanupScript
Write-Host $result

# Get final stats
Log-Section "📊 AFTER CLEANUP - Results"

$afterStats = ssh $VPSHost $statsScript
Write-Host $afterStats

Log-Section "✨ SUMMARY"

Write-Host ""
Write-Host "Cleanup completed successfully! 🎉" @SuccessColor
Write-Host ""
Write-Host "Next steps:" @InfoColor
Write-Host "  1. Monitor disk usage: ssh $VPSHost 'df -h /'" -ForegroundColor Gray
Write-Host "  2. Check service health: ssh $VPSHost 'docker ps'" -ForegroundColor Gray
Write-Host "  3. Test your application" -ForegroundColor Gray
Write-Host ""

Log-Warn "💡 Pro tip: Run this script monthly to maintain optimal disk space"
Write-Host ""
