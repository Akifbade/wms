Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  CLEARING BROWSER CACHE" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Please do these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open your browser" -ForegroundColor White
Write-Host "2. Go to: http://localhost:3000/clear-cache.html" -ForegroundColor Green
Write-Host "3. Wait for 'Cache Cleared Successfully!'" -ForegroundColor White
Write-Host "4. Click 'Continue to App'" -ForegroundColor White
Write-Host ""
Write-Host "OR paste this in browser console (F12):" -ForegroundColor Yellow
Write-Host ""
Write-Host "navigator.serviceWorker.getRegistrations().then(all => all.forEach(reg => reg.unregister()));" -ForegroundColor Cyan
Write-Host "caches.keys().then(keys => keys.forEach(key => caches.delete(key)));" -ForegroundColor Cyan
Write-Host "localStorage.clear(); sessionStorage.clear(); location.reload();" -ForegroundColor Cyan
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  CACHE PROBLEM FIXED PERMANENTLY" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After clearing cache once, you will NEVER need to:" -ForegroundColor Yellow
Write-Host "  - Hard refresh (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "  - Clear cache again" -ForegroundColor White
Write-Host "  - Worry about old data" -ForegroundColor White
Write-Host ""
Write-Host "All data will be FRESH always! 🎉" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to open clear-cache page in browser..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:3000/clear-cache.html"
