Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '📦 Creating Sample Materials for Feature Demo' -ForegroundColor Green
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''

# Login
Write-Host '[1/4] 🔐 Authenticating...' -ForegroundColor Yellow
$loginBody = @{
    email = 'admin@demo.com'
    password = 'demo123'
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/login' -Method POST -ContentType 'application/json' -Body $loginBody -ErrorAction SilentlyContinue
$loginData = $loginResponse.Content | ConvertFrom-Json
$token = $loginData.token
$companyId = $loginData.user.companyId

Write-Host "  ✅ Logged in as: $($loginData.user.email)" -ForegroundColor Green

# Sample materials to create
$sampleseMaterials = @(
    @{
        sku = "BOX-SMALL-001"
        name = "Small Cardboard Box"
        category = "Boxes"
        unit = "pcs"
        minStockLevel = 10
        unitCost = 1.50
        sellingPrice = 3.00
    },
    @{
        sku = "BOX-LARGE-001"
        name = "Large Cardboard Box"
        category = "Boxes"
        unit = "pcs"
        minStockLevel = 5
        unitCost = 3.00
        sellingPrice = 6.00
    },
    @{
        sku = "BUBBLE-WRAP-001"
        name = "Bubble Wrap Roll"
        category = "Protective"
        unit = "roll"
        minStockLevel = 3
        unitCost = 5.00
        sellingPrice = 10.00
    },
    @{
        sku = "FOAM-PAD-001"
        name = "Foam Padding Sheet"
        category = "Protective"
        unit = "sheet"
        minStockLevel = 20
        unitCost = 2.00
        sellingPrice = 4.00
    },
    @{
        sku = "TAPE-001"
        name = "Packing Tape Roll"
        category = "Supplies"
        unit = "roll"
        minStockLevel = 15
        unitCost = 0.50
        sellingPrice = 1.00
    }
)

Write-Host ''
Write-Host '[2/4] 📦 Creating materials...' -ForegroundColor Yellow

foreach ($material in $sampleMaterials) {
    $body = @{
        sku = $material.sku
        name = $material.name
        category = $material.category
        unit = $material.unit
        minStockLevel = $material.minStockLevel
        unitCost = $material.unitCost
        sellingPrice = $material.sellingPrice
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/materials' -Method POST -ContentType 'application/json' -Headers @{"Authorization"="Bearer $token"} -Body $body -ErrorAction SilentlyContinue
        $data = $response.Content | ConvertFrom-Json
        Write-Host "  ✅ Created: $($material.name) (SKU: $($material.sku))" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️ Could not create $($material.name) - may already exist" -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host '[3/4] 📤 Adding stock to materials...' -ForegroundColor Yellow

# Add stock batches
$stockItems = @(
    @{ quantity = 100; unitCost = 1.50; po = "PO-2025-001" },
    @{ quantity = 50; unitCost = 3.00; po = "PO-2025-002" },
    @{ quantity = 30; unitCost = 5.00; po = "PO-2025-003" }
)

$materials = Invoke-WebRequest -Uri 'http://localhost:5000/api/materials' -Headers @{"Authorization"="Bearer $token"} -ErrorAction SilentlyContinue | ConvertFrom-Json

$i = 0
foreach ($mat in $materials | Select-Object -First 3) {
    if ($i -lt $stockItems.Count) {
        $stock = $stockItems[$i]
        $stockBody = @{
            materialId = $mat.id
            quantityPurchased = $stock.quantity
            unitCost = $stock.unitCost
            purchaseOrder = $stock.po
        } | ConvertTo-Json

        try {
            $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/materials/stock' -Method POST -ContentType 'application/json' -Headers @{"Authorization"="Bearer $token"} -Body $stockBody -ErrorAction SilentlyContinue
            Write-Host "  ✅ Added $($stock.quantity) units to $($mat.name)" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️ Could not add stock to $($mat.name)" -ForegroundColor Yellow
        }
        $i++
    }
}

Write-Host ''
Write-Host '[4/4] ✅ Sample Data Created!' -ForegroundColor Green
Write-Host ''
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host '🎉 NOW YOU CAN SEE THE NEW FEATURES!' -ForegroundColor Green
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Open browser and navigate to:' -ForegroundColor Yellow
Write-Host '  1. Materials Management: http://localhost/#/materials' -ForegroundColor Cyan
Write-Host '  2. Material Reports: http://localhost/#/material-reports' -ForegroundColor Cyan
Write-Host '  3. Damage Report: http://localhost/#/damage-report' -ForegroundColor Cyan
Write-Host ''
Write-Host 'You can now:' -ForegroundColor Green
Write-Host '  • See all materials and stock levels' -ForegroundColor White
Write-Host '  • Issue materials to moving jobs' -ForegroundColor White
Write-Host '  • Record material returns' -ForegroundColor White
Write-Host '  • Track damaged materials with photos' -ForegroundColor White
Write-Host '  • View comprehensive material reports' -ForegroundColor White
Write-Host ''
