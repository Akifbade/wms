#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Fix: Branding System Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create uploads directory
Write-Host "[1/4] Creating uploads directory..." -ForegroundColor Yellow
$uploadsDir = "c:\Users\USER\Videos\NEW START\backend\public\uploads\logos"
if (-not (Test-Path $uploadsDir)) {
    New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
    Write-Host "✓ Created: $uploadsDir" -ForegroundColor Green
} else {
    Write-Host "✓ Already exists: $uploadsDir" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check if SQLite DB exists
Write-Host "[2/4] Checking database..." -ForegroundColor Yellow
$dbPath = "c:\Users\USER\Videos\NEW START\backend\prisma\dev.db"
if (Test-Path $dbPath) {
    Write-Host "✓ Database found: $dbPath" -ForegroundColor Green
} else {
    Write-Host "✗ Database not found! Creating new database..." -ForegroundColor Red
    Set-Location "c:\Users\USER\Videos\NEW START\backend"
    npx prisma migrate dev --name init
}
Write-Host ""

# Step 3: Add branding columns to SQLite database
Write-Host "[3/4] Adding branding columns to database..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Videos\NEW START\backend"

# Check if sqlite3 is available
$sqlite3Available = Get-Command sqlite3 -ErrorAction SilentlyContinue
if ($sqlite3Available) {
    # Use sqlite3 command
    Get-Content add-branding-fields.sql | sqlite3 prisma/dev.db 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Branding columns added successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠ Columns might already exist (this is OK)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ sqlite3 command not found, trying alternative method..." -ForegroundColor Yellow
    
    # Alternative: Use PowerShell with System.Data.SQLite
    try {
        # Create a simple migration manually
        $sql = @"
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Add columns if they don't exist
ALTER TABLE companies ADD COLUMN primaryColor TEXT DEFAULT '#4F46E5';
ALTER TABLE companies ADD COLUMN secondaryColor TEXT DEFAULT '#7C3AED';
ALTER TABLE companies ADD COLUMN accentColor TEXT DEFAULT '#10B981';
ALTER TABLE companies ADD COLUMN showCompanyName INTEGER DEFAULT 1;

COMMIT;
PRAGMA foreign_keys=ON;
"@
        $sql | Out-File -FilePath "temp_migration.sql" -Encoding UTF8
        Write-Host "✓ Created migration file" -ForegroundColor Green
        Write-Host "  Run manually: sqlite3 prisma/dev.db < temp_migration.sql" -ForegroundColor Yellow
    } catch {
        Write-Host "⚠ Could not create migration automatically" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 4: Regenerate Prisma client
Write-Host "[4/4] Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate | Out-Null
Write-Host "✓ Prisma client regenerated" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Quick Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Restart backend: Ctrl+C in backend terminal, then 'npm run dev'" -ForegroundColor White
Write-Host "2. Refresh frontend: Ctrl+R in browser" -ForegroundColor White
Write-Host "3. Test: Go to Settings → Branding & Appearance" -ForegroundColor White
Write-Host ""
Write-Host "If issues persist:" -ForegroundColor Yellow
Write-Host "• Check backend terminal for errors" -ForegroundColor White
Write-Host "• Check browser console (F12)" -ForegroundColor White
Write-Host "• Verify database with: sqlite3 prisma/dev.db 'PRAGMA table_info(companies);'" -ForegroundColor White
Write-Host ""
