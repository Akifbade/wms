# ============================================
# DEPLOYMENT SCRIPT (Windows PowerShell)
# LOCAL → STAGING → PRODUCTION
# ============================================

param(
    [string]$Environment = "staging"
)

$RepoPath = Get-Location
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "🚀 Deployment Script" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Timestamp: $Timestamp" -ForegroundColor Gray
Write-Host ""

# ============================================
# STAGING DEPLOYMENT
# ============================================
function Deploy-Staging {
    Write-Host "[INFO] Starting STAGING deployment..." -ForegroundColor Blue
    
    # Git operations
    Write-Host "[INFO] Committing changes..." -ForegroundColor Blue
    & git add -A
    & git commit -m "Staging deploy: $Timestamp" --no-edit 2>&1 | Where-Object { $_ -notmatch "nothing to commit" }
    
    # Build and start staging
    Write-Host "[INFO] Building staging services..." -ForegroundColor Blue
    & docker-compose -f docker-compose-dual-env.yml build staging-frontend staging-backend
    
    Write-Host "[INFO] Starting staging environment..." -ForegroundColor Blue
    & docker-compose -f docker-compose-dual-env.yml up -d staging-database staging-backend staging-frontend
    
    Write-Host "[INFO] Waiting for services..." -ForegroundColor Blue
    Start-Sleep -Seconds 5
    
    Write-Host "[SUCCESS] STAGING deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Access & Test:" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:8080" -ForegroundColor Yellow
    Write-Host "  Backend:  http://localhost:5001" -ForegroundColor Yellow
    Write-Host "  Database: localhost:3308" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "When satisfied, run: .\deploy.ps1 production" -ForegroundColor Cyan
}

# ============================================
# PRODUCTION DEPLOYMENT
# ============================================
function Deploy-Production {
    Write-Host "[WARNING] You are deploying to PRODUCTION!" -ForegroundColor Red
    Write-Host "This will affect the LIVE system!" -ForegroundColor Red
    Write-Host ""
    
    $confirmation = Read-Host "Type 'CONFIRM' to proceed"
    
    if ($confirmation -ne "CONFIRM") {
        Write-Host "[ERROR] Production deployment cancelled" -ForegroundColor Red
        exit 1
    }
    
    # Backup production database
    Write-Host "[INFO] Backing up production database..." -ForegroundColor Blue
    $BackupFile = "backups/production-backup-$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    New-Item -ItemType Directory -Path "backups" -Force | Out-Null
    
    & docker exec wms-production-db mysqldump -u wms_user -pwmspassword123 warehouse_wms | Out-File -FilePath $BackupFile -Encoding ASCII
    Write-Host "[SUCCESS] Backup created: $BackupFile" -ForegroundColor Green
    
    # Git operations
    Write-Host "[INFO] Committing changes..." -ForegroundColor Blue
    & git add -A
    & git commit -m "Production deploy: $Timestamp" --no-edit 2>&1 | Where-Object { $_ -notmatch "nothing to commit" }
    
    Write-Host "[INFO] Pushing to production branch..." -ForegroundColor Blue
    & git push origin stable/prisma-mysql-production 2>&1 | Out-Null
    
    # Build and start production
    Write-Host "[INFO] Building production services..." -ForegroundColor Blue
    & docker-compose -f docker-compose-dual-env.yml build production-frontend production-backend
    
    Write-Host "[INFO] Stopping old services..." -ForegroundColor Blue
    & docker-compose -f docker-compose-dual-env.yml stop production-frontend production-backend 2>&1 | Out-Null
    
    Write-Host "[INFO] Starting production environment..." -ForegroundColor Blue
    & docker-compose -f docker-compose-dual-env.yml up -d production-database production-backend production-frontend
    
    Write-Host "[INFO] Waiting for services..." -ForegroundColor Blue
    Start-Sleep -Seconds 5
    
    Write-Host "[SUCCESS] PRODUCTION deployment complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Production is now LIVE!" -ForegroundColor Green
    Write-Host "  Frontend: https://qgocargo.cloud" -ForegroundColor Yellow
    Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Yellow
    Write-Host "  Database: localhost:3307" -ForegroundColor Yellow
}

# ============================================
# STATUS CHECK
# ============================================
function Check-Status {
    Write-Host "[INFO] Checking environment status..." -ForegroundColor Blue
    Write-Host ""
    
    Write-Host "STAGING Services:" -ForegroundColor Cyan
    & docker-compose -f docker-compose-dual-env.yml ps staging-* 2>&1
    
    Write-Host ""
    Write-Host "PRODUCTION Services:" -ForegroundColor Cyan
    & docker-compose -f docker-compose-dual-env.yml ps production-* 2>&1
}

# ============================================
# ROLLBACK
# ============================================
function Rollback-Production {
    Write-Host "[WARNING] Rolling back production..." -ForegroundColor Red
    
    $timestamp = Read-Host "Enter backup timestamp (e.g., 20251028_091234)"
    $BackupFile = "backups/production-backup-$timestamp.sql"
    
    if (-Not (Test-Path $BackupFile)) {
        Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[INFO] Restoring from: $BackupFile" -ForegroundColor Blue
    Get-Content $BackupFile | & docker exec -i wms-production-db mysql -u wms_user -pwmspassword123 warehouse_wms
    
    Write-Host "[SUCCESS] Rollback complete!" -ForegroundColor Green
}

# ============================================
# MAIN MENU
# ============================================
switch ($Environment.ToLower()) {
    "staging" {
        Deploy-Staging
    }
    "production" {
        Deploy-Production
    }
    "status" {
        Check-Status
    }
    "rollback" {
        Rollback-Production
    }
    default {
        Write-Host "Usage: .\deploy.ps1 [staging|production|status|rollback]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Cyan
        Write-Host "  staging    - Deploy to staging for testing" -ForegroundColor Gray
        Write-Host "  production - Deploy to production (LIVE)" -ForegroundColor Gray
        Write-Host "  status     - Check environment status" -ForegroundColor Gray
        Write-Host "  rollback   - Rollback production from backup" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Workflow:" -ForegroundColor Cyan
        Write-Host "  1. .\deploy.ps1 staging      (Test)" -ForegroundColor Gray
        Write-Host "  2. .\deploy.ps1 production   (Go Live)" -ForegroundColor Gray
    }
}
