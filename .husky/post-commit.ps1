# 🔄 POST-COMMIT HOOK: Auto-update localhost after commit
# This ensures localhost is always in sync with latest commit

Write-Host ""
Write-Host "🔄 POST-COMMIT: Auto-updating localhost..." -ForegroundColor Cyan

# Update frontend
Set-Location frontend
npm run build 2>&1 | Out-Null
Set-Location ..

# Deploy to localhost containers
docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/ 2>&1 | Out-Null
docker exec wms-frontend nginx -s reload 2>&1 | Out-Null

Write-Host "✅ Localhost frontend updated!" -ForegroundColor Green

# Check backend version
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -ErrorAction SilentlyContinue
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Localhost backend: v$($data.version)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Localhost backend not responding" -ForegroundColor Yellow
}

Write-Host ""
