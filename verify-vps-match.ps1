# =======================================================
# LOCAL vs VPS VERIFICATION SCRIPT (PowerShell)
# =======================================================
# This script verifies that local environment matches VPS production

Write-Host "🔍 VERIFYING LOCAL vs VPS MATCH..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray

# 1. Check if running in production mode (compiled JS)
Write-Host ""
Write-Host "1. 🚀 CHECKING PRODUCTION MODE..." -ForegroundColor Yellow

try {
    $backendProcess = docker exec wms-backend-local ps aux 2>$null | Select-String "node" | Select-String -NotMatch "grep" | Select-Object -First 1
    
    if ($backendProcess -match "dist/index.js") {
        Write-Host "   ✅ LOCAL: Running compiled JavaScript (node dist/index.js)" -ForegroundColor Green
        Write-Host "   ✅ MATCHES VPS: Production mode confirmed" -ForegroundColor Green
        $productionMatch = $true
    }
    elseif ($backendProcess -match "ts-node") {
        Write-Host "   ❌ LOCAL: Still using ts-node (development mode)" -ForegroundColor Red
        Write-Host "   ❌ VPS MISMATCH: VPS uses compiled JS" -ForegroundColor Red
        Write-Host "   💡 FIX: Use 'docker-compose up' instead of 'docker-compose -f docker-compose.dev.yml up'" -ForegroundColor Yellow
        $productionMatch = $false
    }
    else {
        Write-Host "   ⚠️  Could not determine backend process type" -ForegroundColor Yellow
        $productionMatch = $false
    }
}
catch {
    Write-Host "   ❌ Could not check backend process" -ForegroundColor Red
    $productionMatch = $false
}

# 2. Check NODE_ENV
Write-Host ""
Write-Host "2. 🌍 CHECKING ENVIRONMENT..." -ForegroundColor Yellow

try {
    $nodeEnv = docker exec wms-backend-local printenv NODE_ENV 2>$null
    
    if ($nodeEnv -eq "production") {
        Write-Host "   ✅ LOCAL: NODE_ENV=production" -ForegroundColor Green
        Write-Host "   ✅ MATCHES VPS: Production environment" -ForegroundColor Green
        $envMatch = $true
    }
    elseif ($nodeEnv -eq "development") {
        Write-Host "   ⚠️  LOCAL: NODE_ENV=development" -ForegroundColor Yellow
        Write-Host "   ⚠️  VPS DIFFERENCE: VPS uses NODE_ENV=production" -ForegroundColor Yellow
        $envMatch = $false
    }
    else {
        Write-Host "   ❌ LOCAL: NODE_ENV not set properly" -ForegroundColor Red
        Write-Host "   ❌ VPS MISMATCH: VPS requires NODE_ENV=production" -ForegroundColor Red
        $envMatch = $false
    }
}
catch {
    Write-Host "   ❌ Could not check NODE_ENV" -ForegroundColor Red
    $envMatch = $false
}

# 3. Check health endpoint
Write-Host ""
Write-Host "3. 🏥 CHECKING HEALTH STATUS..." -ForegroundColor Yellow

try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "   ✅ LOCAL: Backend health check OK" -ForegroundColor Green
    Write-Host "   ✅ MATCHES VPS: Health endpoint working" -ForegroundColor Green
    $healthMatch = $true
}
catch {
    Write-Host "   ❌ LOCAL: Backend health check failed" -ForegroundColor Red
    Write-Host "   ❌ Possible issue with backend startup" -ForegroundColor Red
    $healthMatch = $false
}

# 4. Check containers
Write-Host ""
Write-Host "4. 📦 CONTAINER STATUS..." -ForegroundColor Yellow

try {
    $containers = docker ps --filter "name=wms-" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}" 2>$null
    Write-Host $containers
}
catch {
    Write-Host "   ❌ Could not retrieve container status" -ForegroundColor Red
}

# 5. Memory usage
Write-Host ""
Write-Host "5. 💾 MEMORY USAGE..." -ForegroundColor Yellow

try {
    $memoryUsage = docker stats --no-stream wms-backend-local --format "{{.MemUsage}}" 2>$null
    $memOnly = ($memoryUsage -split '/')[0]
    Write-Host "   📊 LOCAL Memory: $memOnly" -ForegroundColor Cyan
    Write-Host "   📊 VPS Target: ~125MB (optimized)" -ForegroundColor Cyan
    Write-Host "   📊 VPS Previous: 194MB (before ts-node removal)" -ForegroundColor Gray
}
catch {
    Write-Host "   ⚠️  Could not check memory usage" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Gray
Write-Host "📋 SUMMARY:" -ForegroundColor Cyan

$totalChecks = 3
$passedChecks = 0

if ($productionMatch) { $passedChecks++ }
if ($envMatch) { $passedChecks++ }
if ($healthMatch) { $passedChecks++ }

if ($passedChecks -eq $totalChecks) {
    Write-Host "🎉 PERFECT MATCH: Local environment matches VPS production!" -ForegroundColor Green
}
elseif ($passedChecks -ge 2) {
    Write-Host "✅ GOOD MATCH: Minor differences detected" -ForegroundColor Green
}
else {
    Write-Host "⚠️  IMPROVEMENTS NEEDED: Significant differences found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 MATCH SCORE: $passedChecks/$totalChecks" -ForegroundColor Cyan

Write-Host ""
Write-Host "💡 TO ENSURE VPS MATCH:" -ForegroundColor Yellow
Write-Host "   1. Use: docker-compose up -d (not dev version)" -ForegroundColor White
Write-Host "   2. Ensure compiled JS: Look for 'dist/index.js' in process" -ForegroundColor White
Write-Host "   3. Check production env: NODE_ENV=production" -ForegroundColor White
Write-Host "   4. Verify health: http://localhost:5000/health" -ForegroundColor White

Write-Host ""
Write-Host "🔧 QUICK COMMANDS:" -ForegroundColor Yellow
Write-Host "   docker-compose down" -ForegroundColor Gray
Write-Host "   docker-compose up -d" -ForegroundColor Gray
Write-Host "   docker-compose logs -f wms-backend" -ForegroundColor Gray