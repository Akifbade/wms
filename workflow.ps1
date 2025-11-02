#!/usr/bin/env pwsh
# ============================================================================
# AUTOMATED WORKFLOW: LOCAL → STAGING → PRODUCTION
# ============================================================================
# This script enforces the proper deployment workflow:
# 1. Build locally
# 2. Test locally
# 3. Commit locally
# 4. Push to GitHub (triggers staging)
# 5. Test on staging
# 6. Manually approve production
#
# Use: .\workflow.ps1
# ============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$text)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $text" -PadRight 62 "║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$step, [string]$text)
    Write-Host "Step $step: $text" -ForegroundColor Yellow
}

function Test-Build {
    Write-Host "🏗️  Testing local build..." -ForegroundColor Cyan
    Set-Location frontend
    npm run build 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ BUILD FAILED! Fix errors:" -ForegroundColor Red
        npm run build
        Set-Location ..
        exit 1
    }
    
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Set-Location ..
}

function Get-ChangesSummary {
    Write-Host ""
    Write-Host "📋 Changes to commit:" -ForegroundColor Cyan
    git diff --name-only --cached | ForEach-Object { Write-Host "  • $_" -ForegroundColor Yellow }
    Write-Host ""
}

function Invoke-Commit {
    Write-Host "📝 Committing changes..." -ForegroundColor Cyan
    
    $message = Read-Host "Commit message"
    if (-not $message) {
        Write-Host "❌ Commit message required" -ForegroundColor Red
        exit 1
    }
    
    git add -A
    git commit -m $message
    
    Write-Host "✅ Committed!" -ForegroundColor Green
}

function Invoke-Push {
    Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
    git push origin stable/prisma-mysql-production
    
    Write-Host "✅ Pushed!" -ForegroundColor Green
    Write-Host "🔗 GitHub Actions will automatically deploy to staging" -ForegroundColor Cyan
    Write-Host "🔗 Watch progress: https://github.com/Akifbade/wms/actions" -ForegroundColor Yellow
}

function Test-Staging {
    Write-Host "⏳ Waiting for staging deployment..." -ForegroundColor Magenta
    Write-Host "   (GitHub Actions takes 2-5 minutes)" -ForegroundColor Gray
    
    for ($i = 1; $i -le 6; $i++) {
        Start-Sleep -Seconds 30
        $response = Invoke-WebRequest -Uri "http://148.230.107.155:8080/api/health" -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            Write-Host ""
            Write-Host "✅ STAGING DEPLOYMENT COMPLETE!" -ForegroundColor Green
            Write-Host "   Version: $($data.version)" -ForegroundColor Green
            Write-Host "   Environment: $($data.environment)" -ForegroundColor Green
            Write-Host ""
            Write-Host "🌐 Open staging in browser: http://148.230.107.155:8080" -ForegroundColor Cyan
            
            $browser = Read-Host "Open in browser? (y/n)"
            if ($browser -eq "y" -or $browser -eq "Y") {
                Start-Process "http://148.230.107.155:8080"
            }
            return $true
        }
        
        Write-Host "   Still deploying... ($i/6 checks done)" -ForegroundColor Gray
    }
    
    Write-Host "⚠️  Staging not ready after 3 minutes" -ForegroundColor Yellow
    Write-Host "   Check GitHub Actions logs: https://github.com/Akifbade/wms/actions" -ForegroundColor Yellow
    return $false
}

function Test-StagingFeatures {
    Write-Host "🧪 Please manually test on staging:" -ForegroundColor Cyan
    Write-Host "   ✓ Frontend loads" -ForegroundColor Gray
    Write-Host "   ✓ Can log in" -ForegroundColor Gray
    Write-Host "   ✓ QR codes generate correctly" -ForegroundColor Gray
    Write-Host "   ✓ Photo uploads work" -ForegroundColor Gray
    Write-Host "   ✓ Shipment creation works" -ForegroundColor Gray
    Write-Host "   ✓ Rack assignment works" -ForegroundColor Gray
    Write-Host "   ✓ No console errors" -ForegroundColor Gray
    
    $staging_ok = Read-Host "Is staging working? (y/n)"
    return ($staging_ok -eq "y" -or $staging_ok -eq "Y")
}

function Approve-Production {
    Write-Host ""
    Write-Host "🟢 READY FOR PRODUCTION!" -ForegroundColor Green
    Write-Host ""
    Write-Host "TO DEPLOY TO PRODUCTION:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://github.com/Akifbade/wms/actions" -ForegroundColor Yellow
    Write-Host "2. Click: Three-Stage Deployment workflow" -ForegroundColor Yellow
    Write-Host "3. Click: Run workflow" -ForegroundColor Yellow
    Write-Host "4. Select environment: production" -ForegroundColor Yellow
    Write-Host "5. Click: Run workflow" -ForegroundColor Yellow
    Write-Host "6. GitHub will ask for approval - click Approve" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✅ Production will update automatically!" -ForegroundColor Green
    
    $open_github = Read-Host "Open GitHub Actions? (y/n)"
    if ($open_github -eq "y" -or $open_github -eq "Y") {
        Start-Process "https://github.com/Akifbade/wms/actions"
    }
}

# ============================================================================
# MAIN WORKFLOW
# ============================================================================

Write-Header "LOCAL → STAGING → PRODUCTION WORKFLOW"

Write-Step "1" "Build and test locally"
Test-Build

Write-Step "2" "Review changes"
Get-ChangesSummary

Write-Step "3" "Commit locally"
Invoke-Commit

Write-Step "4" "Push to GitHub"
$confirm = Read-Host "Push to GitHub? This will trigger staging deployment (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}
Invoke-Push

Write-Step "5" "Wait for staging deployment"
if (-not (Test-Staging)) {
    Write-Host "Check GitHub Actions manually: https://github.com/Akifbade/wms/actions" -ForegroundColor Yellow
    exit 0
}

Write-Step "6" "Test staging"
if (-not (Test-StagingFeatures)) {
    Write-Host "Staging has issues. Fix before production." -ForegroundColor Red
    exit 1
}

Write-Step "7" "Approve production deployment"
Approve-Production

Write-Header "✅ WORKFLOW COMPLETE!"
Write-Host "Deployed: Local ✅ → Staging ✅ → Production (awaiting approval)" -ForegroundColor Green
Write-Host ""
