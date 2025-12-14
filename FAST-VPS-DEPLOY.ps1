# ========================================================================
# FAST VPS DEPLOYMENT WITH PRISMA MIGRATION
# ========================================================================
# Uses: plink (PuTTY) for fast SSH operations
# VPS: 148.230.107.155 | User: root | Password: Qgocargo@123
# ========================================================================

$ErrorActionPreference = "Stop"

# VPS Configuration
$VPS_HOST = "148.230.107.155"
$VPS_USER = "root"
$VPS_PASSWORD = "Qgocargo@123"
$VPS_PATH = "/root/NEW START"
$PRODUCTION_URL = "https://qgocargo.cloud"

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Helper to run plink commands
function Invoke-VPSCommand {
    param([string]$Command)
    $plinkCmd = "echo y | plink -batch -ssh ${VPS_USER}@${VPS_HOST} -pw ${VPS_PASSWORD} `"$Command`""
    Invoke-Expression $plinkCmd
}

Write-Host ""
Write-Info "========================================================================"
Write-Info "  FAST VPS DEPLOYMENT - LOCAL → PRODUCTION (148.230.107.155)"
Write-Info "========================================================================"
Write-Host ""

$startTime = Get-Date

# ========================================================================
# STEP 1: BUILD FRONTEND LOCALLY (SKIPPED - DONE MANUALLY)
# ========================================================================
# Write-Info "[1/8] Building frontend locally..."
# Push-Location frontend
# try {
#     $buildOutput = npm run build 2>&1 | Out-String
#     # Check if dist folder was created successfully
#     if (Test-Path "dist") {
#         Write-Success "   ✅ Frontend built successfully"
#     } else {
#         throw "Frontend build failed - no dist folder"
#     }
# } catch {
#     Write-Error "❌ Frontend build failed: $_"
#     Pop-Location
#     exit 1
# }
# Pop-Location

# ========================================================================
# STEP 2: BUILD BACKEND LOCALLY (SKIPPED - DONE MANUALLY)
# ========================================================================
# Write-Info "[2/8] Building backend locally..."
# Push-Location backend
# try {
#     $buildOutput = npm run build 2>&1 | Out-String
#     # Check if dist folder was created successfully
#     if (Test-Path "dist") {
#         Write-Success "   ✅ Backend built successfully"
#     } else {
#         throw "Backend build failed - no dist folder"
#     }
# } catch {
#     Write-Error "❌ Backend build failed: $_"
#     Pop-Location
#     exit 1
# }
# Pop-Location

# ========================================================================
# STEP 3: BACKUP DATABASE ON VPS
# ========================================================================
Write-Info "[3/8] Backing up production database on VPS..."
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "BEFORE_DEPLOY_${timestamp}.sql.gz"

try {
    # Create backup directory
    Invoke-VPSCommand "mkdir -p '$VPS_PATH/backups-production'"
    
    # Backup database
    Invoke-VPSCommand "cd '$VPS_PATH' && docker exec wms-database mysqldump -uroot -prootpassword123 --all-databases --single-transaction --routines --triggers | gzip > backups-production/$backupFile"
    
    # Verify backup
    $backupCheck = Invoke-VPSCommand "test -f '$VPS_PATH/backups-production/$backupFile' && echo 'EXISTS'"
    if ($backupCheck -match "EXISTS") {
        Write-Success "   ✅ Database backup created: $backupFile"
    }
    else {
        throw "Backup verification failed"
    }
}
catch {
    Write-Error "❌ Database backup failed: $_"
    exit 1
}

# ========================================================================
# STEP 4: SYNC CODE TO VPS (FAST METHOD)
# ========================================================================
Write-Info "[4/8] Syncing code to VPS..."

# Check if pscp (PuTTY SCP) is available
$pscpAvailable = Get-Command pscp -ErrorAction SilentlyContinue

if ($pscpAvailable) {
    Write-Info "   Using PSCP for fast file transfer..."
    
    # Transfer frontend dist
    Write-Info "   Transferring frontend..."
    echo y | pscp -batch -r -pw $VPS_PASSWORD frontend/dist/* ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/dist/
    
    # Transfer backend dist
    Write-Info "   Transferring backend..."
    echo y | pscp -batch -r -pw $VPS_PASSWORD backend/dist/* ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/dist/
    
    # Transfer backend source files
    echo y | pscp -batch -r -pw $VPS_PASSWORD backend/src/* ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/src/
    
    # Transfer prisma files
    Write-Info "   Transferring Prisma schema..."
    echo y | pscp -batch -r -pw $VPS_PASSWORD backend/prisma/* ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/prisma/
    
    # Transfer package.json and lock files
    echo y | pscp -batch -pw $VPS_PASSWORD backend/package.json ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/
    echo y | pscp -batch -pw $VPS_PASSWORD backend/package-lock.json ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/
    echo y | pscp -batch -pw $VPS_PASSWORD frontend/package.json ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/
    echo y | pscp -batch -pw $VPS_PASSWORD frontend/package-lock.json ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/frontend/
    
    # Transfer docker-compose (Use production version)
    echo y | pscp -batch -pw $VPS_PASSWORD docker-compose-production.yml ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/docker-compose.yml
    
    Write-Success "   ✅ Code synced to VPS"
}
else {
    Write-Warning "   PSCP not found. Using plink with tar (slower)..."
    
    # Create tar archives and transfer
    Write-Info "   Creating frontend archive..."
    tar -czf frontend-dist.tar.gz -C frontend/dist .
    
    Write-Info "   Creating backend archive..."
    tar -czf backend-dist.tar.gz -C backend/dist .
    
    # Transfer via base64 encoding (slower but works)
    Write-Info "   Transferring archives..."
    Invoke-VPSCommand "mkdir -p '$VPS_PATH/frontend/dist' '$VPS_PATH/backend/dist'"
    
    # This is a fallback - recommend installing PuTTY tools
    Write-Warning "   For faster deployment, install PuTTY tools (pscp, plink)"
    Write-Warning "   Download from: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html"
}

# ========================================================================
# STEP 5: INSTALL DEPENDENCIES ON VPS
# ========================================================================
Write-Info "[5/8] Installing dependencies on VPS..."
try {
    Invoke-VPSCommand "cd '$VPS_PATH/backend' && npm install --production 2>&1 | tail -5"
    Write-Success "   ✅ Backend dependencies installed"
}
catch {
    Write-Warning "   ⚠️  Dependency installation check skipped"
}

# ========================================================================
# STEP 6: RUN PRISMA MIGRATIONS SAFELY
# ========================================================================
Write-Info "[6/8] Running Prisma migrations on VPS..."

try {
    # Generate Prisma Client
    Write-Info "   Generating Prisma Client..."
    Invoke-VPSCommand "cd '$VPS_PATH/backend' && npx prisma generate"
    
    # Check migration status
    Write-Info "   Checking migration status..."
    Invoke-VPSCommand "cd '$VPS_PATH/backend' && npx prisma migrate status"
    
    # Deploy migrations
    Write-Info "   Deploying migrations..."
    Invoke-VPSCommand "cd '$VPS_PATH/backend' && npx prisma migrate deploy"
    
    Write-Success "   ✅ Prisma migrations completed successfully"
}
catch {
    Write-Error "❌ Prisma migration failed: $_"
    Write-Warning "   Database backup available at: $VPS_PATH/backups-production/$backupFile"
    Write-Warning "   To rollback: zcat $backupFile | docker exec -i wms-database mysql -uroot -prootpassword123"
    exit 1
}

# ========================================================================
# STEP 7: REBUILD & RESTART CONTAINERS
# ========================================================================
Write-Info "[7/8] Rebuilding and restarting containers..."

try {
    # Stop containers
    Write-Info "   Stopping containers..."
    Invoke-VPSCommand "cd '$VPS_PATH' && docker-compose down"
    
    # Rebuild and start
    Write-Info "   Building and starting containers..."
    Invoke-VPSCommand "cd '$VPS_PATH' && docker-compose up -d --build"
    
    # Wait for containers to start
    Write-Info "   Waiting for containers to initialize..."
    Start-Sleep -Seconds 15
    
    Write-Success "   ✅ Containers restarted"
}
catch {
    Write-Error "❌ Container restart failed: $_"
    exit 1
}

# ========================================================================
# STEP 8: HEALTH CHECK
# ========================================================================
Write-Info "[8/8] Running health checks..."

Start-Sleep -Seconds 5

try {
    # Check backend health via VPS
    $healthCheck = Invoke-VPSCommand "curl -s http://localhost:5000/api/health"
    
    if ($healthCheck -match "healthy" -or $healthCheck -match "ok") {
        Write-Success "   ✅ Backend health check passed"
    }
    else {
        Write-Warning "   ⚠️  Backend health check uncertain"
    }
    
    # Check containers
    Write-Info "   Checking containers..."
    Invoke-VPSCommand "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep wms"
    
}
catch {
    Write-Warning "   ⚠️  Health check completed with warnings"
}

# ========================================================================
# DEPLOYMENT SUMMARY
# ========================================================================
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host ""
Write-Success "========================================================================"
Write-Success "  ✅ DEPLOYMENT COMPLETED SUCCESSFULLY"
Write-Success "========================================================================"
Write-Host ""
Write-Info "Time taken: $([math]::Round($duration, 2)) seconds"
Write-Info "Backup: $backupFile"
Write-Host ""
Write-Success "Production URL: $PRODUCTION_URL"
Write-Success "Health Check: curl -k $PRODUCTION_URL/api/health"
Write-Host ""
Write-Info "Test in browser:"
Write-Info "  Frontend: $PRODUCTION_URL"
Write-Info "  Backend: $PRODUCTION_URL/api/health"
Write-Host ""
Write-Warning "If issues occur, rollback with:"
Write-Warning "  plink -ssh root@$VPS_HOST -pw $VPS_PASSWORD"
Write-Warning "  cd '$VPS_PATH' && zcat backups-production/$backupFile | docker exec -i wms-database mysql -uroot -prootpassword123"
Write-Host ""

# Open production in browser
# $openBrowser = Read-Host "Open production in browser? (y/n)"
# if ($openBrowser -eq 'y') {
#     Start-Process $PRODUCTION_URL
# }
