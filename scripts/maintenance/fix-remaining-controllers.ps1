# PowerShell script to add authentication checks to all Fleet controllers
# This adds null checks for req.user.companyId in all controllers

$controllers = @(
    "driver.controller.ts",
    "event.controller.ts", 
    "fuel.controller.ts",
    "tracking.controller.ts",
    "vehicle.controller.ts"
)

$basePath = "c:\Users\USER\Videos\NEW START\backend\src\modules\fleet\controllers"

Write-Host "🔧 Fixing Fleet Controllers Authentication..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $controllers) {
    $filePath = Join-Path $basePath $file
    
    if (Test-Path $filePath) {
        Write-Host "📝 Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $filePath -Raw
        $originalContent = $content
        
        # Pattern 1: Fix simple companyId assignment at start of function
        # This adds optional chaining and null check
        $pattern1 = '(\s+)const companyId = \(req as any\)\.user\.companyId;(\s+)'
        $replacement1 = '$1const companyId = (req as any).user?.companyId;$1if (!companyId) {$1  return res.status(401).json({ error: ''Unauthorized: Company ID required'' });$1}$2'
        
        $content = $content -replace $pattern1, $replacement1
        
        if ($content -ne $originalContent) {
            Set-Content -Path $filePath -Value $content -NoNewline
            
            # Count how many fixes were made
            $fixCount = ([regex]::Matches($originalContent, $pattern1)).Count
            Write-Host "  ✅ Added $fixCount authentication check(s)" -ForegroundColor Green
        } else {
            Write-Host "  ℹ️  No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  File not found: $file" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "✨ Fix Complete!" -ForegroundColor Green
Write-Host "🔄 Restart the backend server to apply changes" -ForegroundColor Yellow
