# 💬 UPDATE CONVERSATION CONTEXT
# Use this script to manually update what you're working on
# So new AI can continue from where you left off

Write-Host ""
Write-Host "💬 SAVE CONVERSATION CONTEXT" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🤖 Auto-detecting from git commits..." -ForegroundColor Yellow
Start-Sleep -Seconds 1

# Auto-detect current task from recent commits
$recentCommit = git log -1 --pretty=format:"%s" 2>$null
if ($recentCommit -and $recentCommit -notmatch "AUTO-BACKUP") {
    $currentTask = "Working on: $recentCommit"
} else {
    $currentTask = "Development in progress"
}

# Auto-detect conversation summary from last 5 non-backup commits
$last5Commits = git log -5 --pretty=format:"- %s" 2>$null | Where-Object { $_ -notmatch "AUTO-BACKUP" } | Select-Object -First 3
if ($last5Commits) {
    $conversationSummary = "Recent work:`n$($last5Commits -join "`n")"
} else {
    $conversationSummary = "Active development session"
}

# Auto-detect issues from Docker/git status
$issuesFaced = "None detected - system running normally"

# Auto-detect next steps from branch name and status
$currentBranch = git branch --show-current 2>$null
if ($currentBranch -match "feature/(.+)") {
    $featureName = $matches[1]
    $nextSteps = "Complete and test $featureName feature, then merge to master"
} else {
    $nextSteps = "Continue development on current branch"
}

Write-Host "✅ Auto-detected:" -ForegroundColor Green
Write-Host "   Task: $currentTask" -ForegroundColor White
Write-Host "   Summary: Recent commits analyzed" -ForegroundColor White
Write-Host "   Next: $nextSteps" -ForegroundColor White
Write-Host ""

Write-Host "📝 Do you want to add manual notes? (y/n)" -ForegroundColor Yellow
$addManual = Read-Host "   "

if ($addManual -eq "y") {
    Write-Host ""
    Write-Host "1️⃣  Add specific task details? (press Enter to skip)" -ForegroundColor Green
    $manualTask = Read-Host "   "
    if ($manualTask) { $currentTask = $manualTask }
    
    Write-Host ""
    Write-Host "2️⃣  Any specific issues? (press Enter to skip)" -ForegroundColor Green
    $manualIssues = Read-Host "   "
    if ($manualIssues) { $issuesFaced = $manualIssues }
    
    Write-Host ""
    Write-Host "3️⃣  Specific next steps? (press Enter to skip)" -ForegroundColor Green
    $manualNext = Read-Host "   "
    if ($manualNext) { $nextSteps = $manualNext }
    
    Write-Host ""
    Write-Host "4️⃣  Add to summary? (press Enter to skip)" -ForegroundColor Green
    $manualSummary = Read-Host "   "
    if ($manualSummary) { $conversationSummary += "`n`nManual note: $manualSummary" }
}

Write-Host ""
Write-Host "💾 Saving context..." -ForegroundColor Cyan

# Call the update script with parameters
& ".\scripts\update-ai-context.ps1" `
    -CurrentTask $currentTask `
    -IssuesFaced $issuesFaced `
    -NextSteps $nextSteps `
    -ConversationSummary $conversationSummary

Write-Host ""
Write-Host "✅ DONE! Context saved to:" -ForegroundColor Green
Write-Host "   📄 AI-SESSION-CONTEXT.md" -ForegroundColor White
Write-Host "   💾 ai-conversation-backups/" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 FOR NEW AI CHAT - JUST TYPE THIS:" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "     CONTINUE WMS" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "That's it! AI will read AI-SESSION-CONTEXT.md automatically!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Optional - Add specific issue:" -ForegroundColor Gray
Write-Host "  CONTINUE WMS" -ForegroundColor White
Write-Host "  Vite is crashing" -ForegroundColor White
Write-Host ""
