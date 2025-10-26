# 💬 UPDATE CONVERSATION CONTEXT
# Use this script to manually update what you're working on
# So new AI can continue from where you left off

Write-Host ""
Write-Host "💬 UPDATE AI CONVERSATION CONTEXT" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will help new AI understand what you're currently working on." -ForegroundColor Yellow
Write-Host ""

# Get current task
Write-Host "1️⃣  What are you currently working on?" -ForegroundColor Green
Write-Host "   (Example: Adding staff assignment feature)" -ForegroundColor Gray
$currentTask = Read-Host "   Your answer"

# Get issues faced
Write-Host ""
Write-Host "2️⃣  Any issues or errors you're facing?" -ForegroundColor Green
Write-Host "   (Example: Vite keeps crashing, or: None)" -ForegroundColor Gray
$issuesFaced = Read-Host "   Your answer"

# Get next steps
Write-Host ""
Write-Host "3️⃣  What needs to be done next?" -ForegroundColor Green
Write-Host "   (Example: Test in browser and merge to master)" -ForegroundColor Gray
$nextSteps = Read-Host "   Your answer"

# Get conversation summary
Write-Host ""
Write-Host "4️⃣  Quick summary of this conversation?" -ForegroundColor Green
Write-Host "   (Example: Fixed staff assignment UI, moved to separate tab)" -ForegroundColor Gray
$conversationSummary = Read-Host "   Your answer"

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
