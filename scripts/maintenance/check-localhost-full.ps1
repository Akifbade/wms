# Full Localhost System Check Report
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  FULL SYSTEM HEALTH REPORT - LOCALHOST" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backend Health Check
Write-Host "1. BACKEND API HEALTH" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -ErrorAction Stop
    Write-Host "   [OK] Status: $($health.status)" -ForegroundColor Green
    Write-Host "   [OK] Version: $($health.version)" -ForegroundColor Green
    Write-Host "   [OK] Environment: $($health.environment)" -ForegroundColor Green
    Write-Host "   [OK] Uptime: $($health.uptime)s" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Backend is not responding: $_" -ForegroundColor Red
}
Write-Host ""

# 2. Database Connectivity & Structure
Write-Host "2. DATABASE STRUCTURE & DATA" -ForegroundColor Yellow
try {
    # Helper to run SQL
    function Run-Sql {
        param($query)
        $cmd = "docker exec wms-database mysql -u wms_user -pwmspassword123 warehouse_wms -N -e ""$query"""
        return Invoke-Expression $cmd
    }

    # Check Table Counts
    $shipments = Run-Sql "SELECT COUNT(*) FROM shipments"
    $racks = Run-Sql "SELECT COUNT(*) FROM racks"
    $users = Run-Sql "SELECT COUNT(*) FROM users"
    $materials = Run-Sql "SELECT COUNT(*) FROM packing_materials"
    $consumables = Run-Sql "SELECT COUNT(*) FROM rack_consumables"
    
    Write-Host "   [OK] Database Connection" -ForegroundColor Green
    Write-Host "   [INFO] Shipments: $shipments" -ForegroundColor White
    Write-Host "   [INFO] Racks: $racks" -ForegroundColor White
    Write-Host "   [INFO] Users: $users" -ForegroundColor White
    
    if ($materials -ge 0) { Write-Host "   [OK] Material Table (packing_materials): Present ($materials items)" -ForegroundColor Green }
    else { Write-Host "   [FAIL] Material Table Missing" -ForegroundColor Red }

    if ($consumables -ge 0) { Write-Host "   [OK] Consumable Table (rack_consumables): Present ($consumables items)" -ForegroundColor Green }
    else { Write-Host "   [FAIL] Consumable Table Missing" -ForegroundColor Red }

} catch {
    Write-Host "   [FAIL] Database check failed: $_" -ForegroundColor Red
}
Write-Host ""

# 3. Billing System Check
Write-Host "3. BILLING SYSTEM CONFIGURATION" -ForegroundColor Yellow
try {
    $billingCol = Run-Sql "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'warehouse_wms' AND TABLE_NAME = 'billing_settings' AND COLUMN_NAME = 'storageRatePerCBM'"
    if ($billingCol -eq 1) {
        $val = Run-Sql "SELECT storageRatePerCBM FROM billing_settings LIMIT 1"
        Write-Host "   [OK] Column 'storageRatePerCBM' exists" -ForegroundColor Green
        Write-Host "   [INFO] Current Rate: $val" -ForegroundColor White
    } else {
        Write-Host "   [FAIL] Column 'storageRatePerCBM' MISSING in billing_settings" -ForegroundColor Red
    }
} catch {
    Write-Host "   [FAIL] Billing check failed" -ForegroundColor Red
}
Write-Host ""

# 4. Frontend Check
Write-Host "4. FRONTEND ACCESSIBILITY" -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost" -Method Head -ErrorAction Stop
    if ($frontend.StatusCode -eq 200) {
        Write-Host "   [OK] Frontend is accessible (HTTP 200)" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Frontend returned status: $($frontend.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [FAIL] Frontend not accessible: $_" -ForegroundColor Red
}
Write-Host ""

# 5. Docker Container Status
Write-Host "5. CONTAINER STATUS" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String | Write-Host -ForegroundColor Gray

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  REPORT COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
