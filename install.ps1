# ⚡ Quick Installation Script for Windows PowerShell

Write-Host "🚀 Starting Warehouse Management System Setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Install root dependencies
Write-Host "📦 Step 1/4: Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Root dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Install backend dependencies
Write-Host "📦 Step 2/4: Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Step 3: Install frontend dependencies
Write-Host "📦 Step 3/4: Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Step 4: Check database configuration
Write-Host "🗄️  Step 4/4: Checking database configuration..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "✅ Environment file found" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Configure your database connection in backend\.env" -ForegroundColor Yellow
    Write-Host "   Edit DATABASE_URL with your MySQL credentials" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Then run database migrations:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor Cyan
    Write-Host "   npx prisma migrate dev --name init" -ForegroundColor Cyan
    Write-Host "   npx prisma generate" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "⚠️  .env file not found in backend folder" -ForegroundColor Yellow
    Write-Host "   Copy backend\.env.example to backend\.env and configure it" -ForegroundColor Yellow
    Write-Host ""
}

# Final message
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Configure database in backend\.env" -ForegroundColor White
Write-Host "2. Run migrations: cd backend; npx prisma migrate dev" -ForegroundColor White
Write-Host "3. Start development: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 The app will run on:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "📚 Read SETUP-GUIDE.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""