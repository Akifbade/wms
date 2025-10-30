# Quick Auto-Commit Script
# Run this after making changes to automatically commit and push

Write-Host "🚀 Auto-Commit Script" -ForegroundColor Green
Write-Host ""

# Check for changes
$gitStatus = git status --porcelain

if (-not $gitStatus) {
    Write-Host "ℹ️  No changes detected" -ForegroundColor Yellow
    exit 0
}

Write-Host "🔍 Changes detected:" -ForegroundColor Cyan
Write-Host $gitStatus
Write-Host ""

# Add all changes
Write-Host "📦 Adding all changes..." -ForegroundColor Cyan
git add .

# Commit with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "auto: Local changes at $timestamp"

Write-Host "💾 Committing: $commitMsg" -ForegroundColor Cyan
git commit -m $commitMsg

# Push to current branch
$branch = git branch --show-current
Write-Host "📤 Pushing to branch: $branch" -ForegroundColor Cyan
git push origin $branch

Write-Host ""
Write-Host "✅ Success! Changes committed and pushed" -ForegroundColor Green
Write-Host "🎯 GitHub Actions will deploy to staging automatically" -ForegroundColor Magenta
