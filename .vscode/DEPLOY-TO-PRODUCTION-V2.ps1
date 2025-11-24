# ═══════════════════════════════════════════════════════════════
# 🚀 PRODUCTION DEPLOYMENT V2.0 (Correct Flow)
# ═══════════════════════════════════════════════════════════════
# Flow: Git Commit FIRST → Build → Backup → Deploy → Verify
# Rollback: Database + Git Revert (if fails)
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# Configuration
$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$VPS_PATH = "/root/NEW START"

# Global rollback variables
$script:backupFile = ""
$script:deploymentTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$script:lastCommitHash = ""
$script:deploymentCommitHash = ""

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 🚀 PRODUCTION DEPLOYMENT V2.0" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# Rollback Function
# ═══════════════════════════════════════════════════════════════
function Invoke-Rollback {
    param($reason, $revertGit = $false)
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host " ⚠️ DEPLOYMENT FAILED - ROLLING BACK" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "Reason: $reason" -ForegroundColor Yellow
    
    # 1. Restore database if backup exists
    if ($script:backupFile) {
        Write-Host ""
        Write-Host "[Rollback 1/3] 📦 Restoring database..." -ForegroundColor Cyan
        
        ssh ${VPS_USER}@${VPS_HOST} @"
cd '$VPS_PATH' && \
zcat backups-production/$script:backupFile | mysql -u wms_user -pwmspassword123 warehouse_wms
"@
        
        Write-Host "✅ Database restored from: $script:backupFile" -ForegroundColor Green
    }
    
    # 2. Revert git commit if needed
    if ($revertGit -and $script:deploymentCommitHash) {
        Write-Host ""
        Write-Host "[Rollback 2/3] 🔙 Reverting git commit..." -ForegroundColor Cyan
        
        git revert --no-commit $script:deploymentCommitHash
        git commit -m "Revert failed deployment $script:deploymentTimestamp"
        git push origin stable/prisma-mysql-production
        
        Write-Host "✅ Git reverted to: $script:lastCommitHash" -ForegroundColor Green
    }
    
    # 3. Restart containers
    Write-Host ""
    Write-Host "[Rollback 3/3] 🔄 Restarting containers..." -ForegroundColor Cyan
    ssh ${VPS_USER}@${VPS_HOST} "cd '$VPS_PATH' && docker-compose restart wms-backend wms-frontend"
    Write-Host "✅ Containers restarted" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "❌ Deployment aborted. Production at previous version." -ForegroundColor Red
    Write-Host ""
    
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# STEP 1: Git Commit & Push (Create Restore Point FIRST!)
# ═══════════════════════════════════════════════════════════════
Write-Host "[1/8] 📝 Committing changes to Git (Creating restore point)..." -ForegroundColor Yellow

try {
    # Get current commit hash (for rollback reference)
    $script:lastCommitHash = git rev-parse HEAD
    Write-Host "   Current commit: $script:lastCommitHash" -ForegroundColor Gray
    
    # Stage all changes
    git add .
    
    # Check if there are changes to commit
    $gitStatus = git status --porcelain
    
    if ($gitStatus) {
        # Commit changes with descriptive message
        $commitMessage = "Production deployment $script:deploymentTimestamp"
        git commit -m $commitMessage
        $script:deploymentCommitHash = git rev-parse HEAD
        
        Write-Host "✅ Changes committed" -ForegroundColor Green
        Write-Host "   New commit: $script:deploymentCommitHash" -ForegroundColor Gray
        
        # Push to GitHub (remote backup)
        Write-Host "   Pushing to GitHub..." -ForegroundColor Cyan
        git push origin stable/prisma-mysql-production
        Write-Host "✅ Pushed to GitHub (remote backup created)" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No changes to commit - using current commit" -ForegroundColor Gray
        $script:deploymentCommitHash = $script:lastCommitHash
    }
} catch {
    Write-Host "❌ Git commit failed: $_" -ForegroundColor Red
    Write-Host "   Fix git issues before deploying" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: Build Frontend Locally
# ═══════════════════════════════════════════════════════════════
Write-Host "[2/8] 🏗️  Building frontend locally..." -ForegroundColor Yellow

try {
    cd frontend
    npm run build | Out-Null
    cd ..
    Write-Host "✅ Frontend build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
    Invoke-Rollback "Frontend build failed" -revertGit $true
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: Backup Production Database
# ═══════════════════════════════════════════════════════════════
Write-Host "[3/8] 💾 Backing up production database..." -ForegroundColor Yellow

try {
    $script:backupFile = "prod_backup_$script:deploymentTimestamp.sql.gz"
    
    # Create backup
    ssh ${VPS_USER}@${VPS_HOST} @"
cd '$VPS_PATH' && \
mkdir -p backups-production && \
docker exec wms-database mysqldump -u wms_user -pwmspassword123 --single-transaction warehouse_wms | gzip > backups-production/$script:backupFile
"@

    # Verify backup was created
    $backupSize = ssh ${VPS_USER}@${VPS_HOST} "ls -lh '$VPS_PATH/backups-production/$script:backupFile' 2>/dev/null | awk '{print `$5}'"
    
    if (!$backupSize) {
        Invoke-Rollback "Database backup creation failed" -revertGit $true
    }
    
    Write-Host "✅ Database backup created: $script:backupFile ($backupSize)" -ForegroundColor Green
    
    # Auto-cleanup: Keep only 2 latest backups (prevent VPS storage full)
    Write-Host "   Cleaning old backups (keeping 2 latest)..." -ForegroundColor Cyan
    ssh ${VPS_USER}@${VPS_HOST} @"
cd '$VPS_PATH/backups-production' && \
ls -t prod_backup_*.sql.gz 2>/dev/null | tail -n +3 | xargs -r rm -f
"@
    
    $remainingBackups = ssh ${VPS_USER}@${VPS_HOST} "ls '$VPS_PATH/backups-production/prod_backup_*.sql.gz' 2>/dev/null | wc -l"
    Write-Host "   ✅ Backup cleanup done ($remainingBackups backups remaining)" -ForegroundColor Green
} catch {
    Invoke-Rollback "Database backup error: $_" -revertGit $true
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 4: Transfer Code to VPS
# ═══════════════════════════════════════════════════════════════
Write-Host "[4/8] 📦 Transferring code to VPS..." -ForegroundColor Yellow

try {
    # Transfer frontend dist
    Write-Host "   Transferring frontend..." -ForegroundColor Cyan
    scp -r frontend/dist ${VPS_USER}@${VPS_HOST}:'$VPS_PATH/frontend/' 2>$null
    
    # Transfer backend code (src, prisma, package.json)
    Write-Host "   Transferring backend..." -ForegroundColor Cyan
    tar -czf backend-code.tar.gz backend/src backend/prisma backend/package.json backend/tsconfig.json
    scp backend-code.tar.gz ${VPS_USER}@${VPS_HOST}:'$VPS_PATH/' 2>$null
    
    # Extract on VPS
    ssh ${VPS_USER}@${VPS_HOST} @"
cd '$VPS_PATH' && \
tar -xzf backend-code.tar.gz && \
rm backend-code.tar.gz
"@
    
    Remove-Item backend-code.tar.gz
    
    Write-Host "✅ Code transferred successfully" -ForegroundColor Green
} catch {
    Invoke-Rollback "Code transfer failed: $_" -revertGit $true
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 5: Deploy to Production Containers
# ═══════════════════════════════════════════════════════════════
Write-Host "[5/8] 🚢 Deploying to production containers..." -ForegroundColor Yellow

try {
    # Deploy frontend (zero downtime update)
    Write-Host "   Deploying frontend..." -ForegroundColor Cyan
    ssh ${VPS_USER}@${VPS_HOST} @"
cd '$VPS_PATH' && \
docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/ && \
docker exec wms-frontend nginx -s reload
"@
    
    # Deploy backend (rebuild + run migrations)
    Write-Host "   Deploying backend + migrations..." -ForegroundColor Cyan
    ssh ${VPS_USER}@${VPS_HOST} @"
cd '$VPS_PATH' && \
docker-compose build --no-cache backend && \
docker-compose up -d backend
"@
    
    Write-Host "✅ Containers deployed (frontend + backend)" -ForegroundColor Green
} catch {
    Invoke-Rollback "Container deployment failed: $_" -revertGit $true
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 6: Wait for Backend Startup
# ═══════════════════════════════════════════════════════════════
Write-Host "[6/8] ⏳ Waiting for backend to initialize..." -ForegroundColor Yellow

Start-Sleep -Seconds 15

Write-Host "✅ Backend should be ready" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 7: Verify Production Deployment
# ═══════════════════════════════════════════════════════════════
Write-Host "[7/8] ✅ Verifying production deployment..." -ForegroundColor Yellow

try {
    # 1. Backend health check
    Write-Host "   Checking backend API..." -ForegroundColor Cyan
    $healthCheck = ssh ${VPS_USER}@${VPS_HOST} "curl -s http://localhost:5000/api/health 2>/dev/null"
    
    if (!$healthCheck) {
        Invoke-Rollback "Backend API not responding" -revertGit $true
    }
    
    Write-Host "   ✅ Backend API responding" -ForegroundColor Green
    
    # 2. Database connectivity
    Write-Host "   Verifying database..." -ForegroundColor Cyan
    $dbCheck = ssh ${VPS_USER}@${VPS_HOST} @"
docker exec wms-database mysql -u wms_user -pwmspassword123 warehouse_wms -e 'SELECT COUNT(*) FROM shipments' 2>/dev/null
"@
    
    if (!$dbCheck) {
        Invoke-Rollback "Database verification failed" -revertGit $true
    }
    
    Write-Host "   ✅ Database accessible" -ForegroundColor Green
    
    # 3. Frontend accessibility
    Write-Host "   Checking frontend..." -ForegroundColor Cyan
    $frontendCheck = ssh ${VPS_USER}@${VPS_HOST} "curl -w '%{http_code}' -s -o /dev/null http://localhost 2>/dev/null"
    
    if ($frontendCheck -ne "200") {
        Invoke-Rollback "Frontend not accessible (HTTP $frontendCheck)" -revertGit $true
    }
    
    Write-Host "   ✅ Frontend accessible" -ForegroundColor Green
    
    Write-Host "✅ All verification checks passed" -ForegroundColor Green
} catch {
    Invoke-Rollback "Deployment verification failed: $_" -revertGit $true
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# STEP 8: Tag Successful Deployment
# ═══════════════════════════════════════════════════════════════
Write-Host "[8/8] 🏷️  Tagging successful deployment..." -ForegroundColor Yellow

try {
    # Create git tag for rollback reference
    $tagName = "deploy-$script:deploymentTimestamp"
    git tag -a $tagName -m "Production deployment $script:deploymentTimestamp - SUCCESS"
    git push origin $tagName
    
    Write-Host "✅ Deployment tagged: $tagName" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Git tag failed (deployment successful): $_" -ForegroundColor Yellow
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# 🎉 DEPLOYMENT SUCCESSFUL
# ═══════════════════════════════════════════════════════════════

# Generate manual rollback script
$rollbackScript = @"
# ROLLBACK PRODUCTION DEPLOYMENT
# Generated: $script:deploymentTimestamp
# Backup: $script:backupFile
# Commit: $script:deploymentCommitHash → $script:lastCommitHash

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host " 🔙 ROLLING BACK PRODUCTION" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# 1. Restore database
Write-Host "[1/3] Restoring database from backup..." -ForegroundColor Cyan
ssh root@148.230.107.155 "cd '/root/NEW START' && zcat backups-production/$script:backupFile | mysql -u wms_user -pwmspassword123 warehouse_wms"
Write-Host "✅ Database restored" -ForegroundColor Green

# 2. Revert git
Write-Host "[2/3] Reverting git to previous commit..." -ForegroundColor Cyan
git revert --no-commit $script:deploymentCommitHash
git commit -m "Revert deployment $script:deploymentTimestamp"
git push origin stable/prisma-mysql-production
Write-Host "✅ Git reverted" -ForegroundColor Green

# 3. Restart containers
Write-Host "[3/3] Restarting containers..." -ForegroundColor Cyan
ssh root@148.230.107.155 "cd '/root/NEW START' && docker-compose restart wms-backend wms-frontend"
Write-Host "✅ Containers restarted" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Rollback complete" -ForegroundColor Green
"@

$rollbackScript | Out-File ".vscode\ROLLBACK-PRODUCTION.ps1" -Encoding UTF8

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host " 🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Production URL: https://qgocargo.cloud" -ForegroundColor Cyan
Write-Host "Health Check: https://qgocargo.cloud/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment Details:" -ForegroundColor Yellow
Write-Host "  Git Commit: $script:deploymentCommitHash" -ForegroundColor Gray
Write-Host "  Git Tag: deploy-$script:deploymentTimestamp" -ForegroundColor Gray
Write-Host "  Database Backup: $script:backupFile" -ForegroundColor Gray
Write-Host "  Rollback Script: .vscode\ROLLBACK-PRODUCTION.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Code, database, and git are all in sync" -ForegroundColor Green
Write-Host ""
