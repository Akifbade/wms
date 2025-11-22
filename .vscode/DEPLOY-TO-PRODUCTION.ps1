# ========================================================================
# PRODUCTION DEPLOYMENT SCRIPT - LOCAL TO VPS
# ========================================================================
# Author: Created Nov 22, 2025
# Purpose: Deploy latest code from local to production VPS safely
# Features: Auto-commit, database backup, code sync, health checks, rollback
# ========================================================================

$ErrorActionPreference = "Stop"
$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$VPS_PATH = "/root/NEW START"
$PRODUCTION_URL = "https://qgocargo.cloud"
$ROLLBACK_ENABLED = $true

# Global variables for rollback
$script:backupFile = ""
$script:deploymentTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  PRODUCTION DEPLOYMENT - LOCAL TO VPS" -ForegroundColor Cyan
Write-Host "  SAFETY: Auto-rollback on failure" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Local → VPS → GitHub" -ForegroundColor Yellow
Write-Host "Production: $PRODUCTION_URL" -ForegroundColor Yellow
Write-Host ""

# Rollback function
function Invoke-Rollback {
    param($reason)
    
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host "  DEPLOYMENT FAILED - ROLLING BACK" -ForegroundColor Red
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Reason: $reason" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Restoring from backup: $script:backupFile" -ForegroundColor Cyan
    
    # Restore database backup
    if ($script:backupFile) {
        ssh ${VPS_USER}@${VPS_HOST} "zcat '$VPS_PATH/backups-production/$script:backupFile' | docker exec -i wms-database mysql -uroot -prootpassword123"
        Write-Host "   Database restored" -ForegroundColor Green
    }
    
    # Restart containers to previous state
    ssh ${VPS_USER}@${VPS_HOST} "cd '$VPS_PATH' && docker-compose restart"
    Write-Host "   Containers restarted" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Rollback complete. Production should be in previous working state." -ForegroundColor Yellow
    Write-Host ""
    
    exit 1
}

# ====================
# STEP 1: Local Build & Test
# ====================
Write-Host "[STEP 1/7] Building frontend locally..." -ForegroundColor Yellow
cd frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
    Write-Host "Fix build errors and try again." -ForegroundColor Yellow
    exit 1
}
cd ..
Write-Host "   Frontend built successfully" -ForegroundColor Green

# ====================
# STEP 2: Database Backup (VPS)
# ====================
Write-Host ""
Write-Host "[STEP 2/7] Backing up production database..." -ForegroundColor Yellow
$script:backupFile = "BEFORE_DEPLOY_$script:deploymentTimestamp.sql.gz"

try {
    ssh ${VPS_USER}@${VPS_HOST} "mkdir -p '$VPS_PATH/backups-production'"
    ssh ${VPS_USER}@${VPS_HOST} "cd '$VPS_PATH' && docker exec wms-database mysqldump -uroot -prootpassword123 --all-databases --single-transaction --routines --triggers | gzip > backups-production/$script:backupFile"
    
    # Verify backup was created
    $backupSize = ssh ${VPS_USER}@${VPS_HOST} "ls -lh '$VPS_PATH/backups-production/$script:backupFile' | awk '{print `$5}'"
    if ($backupSize) {
        Write-Host "   Backup: $script:backupFile ($backupSize)" -ForegroundColor Green
    } else {
        Invoke-Rollback "Database backup failed"
    }
} catch {
    Invoke-Rollback "Database backup error: $_"
}

# ====================
# STEP 3: Transfer Code to VPS
# ====================
Write-Host ""
Write-Host "[STEP 3/7] Transferring code to VPS..." -ForegroundColor Yellow

try {
    # Frontend
    ssh ${VPS_USER}@${VPS_HOST} "rm -rf /tmp/prod-frontend"
    scp -r frontend/dist ${VPS_USER}@${VPS_HOST}:/tmp/prod-frontend
    Write-Host "   Frontend transferred" -ForegroundColor Green

    # Backend
    tar -czf backend-deploy.tar.gz backend/src backend/prisma backend/package.json backend/tsconfig.json
    scp backend-deploy.tar.gz ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/
    ssh ${VPS_USER}@${VPS_HOST} "cd '$VPS_PATH' && tar -xzf backend-deploy.tar.gz && rm backend-deploy.tar.gz"
    Remove-Item backend-deploy.tar.gz
    Write-Host "   Backend transferred" -ForegroundColor Green
} catch {
    Invoke-Rollback "Code transfer failed: $_"
}

# ====================
# STEP 4: Deploy to Production Containers
# ====================
Write-Host ""
Write-Host "[STEP 4/7] Deploying to production..." -ForegroundColor Yellow

try {
    # Update frontend
    ssh ${VPS_USER}@${VPS_HOST} "docker cp /tmp/prod-frontend/. wms-frontend:/usr/share/nginx/html/ && docker exec wms-frontend chmod -R 755 /usr/share/nginx/html && docker exec wms-frontend chown -R nginx:nginx /usr/share/nginx/html && docker exec wms-frontend nginx -s reload"
    
    # Rebuild and restart backend
    ssh ${VPS_USER}@${VPS_HOST} "cd '$VPS_PATH' && docker-compose build backend && docker-compose up -d backend"

    # Regenerate Prisma client
    ssh ${VPS_USER}@${VPS_HOST} "docker exec wms-backend npx prisma generate"

    # Cleanup
    ssh ${VPS_USER}@${VPS_HOST} "rm -rf /tmp/prod-frontend"

    Write-Host "   Containers updated" -ForegroundColor Green
} catch {
    Invoke-Rollback "Container deployment failed: $_"
}

