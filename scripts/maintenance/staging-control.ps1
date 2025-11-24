#!/usr/bin/env pwsh
# Staging Environment Control Script
# Usage: .\staging-control.ps1 [start|stop|status|restart]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('start', 'stop', 'status', 'restart', 'logs')]
    [string]$Action = 'status'
)

$VPS_HOST = "root@148.230.107.155"
$STAGING_CONTAINERS = @(
    "wms-staging-backend",
    "wms-staging-frontend", 
    "wms-staging-db"
)

function Show-Header {
    Write-Host ""
    Write-Host "🚀 ============================================" -ForegroundColor Cyan
    Write-Host "   STAGING ENVIRONMENT CONTROL" -ForegroundColor Cyan
    Write-Host "============================================ 🚀" -ForegroundColor Cyan
    Write-Host ""
}

function Get-Status {
    Write-Host "📊 Checking staging environment status..." -ForegroundColor Yellow
    Write-Host ""
    
    $containers = $STAGING_CONTAINERS -join " "
    $cmd = "docker ps -a --filter name=wms-staging --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    
    ssh $VPS_HOST $cmd
    
    Write-Host ""
    Write-Host "💾 Memory Usage:" -ForegroundColor Cyan
    ssh $VPS_HOST "docker stats --no-stream wms-staging-backend wms-staging-frontend wms-staging-db --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'"
}

function Start-Staging {
    Write-Host "▶️  Starting staging environment..." -ForegroundColor Green
    Write-Host ""
    
    foreach ($container in $STAGING_CONTAINERS) {
        Write-Host "   Starting $container..." -ForegroundColor Gray
        ssh $VPS_HOST "docker start $container"
    }
    
    Write-Host ""
    Write-Host "✅ Staging environment started!" -ForegroundColor Green
    Write-Host "⏳ Waiting 5 seconds for containers to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Get-Status
    
    Write-Host ""
    Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://staging.qgocargo.cloud" -ForegroundColor White
    Write-Host "   Backend:  http://staging.qgocargo.cloud/api" -ForegroundColor White
}

function Stop-Staging {
    Write-Host "⏹️  Stopping staging environment..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "💾 Memory before stopping:" -ForegroundColor Cyan
    ssh $VPS_HOST "free -h"
    Write-Host ""
    
    foreach ($container in $STAGING_CONTAINERS) {
        Write-Host "   Stopping $container..." -ForegroundColor Gray
        ssh $VPS_HOST "docker stop $container"
    }
    
    Write-Host ""
    Write-Host "✅ Staging environment stopped!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "💾 Memory after stopping:" -ForegroundColor Cyan
    ssh $VPS_HOST "free -h"
    
    Write-Host ""
    Write-Host "💡 Memory saved: ~900MB" -ForegroundColor Green
}

function Restart-Staging {
    Write-Host "🔄 Restarting staging environment..." -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($container in $STAGING_CONTAINERS) {
        Write-Host "   Restarting $container..." -ForegroundColor Gray
        ssh $VPS_HOST "docker restart $container"
    }
    
    Write-Host ""
    Write-Host "✅ Staging environment restarted!" -ForegroundColor Green
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Get-Status
}

function Show-Logs {
    Write-Host "📋 Staging Backend Logs (last 50 lines):" -ForegroundColor Cyan
    Write-Host ""
    ssh $VPS_HOST "docker logs wms-staging-backend --tail 50"
}

function Show-Help {
    Write-Host ""
    Write-Host "Usage: .\staging-control.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  start    - Start staging environment (Frontend + Backend + Database)" -ForegroundColor White
    Write-Host "  stop     - Stop staging environment (Save ~900MB RAM)" -ForegroundColor White
    Write-Host "  status   - Check current status and memory usage" -ForegroundColor White
    Write-Host "  restart  - Restart all staging containers" -ForegroundColor White
    Write-Host "  logs     - Show staging backend logs" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\staging-control.ps1 start" -ForegroundColor Gray
    Write-Host "  .\staging-control.ps1 stop" -ForegroundColor Gray
    Write-Host "  .\staging-control.ps1 status" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
Show-Header

switch ($Action) {
    'start' {
        Start-Staging
    }
    'stop' {
        Stop-Staging
    }
    'status' {
        Get-Status
    }
    'restart' {
        Restart-Staging
    }
    'logs' {
        Show-Logs
    }
    default {
        Show-Help
    }
}

Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
Write-Host ""
