# 🔙 ONE-CLICK RESTORE SCRIPT
# Quickly restore old approval flow if you don't like the new one

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  RESTORE OLD APPROVAL FLOW' -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

$timestamp = '20251222-112609'

Write-Host '📋 Restoring files from backup...' -ForegroundColor Cyan
Write-Host ''

# Restore ApprovalManager
if (Test-Path "frontend/src/components/moving-jobs/ApprovalManager.tsx.backup-$timestamp") {
    Copy-Item `
        "frontend/src/components/moving-jobs/ApprovalManager.tsx.backup-$timestamp" `
        "frontend/src/components/moving-jobs/ApprovalManager.tsx" -Force
    Write-Host '  ✅ ApprovalManager.tsx restored' -ForegroundColor Green
} else {
    Write-Host '  ❌ Backup not found for ApprovalManager' -ForegroundColor Red
}

# Restore MovingJobs
if (Test-Path "frontend/src/pages/MovingJobs/MovingJobs.tsx.backup-$timestamp") {
    Copy-Item `
        "frontend/src/pages/MovingJobs/MovingJobs.tsx.backup-$timestamp" `
        "frontend/src/pages/MovingJobs/MovingJobs.tsx" -Force
    Write-Host '  ✅ MovingJobs.tsx restored' -ForegroundColor Green
} else {
    Write-Host '  ❌ Backup not found for MovingJobs' -ForegroundColor Red
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host '  RESTORE COMPLETE!' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host '📝 Next steps:' -ForegroundColor Cyan
Write-Host '  1. Rebuild: cd frontend; npm run build' -ForegroundColor White
Write-Host '  2. Commit: git add . && git commit -m "revert: Restore old approval flow"' -ForegroundColor White
Write-Host '  3. Push: git push origin stable/prisma-mysql-production' -ForegroundColor White
Write-Host ''
