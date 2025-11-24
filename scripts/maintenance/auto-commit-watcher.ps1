# Auto-commit watcher for local changes
# This script monitors frontend files and automatically commits & pushes changes

Write-Host "🚀 Starting Auto-Commit Watcher..." -ForegroundColor Green
Write-Host "📁 Watching: frontend/src/" -ForegroundColor Cyan
Write-Host "⏱️  Debounce: 5 seconds" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$watchPath = "frontend/src"
$debounceSeconds = 5
$lastChange = Get-Date
$changesDetected = $false

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $watchPath
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# File extensions to watch
$watcher.Filter = "*.*"

# Define the action to take when a file change is detected
$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    
    # Ignore node_modules, dist, and other build artifacts
    if ($path -match "node_modules|dist|\.git|\.vscode") {
        return
    }
    
    # Only watch certain file types
    if ($path -notmatch "\.(tsx?|jsx?|css|scss|json)$") {
        return
    }
    
    $script:lastChange = Get-Date
    $script:changesDetected = $true
    
    Write-Host "📝 Detected $changeType : $path" -ForegroundColor Yellow
}

# Register event handlers
Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action | Out-Null

Write-Host "✅ Watcher started successfully!" -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # If changes detected and debounce time passed
        if ($changesDetected) {
            $timeSinceLastChange = (Get-Date) - $lastChange
            
            if ($timeSinceLastChange.TotalSeconds -ge $debounceSeconds) {
                Write-Host ""
                Write-Host "⏳ Debounce complete. Processing changes..." -ForegroundColor Cyan
                
                # Check if there are actual git changes
                $gitStatus = git status --porcelain
                
                if ($gitStatus) {
                    Write-Host "🔍 Changes detected in git:" -ForegroundColor Green
                    Write-Host $gitStatus
                    Write-Host ""
                    
                    # Add all changes
                    Write-Host "📦 Adding changes..." -ForegroundColor Cyan
                    git add .
                    
                    # Commit with timestamp
                    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    $commitMsg = "auto: Local changes at $timestamp"
                    Write-Host "💾 Committing: $commitMsg" -ForegroundColor Cyan
                    git commit -m $commitMsg --no-verify
                    
                    # Push to current branch
                    $branch = git branch --show-current
                    Write-Host "📤 Pushing to $branch..." -ForegroundColor Cyan
                    git push origin $branch
                    
                    Write-Host ""
                    Write-Host "✅ Auto-commit and push complete!" -ForegroundColor Green
                    Write-Host "🎯 GitHub Actions will now deploy to staging automatically" -ForegroundColor Magenta
                    Write-Host ""
                } else {
                    Write-Host "ℹ️  No git changes to commit" -ForegroundColor Gray
                }
                
                # Reset flags
                $changesDetected = $false
                Write-Host "👀 Watching for new changes..." -ForegroundColor Cyan
                Write-Host ""
            }
        }
    }
}
finally {
    # Cleanup
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Get-EventSubscriber | Unsubscribe-Event
    Write-Host "🛑 Watcher stopped" -ForegroundColor Red
}
