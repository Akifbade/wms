# =============================================================================
# DATABASE SCHEMA COMPARISON TOOL
# =============================================================================
# Compares staging and production database schemas to detect migration issues
#
# USAGE:
#   .\check-database-sync.ps1              # Check both staging and production
#   .\check-database-sync.ps1 -Detailed    # Show detailed column differences
#
# =============================================================================

param(
    [switch]$Detailed
)

$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$SSH_KEY = "~/.ssh/github_actions_wms"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔍 DATABASE SCHEMA COMPARISON" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Fetching staging database schema..." -ForegroundColor Yellow
$stagingSchema = ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
docker exec wms-staging-backend npx prisma migrate status 2>&1
"@

Write-Host ""
Write-Host "📊 Fetching production database schema..." -ForegroundColor Yellow
$productionSchema = ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
docker exec wms-backend npx prisma migrate status 2>&1
"@

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📋 STAGING DATABASE (Port 3308)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host $stagingSchema
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📋 PRODUCTION DATABASE (Port 3307)" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host $productionSchema
Write-Host ""

# Check for pending migrations
$stagingPending = $stagingSchema -match "following migrations? have not yet been applied"
$productionPending = $productionSchema -match "following migrations? have not yet been applied"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎯 MIGRATION STATUS" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

if ($stagingPending) {
    Write-Host "⚠️  Staging: HAS PENDING MIGRATIONS" -ForegroundColor Yellow
} else {
    Write-Host "✅ Staging: All migrations applied" -ForegroundColor Green
}

if ($productionPending) {
    Write-Host "❌ Production: HAS PENDING MIGRATIONS" -ForegroundColor Red
    Write-Host "   ⚠️  WARNING: Production database is out of sync!" -ForegroundColor Red
} else {
    Write-Host "✅ Production: All migrations applied" -ForegroundColor Green
}

Write-Host ""

if ($Detailed) {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "🔍 DETAILED SCHEMA COMPARISON" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📊 Comparing 'racks' table structure..." -ForegroundColor Yellow
    Write-Host ""
    
    # Get staging racks table structure
    Write-Host "STAGING - racks table columns:" -ForegroundColor Green
    ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e "
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_KEY
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'warehouse_wms' 
AND TABLE_NAME = 'racks'
ORDER BY ORDINAL_POSITION;
" 2>/dev/null
"@
    
    Write-Host ""
    Write-Host "📊 Checking for zone-related columns..." -ForegroundColor Yellow
    ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e "
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'warehouse_wms' 
AND TABLE_NAME = 'racks'
AND COLUMN_NAME IN ('zone', 'zoneDescription', 'zoneIcon')
ORDER BY ORDINAL_POSITION;
" 2>/dev/null
"@
    
    Write-Host ""
}

# Check for specific missing columns that caused the 502 error
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔍 CRITICAL COLUMN CHECK" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for zone-related columns in production..." -ForegroundColor Yellow
$criticalColumns = ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST} @"
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e "
SELECT 
    CASE 
        WHEN COUNT(*) = 3 THEN 'ALL_PRESENT'
        ELSE 'MISSING'
    END as status,
    GROUP_CONCAT(COLUMN_NAME) as columns_found
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'warehouse_wms' 
AND TABLE_NAME = 'racks'
AND COLUMN_NAME IN ('zone', 'zoneDescription', 'zoneIcon');
" -s -N 2>/dev/null
"@

$status, $columnsFound = $criticalColumns -split "`t"

if ($status -eq "ALL_PRESENT") {
    Write-Host "✅ All zone columns present: $columnsFound" -ForegroundColor Green
} else {
    Write-Host "❌ MISSING COLUMNS DETECTED!" -ForegroundColor Red
    Write-Host "   Found: $columnsFound" -ForegroundColor Yellow
    Write-Host "   Expected: zone, zoneDescription, zoneIcon" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  This is the cause of 502 errors!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix, run:" -ForegroundColor Yellow
    Write-Host "   ssh -i $SSH_KEY ${VPS_USER}@${VPS_HOST}" -ForegroundColor White
    Write-Host '   docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms << EOF' -ForegroundColor White
    Write-Host "   ALTER TABLE racks ADD COLUMN zone VARCHAR(191) DEFAULT 'Unassigned' AFTER location;" -ForegroundColor White
    Write-Host "   ALTER TABLE racks ADD COLUMN zoneDescription TEXT AFTER zone;" -ForegroundColor White
    Write-Host "   ALTER TABLE racks ADD COLUMN zoneIcon VARCHAR(50) DEFAULT '📦' AFTER zoneDescription;" -ForegroundColor White
    Write-Host "   EOF" -ForegroundColor White
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

if (-not $productionPending -and $status -eq "ALL_PRESENT") {
    Write-Host "✅ Staging and Production are IN SYNC" -ForegroundColor Green
    Write-Host "   No action needed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Staging and Production are OUT OF SYNC" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommended Actions:" -ForegroundColor Yellow
    Write-Host "1. Review migration differences above" -ForegroundColor White
    Write-Host "2. Deploy to production using GitHub Actions workflow" -ForegroundColor White
    Write-Host "   - Go to: https://github.com/Akifbade/wms/actions" -ForegroundColor White
    Write-Host "   - Select: Three-Stage Deployment Pipeline" -ForegroundColor White
    Write-Host "   - Click: Run workflow → Select 'production'" -ForegroundColor White
    Write-Host "3. Or manually apply missing migrations on production" -ForegroundColor White
}

Write-Host "================================================" -ForegroundColor Cyan
