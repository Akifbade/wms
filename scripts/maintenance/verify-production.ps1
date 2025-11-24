# Production vs Localhost Feature Verification Script

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PRODUCTION vs LOCALHOST FEATURE COMPARISON" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check database tables
function Get-DatabaseTables {
    param($server)
    
    if ($server -eq "local") {
        $result = docker exec wms-database mysql -uroot -prootpassword123 -e "USE warehouse_wms; SHOW TABLES;" 2>$null
    } else {
        $result = ssh root@148.230.107.155 "docker exec wms-database mysql -uroot -prootpassword123 -e 'USE warehouse_wms; SHOW TABLES;' 2>/dev/null"
    }
    
    return $result
}

# Check localhost
Write-Host "[1/4] Checking LOCALHOST..." -ForegroundColor Yellow
try {
    $localHealth = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -ErrorAction Stop
    $localVersion = ($localHealth.Content | ConvertFrom-Json).version
    Write-Host "   Version: $localVersion" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Localhost not running!" -ForegroundColor Red
    $localVersion = "OFFLINE"
}

# Check production  
Write-Host ""
Write-Host "[2/4] Checking PRODUCTION..." -ForegroundColor Yellow
Write-Host "   Connecting to VPS..." -ForegroundColor Gray
$prodCheck = ssh root@148.230.107.155 "curl -s http://localhost:5000/api/health"
if ($prodCheck) {
    $prodVersion = ($prodCheck | ConvertFrom-Json).version
    Write-Host "   Version: $prodVersion" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Production not responding!" -ForegroundColor Red
    $prodVersion = "OFFLINE"
}

# Compare database tables
Write-Host ""
Write-Host "[3/4] Checking DATABASE SCHEMA..." -ForegroundColor Yellow

Write-Host "   Getting localhost tables..." -ForegroundColor Gray
$localTables = docker exec wms-database mysql -uroot -prootpassword123 -e "USE warehouse_wms; SHOW TABLES;" 2>$null | Select-String -Pattern "Tables_in" -NotMatch

Write-Host "   Getting production tables..." -ForegroundColor Gray  
$prodTables = ssh root@148.230.107.155 "docker exec wms-database mysql -uroot -prootpassword123 -e 'USE warehouse_wms; SHOW TABLES;' 2>/dev/null" | Select-String -Pattern "Tables_in" -NotMatch

Write-Host ""
Write-Host "   Localhost tables: $($localTables.Count)" -ForegroundColor Cyan
Write-Host "   Production tables: $($prodTables.Count)" -ForegroundColor Cyan

# Check specific new feature tables
Write-Host ""
Write-Host "[4/4] Checking NEW FEATURE TABLES..." -ForegroundColor Yellow

$featureTables = @(
    'MaterialCategory',
    'packing_materials', 
    'rack_consumables',
    'ConsumableCategory',
    'RackZone',
    'CompanyProfile'
)

foreach ($table in $featureTables) {
    $inLocal = $localTables -match $table
    $inProd = $prodTables -match $table
    
    $localStatus = if ($inLocal) { "YES" } else { "NO" }
    $prodStatus = if ($inProd) { "YES" } else { "NO" }
    
    $color = if ($inLocal -and $inProd) { "Green" } elseif (!$inLocal -and !$inProd) { "Yellow" } else { "Red" }
    
    Write-Host "   $table : Local[$localStatus] Production[$prodStatus]" -ForegroundColor $color
}

# Summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Localhost Version:   $localVersion" -ForegroundColor $(if($localVersion -eq $prodVersion){"Green"}else{"Yellow"})
Write-Host "Production Version:  $prodVersion" -ForegroundColor $(if($localVersion -eq $prodVersion){"Green"}else{"Yellow"})
Write-Host ""

if ($localVersion -eq $prodVersion -and $localTables.Count -eq $prodTables.Count) {
    Write-Host "STATUS: PRODUCTION MATCHES LOCALHOST!" -ForegroundColor Green
} else {
    Write-Host "STATUS: MISMATCH DETECTED!" -ForegroundColor Red
    if ($localVersion -ne $prodVersion) {
        Write-Host "  - Versions are different" -ForegroundColor Yellow
    }
    if ($localTables.Count -ne $prodTables.Count) {
        $diff = $localTables.Count - $prodTables.Count
        Write-Host "  - Database schemas differ (Local: $($localTables.Count), Production: $($prodTables.Count))" -ForegroundColor Yellow
    }
}
Write-Host ""
