#!/usr/bin/env pwsh
# Environment Management Script - Switch between Production and Staging
# Usage: .\manage-environments.ps1 -Environment "production" -Action "start"

param(
    [ValidateSet("production", "staging")]
    [string]$Environment = "production",
    
    [ValidateSet("start", "stop", "restart", "status", "logs", "cleanup")]
    [string]$Action = "status",
    
    [string]$VPS = "root@148.230.107.155"
)

$ErrorActionPreference = "Continue"

# Colors
$Success = @{ForegroundColor = "Green"}
$Error = @{ForegroundColor = "Red"}
$Warn = @{ForegroundColor = "Yellow"}
$Info = @{ForegroundColor = "Cyan"}

Write-Host "╔═══════════════════════════════════════════════════════════╗" @Info
Write-Host "║  WMS Environment Manager                                  ║" @Info
Write-Host "║  Environment: $(if($Environment -eq 'production'){'🔴 PRODUCTION'}else{'🟢 STAGING'}) | Action: $Action" @Info
Write-Host "╚═══════════════════════════════════════════════════════════╝" @Info
Write-Host ""

# Determine compose file and services
$composeFile = if ($Environment -eq "production") { 
    "docker-compose-production.yml" 
} else { 
    "docker-compose-staging-isolated.yml" 
}

$networkName = if ($Environment -eq "production") { 
    "wms-prod-network" 
} else { 
    "staging-network" 
}

$services = if ($Environment -eq "production") {
    @("database", "backend", "frontend", "db-backup", "portainer")
} else {
    @("staging-db", "staging-backend", "staging-frontend", "staging-db-backup")
}

$containerPrefix = if ($Environment -eq "production") { "wms-" } else { "wms-staging-" }

# ==============================================================
# FUNCTIONS
# ==============================================================

function Invoke-VPS {
    param([string]$Command)
    ssh $VPS "cd '/root/NEW START' && $Command"
}

function Show-Status {
    Write-Host "📊 $Environment Status:" @Info
    Write-Host ""
    
    $cmd = "docker ps -a --filter 'network=$networkName' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo 'No containers found'"
    
    $status = Invoke-VPS $cmd
    Write-Host $status
    Write-Host ""
}

function Start-Environment {
    Write-Host "🚀 Starting $Environment environment..." @Info
    Write-Host ""
    
    # Stop the other environment first
    $otherEnv = if ($Environment -eq "production") { "staging" } else { "production" }
    Write-Host "⏹️  Stopping $otherEnv environment first..." @Warn
    
    $otherCompose = if ($otherEnv -eq "production") {
        "docker-compose-production.yml"
    } else {
        "docker-compose-staging-isolated.yml"
    }
    
    Invoke-VPS "docker-compose -f $otherCompose down 2>&1 | grep -E '(Stopping|Removing)' || true"
    
    Write-Host ""
    Write-Host "✅ Starting $Environment..." @Success
    
    $cmd = "docker-compose -f $composeFile up -d --build 2>&1 | tail -5"
    $result = Invoke-VPS $cmd
    Write-Host $result
    
    Write-Host ""
    Write-Host "⏳ Waiting for services to start..." @Warn
    Start-Sleep -Seconds 5
    
    Show-Status
}

function Stop-Environment {
    Write-Host "⏹️  Stopping $Environment environment..." @Warn
    Write-Host ""
    
    $cmd = "docker-compose -f $composeFile down 2>&1 | grep -E '(Stopping|Removing|Removed)'"
    $result = Invoke-VPS $cmd
    Write-Host $result
    
    Write-Host ""
    Write-Host "✅ Stopped successfully" @Success
}

function Restart-Environment {
    Write-Host "🔄 Restarting $Environment environment..." @Warn
    Write-Host ""
    
    $cmd = "docker-compose -f $composeFile restart 2>&1"
    $result = Invoke-VPS $cmd
    Write-Host $result
    
    Write-Host ""
    Write-Host "⏳ Waiting for services..." @Warn
    Start-Sleep -Seconds 3
    
    Show-Status
}

function Show-Logs {
    Write-Host "📋 Recent logs from $Environment:" @Info
    Write-Host ""
    
    $cmd = "docker-compose -f $composeFile logs --tail 30 2>&1"
    $logs = Invoke-VPS $cmd
    Write-Host $logs
}

function Cleanup-Environment {
    Write-Host "🧹 Cleaning up $Environment environment..." @Warn
    Write-Host ""
    
    # Remove unused images/volumes for this environment
    $cmd = @"
        echo "Removing unused resources..."
        docker volume prune -f --filter "label!=$Environment" > /dev/null 2>&1 || true
        docker image prune -f > /dev/null 2>&1 || true
        echo "✅ Cleanup complete"
        docker system df | head -4
"@
    
    $result = Invoke-VPS $cmd
    Write-Host $result
}

# ==============================================================
# MAIN EXECUTION
# ==============================================================

try {
    Write-Host "Connecting to VPS..." @Info
    Write-Host ""
    
    switch ($Action) {
        "start" {
            Start-Environment
        }
        "stop" {
            Stop-Environment
        }
        "restart" {
            Restart-Environment
        }
        "status" {
            Show-Status
        }
        "logs" {
            Show-Logs
        }
        "cleanup" {
            Cleanup-Environment
        }
    }
    
    Write-Host ""
    Write-Host "✅ Command completed successfully!" @Success
}
catch {
    Write-Host ""
    Write-Host "❌ Error: $_" @Error
    exit 1
}

# ==============================================================
# HELPFUL INFO
# ==============================================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" 
Write-Host "📌 QUICK COMMANDS:" @Info
Write-Host ""
Write-Host "  # Start production" -ForegroundColor Gray
Write-Host "  .\manage-environments.ps1 -Environment production -Action start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Start staging" -ForegroundColor Gray
Write-Host "  .\manage-environments.ps1 -Environment staging -Action start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Check status" -ForegroundColor Gray
Write-Host "  .\manage-environments.ps1 -Environment staging -Action status" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # View logs" -ForegroundColor Gray
Write-Host "  .\manage-environments.ps1 -Environment production -Action logs" -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
