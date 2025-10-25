# Docker Stop Script

param(
    [switch]$Dev,
    [switch]$Prod,
    [switch]$Clean
)

Write-Host "🛑 Stopping WMS Docker Containers" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
Write-Host ""

$composeFile = if ($Prod) { "docker-compose.yml" } else { "docker-compose.dev.yml" }

# Stop containers
Write-Host "🛑 Stopping containers..." -ForegroundColor Cyan
docker-compose -f $composeFile down

if ($Clean) {
    Write-Host ""
    Write-Host "🧹 Cleaning up volumes and images..." -ForegroundColor Cyan
    docker-compose -f $composeFile down -v
    docker system prune -f
}

Write-Host ""
Write-Host "✅ Containers stopped successfully!" -ForegroundColor Green
