# STAGING ENVIRONMENT - QUICK COMMANDS
# Add these to your PowerShell profile or run directly

## ============================================
## STAGING CONTROL COMMANDS
## ============================================

# Stop Staging (Save ~900MB RAM)
function staging-off {
    Write-Host "⏹️  Stopping staging environment..." -ForegroundColor Yellow
    ssh root@148.230.107.155 "docker stop wms-staging-backend wms-staging-frontend wms-staging-db"
    Write-Host "✅ Staging stopped! Memory freed: ~900MB" -ForegroundColor Green
    ssh root@148.230.107.155 "free -h"
}

# Start Staging
function staging-on {
    Write-Host "▶️  Starting staging environment..." -ForegroundColor Green
    ssh root@148.230.107.155 "docker start wms-staging-backend wms-staging-frontend wms-staging-db"
    Write-Host "✅ Staging started!" -ForegroundColor Green
    Start-Sleep -Seconds 3
    ssh root@148.230.107.155 "free -h"
}

# Check Staging Status
function staging-status {
    Write-Host "📊 Staging Environment Status:" -ForegroundColor Cyan
    ssh root@148.230.107.155 "docker ps -a --filter name=wms-staging --format 'table {{.Names}}\t{{.Status}}'"
    Write-Host ""
    Write-Host "💾 Memory Usage:" -ForegroundColor Cyan
    ssh root@148.230.107.155 "free -h"
}

# Restart Staging
function staging-restart {
    Write-Host "🔄 Restarting staging environment..." -ForegroundColor Yellow
    ssh root@148.230.107.155 "docker restart wms-staging-backend wms-staging-frontend wms-staging-db"
    Write-Host "✅ Staging restarted!" -ForegroundColor Green
}

# Staging Logs
function staging-logs {
    Write-Host "📋 Staging Backend Logs:" -ForegroundColor Cyan
    ssh root@148.230.107.155 "docker logs wms-staging-backend --tail 50 --follow"
}

## ============================================
## HOW TO USE:
## ============================================
# 1. Source this file in your PowerShell session:
#    . .\STAGING-COMMANDS.ps1
#
# 2. Then use the commands:
#    staging-off      # Stop staging (save RAM)
#    staging-on       # Start staging  
#    staging-status   # Check status
#    staging-restart  # Restart staging
#    staging-logs     # View logs
##
## OR: Add to PowerShell Profile for permanent use:
##     notepad $PROFILE
##     Copy these functions to your profile
## ============================================

Write-Host ""
Write-Host "✅ Staging commands loaded!" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  staging-on       - Start staging environment" -ForegroundColor White
Write-Host "  staging-off      - Stop staging (save 900MB RAM)" -ForegroundColor White
Write-Host "  staging-status   - Check status" -ForegroundColor White
Write-Host "  staging-restart  - Restart staging" -ForegroundColor White
Write-Host "  staging-logs     - View backend logs" -ForegroundColor White
Write-Host ""
