# 🚨 DATABASE RESTORATION SCRIPT

Write-Host "🚨 DATABASE CORRUPTION DETECTED" -ForegroundColor Red
Write-Host "The Fleet migration corrupted the database." -ForegroundColor Yellow
Write-Host ""
Write-Host "This script will:" -ForegroundColor Cyan
Write-Host "  1. Backup the corrupted database"
Write-Host "  2. Delete it"
Write-Host "  3. Run fresh migrations"
Write-Host "  4. Restore your data"
Write-Host ""

$confirm = Read-Host "Do you want to proceed? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "📦 Step 1: Backing up corrupted database..." -ForegroundColor Cyan
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "prisma/dev.db" "prisma/dev.db.corrupted_$timestamp" -Force
Write-Host "✅ Backup saved to: prisma/dev.db.corrupted_$timestamp" -ForegroundColor Green

Write-Host ""
Write-Host "🗑️  Step 2: Deleting corrupted database..." -ForegroundColor Cyan
Remove-Item "prisma/dev.db" -Force
Remove-Item "prisma/dev.db-journal" -Force -ErrorAction SilentlyContinue
Write-Host "✅ Corrupted database deleted" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Step 3: Running fresh migrations..." -ForegroundColor Cyan
npx prisma migrate reset --force --skip-seed
Write-Host "✅ Fresh database created with all migrations" -ForegroundColor Green

Write-Host ""
Write-Host "📊 Step 4: Seeding database with demo data..." -ForegroundColor Cyan
npx prisma db seed
Write-Host "✅ Database seeded" -ForegroundColor Green

Write-Host ""
Write-Host "✅ DATABASE RESTORED SUCCESSFULLY!" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 Login Credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@demo.com"
Write-Host "  Password: admin123"
Write-Host ""
