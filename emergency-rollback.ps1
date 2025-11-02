# =============================================================================
# EMERGENCY ROLLBACK SCRIPT - 3-STAGE SAFETY SYSTEM
# =============================================================================
# Use this script when GitHub Actions rollback fails or for manual intervention
#
# ROLLBACK STAGES:
# Stage 1: Code Rollback (Frontend + Backend files) - AUTOMATIC
# Stage 2: Database Schema Rollback (Structure only) - REQUIRES CONFIRMATION
# Stage 3: Full Database Restore (Data + Schema) - REQUIRES DOUBLE CONFIRMATION
#
# USAGE:
#   .\emergency-rollback.ps1                    # Stage 1 only (code rollback)
#   .\emergency-rollback.ps1 -IncludeSchema     # Stage 1 + 2 (code + schema)
#   .\emergency-rollback.ps1 -FullRestore       # Stage 1 + 2 + 3 (complete restore)
#
# =============================================================================

param(
    [switch]$IncludeSchema,
    [switch]$FullRestore,
    [switch]$Force
)

$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$SSH_KEY = "~/.ssh/github_actions_wms"
$PROD_PATH = "/root/NEW START"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚨 EMERGENCY ROLLBACK SCRIPT" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Find latest backup
Write-Host "🔍 Finding latest production backup..." -ForegroundColor Yellow
$findBackupCmd = @"
ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} "cd '$PROD_PATH' && ls -td backups/production-* 2>/dev/null | head -1"
"@

$LATEST_BACKUP = Invoke-Expression $findBackupCmd

