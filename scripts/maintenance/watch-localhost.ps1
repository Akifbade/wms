#!/usr/bin/env pwsh
# Auto-rebuild script for localhost development
# Watches for file changes and rebuilds containers automatically

Write-Host "🔄 Starting localhost auto-rebuild watcher..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This will watch for changes and auto-rebuild:" -ForegroundColor Yellow
Write-Host "  • Backend changes → Restart backend container" -ForegroundColor Gray
Write-Host "  • Frontend changes → Rebuild and reload frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$backendPath = "$PSScriptRoot/backend/src"
$frontendPath = "$PSScriptRoot/frontend/src"
$lastBackendChange = Get-Date
$lastFrontendChange = Get-Date

while ($true) {
    Start-Sleep -Seconds 2
    
    # Check backend changes
    $backendFiles = Get-ChildItem -Path $backendPath -Recurse -File -Include *.ts,*.js | 
                    Where-Object { $_.LastWriteTime -gt $lastBackendChange }
    
    if ($backendFiles) {
        $lastBackendChange = Get-Date
        Write-Host "🔧 Backend changes detected, restarting..." -ForegroundColor Cyan
        docker-compose restart wms-backend | Out-Null
        Start-Sleep -Seconds 3
        
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            Write-Host "✅ Backend restarted: v$($data.version)" -ForegroundColor Green
        }
    }
    
    # Check frontend changes
    $frontendFiles = Get-ChildItem -Path $frontendPath -Recurse -File -Include *.tsx,*.ts,*.jsx,*.js | 
                     Where-Object { $_.LastWriteTime -gt $lastFrontendChange }
    
    if ($frontendFiles) {
        $lastFrontendChange = Get-Date
        Write-Host "🎨 Frontend changes detected, rebuilding..." -ForegroundColor Cyan
        
        Push-Location frontend
        npm run build | Out-Null
        Pop-Location
        
        docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/ | Out-Null
        docker exec wms-frontend nginx -s reload | Out-Null
        
        Write-Host "✅ Frontend rebuilt and reloaded" -ForegroundColor Green
    }
}
