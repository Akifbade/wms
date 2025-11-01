# 🤖 AI CONVERSATION BACKUP SYSTEM
# Automatically saves conversation context every 5 minutes
# So new AI can continue exactly where you left off!

param(
    [string]$ConversationSummary = "",
    [string]$CurrentTask = "",
    [string]$IssuesFaced = "",
    [string]$NextSteps = ""
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$dateStamp = Get-Date -Format "yyyyMMdd-HHmmss"

# AUTO-DETECT from recent commits if not provided
if ([string]::IsNullOrEmpty($CurrentTask)) {
    $recentCommit = git log -1 --pretty=format:"%s" 2>$null
    if ($recentCommit -and $recentCommit -notmatch "AUTO-BACKUP") {
        $CurrentTask = "Working on: $recentCommit"
    } else {
        $CurrentTask = "Development in progress"
    }
}

if ([string]::IsNullOrEmpty($ConversationSummary)) {
    $last5Commits = git log -5 --pretty=format:"- %s" 2>$null | Where-Object { $_ -notmatch "AUTO-BACKUP" } | Select-Object -First 3
    if ($last5Commits) {
        $ConversationSummary = "Recent work completed:`n$($last5Commits -join "`n")"
    } else {
        $ConversationSummary = "Active development session"
    }
}

# File paths
$contextFile = "AI-SESSION-CONTEXT.md"
$backupFolder = "ai-conversation-backups"

# Create backup folder if not exists
if (-not (Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
}

# Get current branch
$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) { $currentBranch = "unknown" }

# Get recent commits
$recentCommits = git log --oneline -5 2>$null | Out-String

# Get changed files
$changedFiles = git status --short 2>$null | Out-String

# Get Docker status
$dockerStatus = docker ps --format "table {{.Names}}\t{{.Status}}" 2>$null | Out-String

# Get recent git tags
$recentTags = git tag -l "backup-*" 2>$null | Select-Object -Last 5 | Out-String

# Read existing context if available
$existingContext = ""
if (Test-Path $contextFile) {
    $existingContext = Get-Content $contextFile -Raw
}

# Generate AI Context Document
$aiContext = @"
# 🤖 AI SESSION CONTEXT
**Last Updated:** $timestamp  
**Branch:** $currentBranch  
**Auto-Generated:** This file is updated every 5 minutes automatically

---

## 📊 CURRENT PROJECT STATUS

### Docker Containers:
``````
$dockerStatus
``````

### Git Status:
``````
Branch: $currentBranch

Changed Files:
$changedFiles
``````

### Recent Commits:
``````
$recentCommits
``````

### Recent Backup Tags:
``````
$recentTags
``````

---

## 🎯 CURRENT SESSION INFO

### What We're Working On:
$CurrentTask

### Recent Conversation Summary:
$ConversationSummary

### Issues Faced (if any):
$IssuesFaced

### Next Steps (if planned):
$NextSteps

### 💬 LAST AI CONVERSATION TOPICS:
**Auto-detected from recent commits and activity:**

$ConversationSummary

**Key Points for New AI:**
1. Read the recent commits above to understand what was done
2. Check Docker status to see system health
3. Review changed files to know what's modified
4. Continue from current branch: $currentBranch
5. User prefers Hinglish communication
6. Always create backup before risky changes
7. Test thoroughly before merging to master

---

## 🛠️ TECHNICAL STACK

**Backend:**
- Express.js + TypeScript
- Prisma ORM
- MySQL 8.0 (Docker)
- Port: 5000

**Frontend:**
- React + TypeScript
- Vite (Dev Server)
- TailwindCSS
- Port: 80 (mapped from 3000)

**Database:**
- MySQL 8.0
- Port: 3307 (mapped from 3306)
- Volume: wms-db-data (persistent)

**Key Features:**
- Warehouse Management (Shipments, Boxes, Racks)
- Moving Jobs (Local & International)
- Materials Management (Issue/Return)
- Staff Assignment System (NEW!)
- Invoice & Billing
- Multi-tenant (Companies)

---

## 🔧 COMMON PROBLEMS & FIXES

### Problem 1: Vite Crashed
``````powershell
.\scripts\auto-fix.ps1
# Select option 1
``````

### Problem 2: Prisma Error
``````powershell
.\scripts\auto-fix.ps1
# Select option 2
``````

### Problem 3: Database Schema Change
``````powershell
.\scripts\fix-prisma-after-db-change.ps1
``````

### Problem 4: Frontend Not Loading
``````powershell
docker restart wms-frontend-dev
``````

### Problem 5: Backend Crash
``````powershell
docker logs wms-backend-dev --tail 20
docker restart wms-backend-dev
``````

---

## 📁 IMPORTANT FILES LOCATIONS

### Backend:
- Schema: ``backend/prisma/schema.prisma``
- Routes: ``backend/src/routes/``
- Main: ``backend/src/index.ts``

### Frontend:
- Components: ``frontend/src/components/``
- Pages: ``frontend/src/pages/``
- Utils: ``frontend/src/utils/``

### Scripts:
- Auto-backup: ``scripts/auto-backup.ps1``
- Auto-fix: ``scripts/auto-fix.ps1``
- Prisma fix: ``scripts/fix-prisma-after-db-change.ps1``

### Documentation:
- Main guide: ``00-README-START-HERE.md``
- AI guide: ``HOW-TO-WORK-WITH-AI.md``
- Database guide: ``WHY-DATABASE-BREAKS.md``

---

## 🎨 USER PREFERENCES

**Communication Style:**
- Hinglish (Hindi + English mix)
- Uses caps when stressed: "BHAI", "YAAR"
- Wants simple explanations
- Prefers step-by-step instructions
- Appreciates emojis and clear formatting

**Workflow:**
1. Create backup tag FIRST
2. Make changes incrementally
3. Commit after each working change
4. Test in browser
5. Ask user to verify
6. Only then merge to master

**Safety First:**
- Never break production
- Always create backup before changes
- Use feature branches
- Test before merging

---

## 🚀 QUICK START FOR NEW AI

If you're a new AI taking over this conversation:

1. **Read this file completely**
2. **Check current branch:** ``git branch --show-current``
3. **Check Docker status:** ``docker ps``
4. **Read recent commits:** ``git log --oneline -5``
5. **Check for errors:** ``docker logs wms-frontend-dev --tail 20``
6. **Continue from "Next Steps" section above**

---

## 🔄 EMERGENCY ROLLBACK

If something breaks:

``````powershell
# See backup tags
git tag -l "backup-*"

# Rollback to safe point
git reset --hard backup-XXXXXXXX

# Restart Docker
docker-compose down
docker-compose -f docker-compose.dev.yml up -d
``````

---

## 📞 AUTO-BACKUP INFO

**Frequency:** Every 5 minutes  
**Script:** ``scripts/auto-backup.ps1``  
**Log:** ``auto-backup.log``

**Check if running:**
``````powershell
Get-Process | Where-Object {`$_.CommandLine -like "*auto-backup*"}
``````

---

## ✅ LAST KNOWN WORKING STATE

**Timestamp:** $timestamp  
**Branch:** $currentBranch  
**Frontend:** $(if ((docker ps --filter "name=wms-frontend-dev" --filter "status=running" -q)) { "✅ Running" } else { "❌ Not Running" })  
**Backend:** $(if ((docker ps --filter "name=wms-backend-dev" --filter "status=running" -q)) { "✅ Running" } else { "❌ Not Running" })  
**Database:** $(if ((docker ps --filter "name=wms-database-dev" --filter "health=healthy" -q)) { "✅ Healthy" } else { "❌ Unhealthy" })

---

## 🎯 FEATURE DEVELOPMENT GUIDELINES

### When Adding New Feature:

1. **Create backup:**
   ``````powershell
   git tag backup-feature-name-$dateStamp
   ``````

2. **Create branch:**
   ``````powershell
   git checkout -b feature/feature-name
   ``````

3. **If database changes needed:**
   - Edit ``backend/prisma/schema.prisma``
   - Run ``.\scripts\fix-prisma-after-db-change.ps1``

4. **Test thoroughly:**
   - Frontend: ``http://localhost``
   - Backend API: ``http://localhost:5000/api/``
   - Check console (F12) for errors

5. **Commit incrementally:**
   ``````powershell
   git add .
   git commit -m "Clear description of change"
   ``````

6. **Merge only when stable:**
   ``````powershell
   git checkout master
   git merge feature/feature-name
   git push origin master
   ``````

---

**🔄 This file is auto-updated every 5 minutes by auto-backup script**

**📌 For manual update, edit:** ``scripts/update-ai-context.ps1``

---
"@

# Save main context file
$aiContext | Out-File -FilePath $contextFile -Encoding UTF8 -Force

# Create timestamped backup
$backupFile = "$backupFolder\AI-CONTEXT-$dateStamp.md"
$aiContext | Out-File -FilePath $backupFile -Encoding UTF8 -Force

# Keep only last 20 backups (cleanup old ones)
$allBackups = Get-ChildItem -Path $backupFolder -Filter "AI-CONTEXT-*.md" | Sort-Object LastWriteTime -Descending
if ($allBackups.Count -gt 20) {
    $allBackups | Select-Object -Skip 20 | Remove-Item -Force
}

Write-Host "✅ AI Context updated: $contextFile" -ForegroundColor Green
Write-Host "💾 Backup saved: $backupFile" -ForegroundColor Cyan

# Return success
exit 0
