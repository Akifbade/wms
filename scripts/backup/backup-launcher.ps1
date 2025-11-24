# ====================================================================
# WMS QUICK BACKUP LAUNCHER
# ====================================================================
# Easy menu to choose backup type
# ====================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   WMS BACKUP SYSTEM                                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Choose backup type:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 📊 Database Only Backup" -ForegroundColor White
Write-Host "   (Quick backup of database - via web interface)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🔧 PowerShell Backup" -ForegroundColor White
Write-Host "   (Database + uploads + configs)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 💎 FULL SYSTEM BACKUP" -ForegroundColor Green
Write-Host "   (Everything - one-click restore ready!)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. ❌ Cancel" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📊 Opening web interface for database backup..." -ForegroundColor Cyan
        Start-Process "http://localhost/backups"
        Write-Host "✅ Web interface opened - create backup from there" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "🔧 Running PowerShell backup..." -ForegroundColor Cyan
        & .\auto-backup-system.ps1
    }
    "3" {
        Write-Host ""
        Write-Host "💎 Running FULL SYSTEM backup..." -ForegroundColor Green
        & .\full-system-backup.ps1
    }
    "4" {
        Write-Host ""
        Write-Host "❌ Cancelled" -ForegroundColor Red
        exit
    }
    default {
        Write-Host ""
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
