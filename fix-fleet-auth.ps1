# PowerShell script to fix Fleet authentication errors
Write-Host "🔧 Fixing Fleet Authentication Issues..." -ForegroundColor Cyan

$controllers = @(
    "backend\src\modules\fleet\controllers\trip.controller.ts",
    "backend\src\modules\fleet\controllers\fuel.controller.ts",
    "backend\src\modules\fleet\controllers\driver.controller.ts",
    "backend\src\modules\fleet\controllers\vehicle.controller.ts",
    "backend\src\modules\fleet\controllers\event.controller.ts",
    "backend\src\modules\fleet\controllers\report.controller.ts",
    "backend\src\modules\fleet\controllers\tracking.controller.ts"
)

$fixCount = 0

foreach ($file in $controllers) {
    if (Test-Path $file) {
        Write-Host "📝 Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw
        $originalContent = $content
        
        # Fix: (req as any).user.companyId -> (req as any).user?.companyId
        # And add null check after each occurrence
        $pattern = '(\s+)const companyId = \(req as any\)\.user\.companyId;'
        $replacement = '$1const companyId = (req as any).user?.companyId;$1if (!companyId) {$1  return res.status(401).json({ error: ''Unauthorized: Company ID required'' });$1}'
        
        $content = $content -replace $pattern, $replacement
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file -Value $content -NoNewline
            Write-Host "  ✅ Fixed authentication checks" -ForegroundColor Green
            $fixCount++
        } else {
            Write-Host "  ℹ️  No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n✨ Fix Complete!" -ForegroundColor Green
Write-Host "📊 Files modified: $fixCount" -ForegroundColor Cyan
Write-Host "`n🔄 Please restart the backend server for changes to take effect." -ForegroundColor Yellow