if ([string]::IsNullOrWhiteSpace($LATEST_BACKUP)) {
    Write-Host "❌ No backup found on VPS!" -ForegroundColor Red
    Write-Host "   Cannot perform rollback without backup." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found backup: $LATEST_BACKUP" -ForegroundColor Green
Write-Host ""

# Display backup information
Write-Host "📦 Backup Information:" -ForegroundColor Cyan
ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
cd '$PROD_PATH'
echo '📅 Backup created: `$(stat -c %y "$LATEST_BACKUP" | cut -d'.' -f1)`'
echo '📁 Backup location: $LATEST_BACKUP'
echo ''
echo '📊 Backup contents:'
ls -lh "$LATEST_BACKUP"/*/ 2>/dev/null | grep -E '^total' | sed 's/^total/  /'
if [ -f "$LATEST_BACKUP/database/warehouse_wms-full-backup.sql" ]; then
    echo "  ✅ Full database backup available (`$(du -h "$LATEST_BACKUP/database/warehouse_wms-full-backup.sql" | cut -f1)`)"
fi
if [ -f "$LATEST_BACKUP/database/schema-before-migration.sql" ]; then
    echo "  ✅ Schema backup available (`$(du -h "$LATEST_BACKUP/database/schema-before-migration.sql" | cut -f1)`)"
fi
"@

Write-Host ""

# Determine rollback stages
$rollbackStages = @("CODE ROLLBACK (Stage 1)")
if ($IncludeSchema) {
    $rollbackStages += "SCHEMA ROLLBACK (Stage 2)"
}
if ($FullRestore) {
    $rollbackStages += "FULL DATABASE RESTORE (Stage 3)"
}

Write-Host "🎯 Rollback Stages Planned:" -ForegroundColor Cyan
foreach ($stage in $rollbackStages) {
    Write-Host "   - $stage" -ForegroundColor Yellow
}
Write-Host ""

# Confirmation prompt
if (-not $Force) {
    Write-Host "⚠️  WARNING: This will rollback production to the backup state!" -ForegroundColor Red
    Write-Host ""
    $confirmation = Read-Host "Type 'ROLLBACK' to confirm"
    
    if ($confirmation -ne "ROLLBACK") {
        Write-Host "❌ Rollback cancelled by user" -ForegroundColor Red
        exit 0
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔄 STAGE 1: CODE ROLLBACK (Frontend + Backend)" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
set -e
cd '$PROD_PATH'

echo '🛑 Stopping containers...'
docker stop wms-frontend wms-backend 2>/dev/null || echo '⚠️  Some containers already stopped'

echo ''
echo '📋 Rolling back frontend files...'
docker cp "$LATEST_BACKUP/frontend/." wms-frontend:/usr/share/nginx/html/
echo '✅ Frontend files restored'

echo ''
echo '📋 Rolling back backend code...'
docker cp "$LATEST_BACKUP/backend/." wms-backend:/app/
echo '✅ Backend code restored'

echo ''
echo '🚀 Starting containers...'
docker start wms-frontend wms-backend

echo ''
echo '⏳ Waiting for services to start (20 seconds)...'
sleep 20

echo ''
echo '🔍 Health checks:'
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo '✅ Backend is healthy'
else
    echo '❌ Backend health check failed'
    echo '📋 Last 20 lines of backend logs:'
    docker logs wms-backend --tail 20
fi

if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo '✅ Frontend is accessible'
else
    echo '❌ Frontend health check failed'
fi

echo ''
echo '✅ CODE ROLLBACK COMPLETE'
echo ''
echo '📊 Container Status:'
docker ps --filter 'name=wms-frontend|wms-backend|wms-database' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
"@

if ($?) {
    Write-Host ""
    Write-Host "✅ STAGE 1 COMPLETE: Code rollback successful" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ STAGE 1 FAILED: Code rollback encountered errors" -ForegroundColor Red
    exit 1
}

# Stage 2: Schema Rollback
if ($IncludeSchema -or $FullRestore) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "🔄 STAGE 2: DATABASE SCHEMA ROLLBACK" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  WARNING: This will DROP and RECREATE all database tables!" -ForegroundColor Red
    Write-Host "⚠️  All table structures will be reset to backup state!" -ForegroundColor Red
    
    if (-not $FullRestore) {
        Write-Host "ℹ️  Note: This keeps data but resets table structures" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    if (-not $Force) {
        $schemaConfirm = Read-Host "Type 'RESET SCHEMA' to confirm schema rollback"
        
        if ($schemaConfirm -ne "RESET SCHEMA") {
            Write-Host "❌ Schema rollback cancelled" -ForegroundColor Red
            Write-Host "✅ Code rollback was completed successfully" -ForegroundColor Green
            exit 0
        }
    }
    
    Write-Host ""
    Write-Host "🔄 Restoring database schema..." -ForegroundColor Yellow
    
    ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
set -e
cd '$PROD_PATH'

if [ ! -f "$LATEST_BACKUP/database/schema-before-migration.sql" ]; then
    echo '❌ Schema backup file not found!'
    exit 1
fi

echo '📁 Using schema backup:'
ls -lh "$LATEST_BACKUP/database/schema-before-migration.sql"

echo ''
echo '🔄 Restoring schema (this will drop and recreate tables)...'
docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms < "$LATEST_BACKUP/database/schema-before-migration.sql"

echo ''
echo '✅ Schema restored successfully'
"@
    
    if ($?) {
        Write-Host ""
        Write-Host "✅ STAGE 2 COMPLETE: Database schema rollback successful" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ STAGE 2 FAILED: Schema rollback encountered errors" -ForegroundColor Red
        exit 1
    }
}

# Stage 3: Full Database Restore
if ($FullRestore) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "🔄 STAGE 3: FULL DATABASE RESTORE (DATA + SCHEMA)" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  CRITICAL WARNING!" -ForegroundColor Red -BackgroundColor Black
    Write-Host "⚠️  This will ERASE ALL CURRENT DATA!" -ForegroundColor Red -BackgroundColor Black
    Write-Host "⚠️  ALL changes after backup will be LOST!" -ForegroundColor Red -BackgroundColor Black
    Write-Host ""
    Write-Host "This includes:" -ForegroundColor Yellow
    Write-Host "   - All rack data created after backup" -ForegroundColor Yellow
    Write-Host "   - All inventory changes after backup" -ForegroundColor Yellow
    Write-Host "   - All user actions after backup" -ForegroundColor Yellow
    Write-Host "   - All company profiles created after backup" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $Force) {
        Write-Host "🔴 FINAL CONFIRMATION REQUIRED" -ForegroundColor Red
        $fullConfirm = Read-Host "Type 'ERASE AND RESTORE' to proceed with full database restore"
        
        if ($fullConfirm -ne "ERASE AND RESTORE") {
            Write-Host "❌ Full database restore cancelled" -ForegroundColor Red
            Write-Host "✅ Previous rollback stages were completed" -ForegroundColor Green
            exit 0
        }
    }
    
    Write-Host ""
    Write-Host "🔄 Performing full database restore..." -ForegroundColor Yellow
    
    ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
set -e
cd '$PROD_PATH'

if [ ! -f "$LATEST_BACKUP/database/warehouse_wms-full-backup.sql" ]; then
    echo '❌ Full database backup file not found!'
    exit 1
fi

echo '📁 Using full database backup:'
ls -lh "$LATEST_BACKUP/database/warehouse_wms-full-backup.sql"

echo ''
echo '🔄 Restoring complete database (this will erase all current data)...'
docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms < "$LATEST_BACKUP/database/warehouse_wms-full-backup.sql"

echo ''
echo '✅ Full database restored successfully'
echo ''
echo '🔍 Verifying database:'
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'warehouse_wms';"
"@
    
    if ($?) {
        Write-Host ""
        Write-Host "✅ STAGE 3 COMPLETE: Full database restore successful" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ STAGE 3 FAILED: Full restore encountered errors" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎉 EMERGENCY ROLLBACK COMPLETE" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Rollback stages completed:" -ForegroundColor Green
foreach ($stage in $rollbackStages) {
    Write-Host "   ✓ $stage" -ForegroundColor Green
}
Write-Host ""
Write-Host "📦 Backup used: $LATEST_BACKUP" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔄 Restarting backend to apply changes..." -ForegroundColor Yellow

ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
cd '$PROD_PATH'
docker restart wms-backend
sleep 15
echo ''
echo '📊 Final Status:'
docker ps --filter 'name=wms-' --format 'table {{.Names}}\t{{.Status}}'
echo ''
echo '🔍 Final health check:'
curl -f http://localhost:5000/api/health && echo '✅ Backend is healthy' || echo '❌ Backend needs attention'
"@

Write-Host ""
Write-Host "🌐 Production URLs:" -ForegroundColor Cyan
Write-Host "   http://qgocargo.cloud" -ForegroundColor White
Write-Host "   http://148.230.107.155" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Clear browser cache (Ctrl+Shift+R) to see changes!" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