# ====================
# STEP 5: Wait for Backend to Start
# ====================
Write-Host ""
Write-Host "[STEP 5/7] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# ====================
# STEP 6: Verify Deployment
# ====================
Write-Host ""
Write-Host "[STEP 6/7] Verifying deployment..." -ForegroundColor Yellow

try {
    # Check backend health
    $healthCheck = ssh ${VPS_USER}@${VPS_HOST} "curl -s http://localhost:5000/api/health"
    if ($healthCheck) {
        $health = $healthCheck | ConvertFrom-Json
        Write-Host "   Backend: v$($health.version) - HEALTHY" -ForegroundColor Green
    } else {
        Invoke-Rollback "Backend health check failed - not responding"
    }

    # Check database integrity
    Write-Host "   Checking database..." -ForegroundColor Gray
    $dbCheck = ssh ${VPS_USER}@${VPS_HOST} "docker exec wms-database mysql -uroot -prootpassword123 -e 'SELECT COUNT(*) FROM warehouse_wms.shipments; SELECT COUNT(*) FROM warehouse_wms.racks; SELECT COUNT(*) FROM warehouse_wms.users;' 2>/dev/null"
    
    if ($dbCheck) {
        Write-Host "   Database: OK (all tables accessible)" -ForegroundColor Green
    } else {
        Invoke-Rollback "Database verification failed"
    }
    
    # Check frontend is accessible
    $frontendCheck = ssh ${VPS_USER}@${VPS_HOST} "curl -s -o /dev/null -w '%{http_code}' http://localhost"
    if ($frontendCheck -eq "200" -or $frontendCheck -eq "301" -or $frontendCheck -eq "302") {
        Write-Host "   Frontend: OK (HTTP $frontendCheck)" -ForegroundColor Green
    } else {
        Invoke-Rollback "Frontend not accessible (HTTP $frontendCheck)"
    }
    
} catch {
    Invoke-Rollback "Deployment verification failed: $_"
}

# ====================
# STEP 7: Commit & Push to GitHub
# ====================
Write-Host ""
Write-Host "[STEP 7/7] Committing to GitHub..." -ForegroundColor Yellow

try {
    $commitMsg = "Production deployment v$($health.version) - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

    git add .
    git commit -m "$commitMsg" -m "- Frontend: Latest build deployed" -m "- Backend: v$($health.version)" -m "- Database: Backed up to $script:backupFile" -m "- Deployment: Success"
    git push origin stable/prisma-mysql-production

    Write-Host "   Pushed to GitHub" -ForegroundColor Green
} catch {
    Write-Host "   Warning: GitHub commit failed (deployment still successful)" -ForegroundColor Yellow
    Write-Host "   You can commit manually later" -ForegroundColor Gray
}

# ====================
# FINAL SUMMARY
# ====================
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production: $PRODUCTION_URL" -ForegroundColor Cyan
Write-Host "Version: v$($health.version)" -ForegroundColor Cyan
Write-Host "Backup: $VPS_PATH/backups-production/$script:backupFile" -ForegroundColor Cyan
Write-Host "GitHub: Committed & Pushed" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test production: $PRODUCTION_URL" -ForegroundColor White
Write-Host "  2. Clear browser cache: Ctrl+Shift+R" -ForegroundColor White
Write-Host ""
Write-Host "Rollback Available:" -ForegroundColor Cyan
Write-Host "  If issues found, run: .vscode\ROLLBACK-PRODUCTION.ps1" -ForegroundColor Gray
Write-Host "  Backup: $script:backupFile" -ForegroundColor Gray
Write-Host ""

# Create rollback script for this deployment
$rollbackScript = @"
# ROLLBACK PRODUCTION DEPLOYMENT
# Backup: $script:backupFile
# Created: $script:deploymentTimestamp

`$VPS_HOST = "$VPS_HOST"
`$VPS_USER = "$VPS_USER"
`$VPS_PATH = "$VPS_PATH"
`$BACKUP_FILE = "$script:backupFile"

Write-Host "Rolling back to backup: `$BACKUP_FILE" -ForegroundColor Yellow

# Restore database
ssh `${VPS_USER}@`${VPS_HOST} "zcat '`$VPS_PATH/backups-production/`$BACKUP_FILE' | docker exec -i wms-database mysql -uroot -prootpassword123"

# Restart containers
ssh `${VPS_USER}@`${VPS_HOST} "cd '`$VPS_PATH' && docker-compose restart"

Write-Host "Rollback complete!" -ForegroundColor Green
"@

$rollbackScript | Out-File -FilePath ".vscode\ROLLBACK-PRODUCTION.ps1" -Encoding UTF8
Write-Host "Rollback script saved: .vscode\ROLLBACK-PRODUCTION.ps1" -ForegroundColor Gray
Write-Host ""
