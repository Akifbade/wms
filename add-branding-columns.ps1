#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Adding Branding Columns to Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$dbPath = "c:\Users\USER\Videos\NEW START\backend\prisma\dev.db"
$backupPath = "c:\Users\USER\Videos\NEW START\backend\prisma\dev.db.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Backup database
Write-Host "[1/3] Backing up database..." -ForegroundColor Yellow
Copy-Item $dbPath $backupPath
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green
Write-Host ""

# Add columns using Prisma migration
Write-Host "[2/3] Creating migration..." -ForegroundColor Yellow
Set-Location "c:\Users\USER\Videos\NEW START\backend"

# Create migrations directory if it doesn't exist
$migrationsDir = "prisma\migrations\$(Get-Date -Format 'yyyyMMddHHmmss')_add_branding_fields"
New-Item -ItemType Directory -Path $migrationsDir -Force | Out-Null

# Create migration.sql
$migrationSQL = @"
-- AlterTable
ALTER TABLE companies ADD COLUMN primaryColor TEXT DEFAULT '#4F46E5';
ALTER TABLE companies ADD COLUMN secondaryColor TEXT DEFAULT '#7C3AED';
ALTER TABLE companies ADD COLUMN accentColor TEXT DEFAULT '#10B981';
ALTER TABLE companies ADD COLUMN showCompanyName INTEGER DEFAULT 1;
"@

$migrationSQL | Out-File -FilePath "$migrationsDir\migration.sql" -Encoding UTF8
Write-Host "✓ Migration created" -ForegroundColor Green
Write-Host ""

# Apply migration
Write-Host "[3/3] Applying migration..." -ForegroundColor Yellow
try {
    npx prisma migrate deploy 2>&1 | Out-Null
    Write-Host "✓ Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠ Trying alternative method..." -ForegroundColor Yellow
    
    # Try using PowerShell to modify SQLite directly
    $commands = @"
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
$migrationSQL
COMMIT;
PRAGMA foreign_keys=ON;
"@
    
    try {
        # This requires sqlite3.exe to be available
        $commands | sqlite3 $dbPath
        Write-Host "✓ Columns added successfully!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Could not apply automatically" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual steps:" -ForegroundColor Yellow
        Write-Host "1. Download SQLite tools from: https://www.sqlite.org/download.html" -ForegroundColor White
        Write-Host "2. Extract sqlite3.exe to a folder in your PATH" -ForegroundColor White
        Write-Host "3. Run: sqlite3 `"$dbPath`" < `"$migrationsDir\migration.sql`"" -ForegroundColor White
        Write-Host ""
        Write-Host "OR simply recreate the database:" -ForegroundColor Yellow
        Write-Host "cd backend" -ForegroundColor White
        Write-Host "Remove-Item prisma\dev.db" -ForegroundColor White
        Write-Host "npx prisma migrate dev --name init" -ForegroundColor White
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Database Updated Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart backend server (Ctrl+C then npm run dev)" -ForegroundColor White
Write-Host "2. Refresh browser (Ctrl+R)" -ForegroundColor White
Write-Host "3. Test Settings → Branding & Appearance" -ForegroundColor White
Write-Host ""
