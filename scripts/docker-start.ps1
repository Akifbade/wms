# Docker Start Script for Windows
# Easy one-command startup

param(
    [switch]$Dev,
    [switch]$Prod,
    [switch]$Build
)

Write-Host "WMS Docker Manager" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "Docker is not running! Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Default to development mode
$mode = "dev"
$composeFile = "docker-compose.dev.yml"

if ($Prod) {
    $mode = "prod"
    $composeFile = "docker-compose.yml"
    Write-Host "Starting in PRODUCTION mode" -ForegroundColor Green
} else {
    Write-Host "Starting in DEVELOPMENT mode" -ForegroundColor Yellow
}

Write-Host ""

# Load environment variables
if (Test-Path ".env") {
    Write-Host "Loading environment variables..." -ForegroundColor Cyan
} else {
    Write-Host "No .env file found, copying from .env.docker..." -ForegroundColor Yellow
    Copy-Item ".env.docker" ".env"
}

Write-Host ""

# Build if requested
if ($Build) {
    Write-Host "Building Docker images..." -ForegroundColor Cyan
    docker-compose -f $composeFile build --no-cache
    Write-Host ""
}

# Stop existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Cyan
docker-compose -f $composeFile down
Write-Host ""

# Start containers
Write-Host "Starting containers..." -ForegroundColor Green
docker-compose -f $composeFile up -d

Write-Host ""
Write-Host "Containers started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Service Status:" -ForegroundColor Cyan
docker-compose -f $composeFile ps

Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
if ($Prod) {
    Write-Host "   Frontend: http://localhost" -ForegroundColor White
} else {
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
}
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "   Database: localhost:3306" -ForegroundColor White

Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "   View logs:    docker-compose -f $composeFile logs -f" -ForegroundColor White
Write-Host "   Stop:         docker-compose -f $composeFile down" -ForegroundColor White
Write-Host "   Restart:      docker-compose -f $composeFile restart" -ForegroundColor White
Write-Host "   Shell access: docker exec -it wms-backend-$mode sh" -ForegroundColor White

Write-Host ""
Write-Host "Setup complete! Your application is running." -ForegroundColor Green
