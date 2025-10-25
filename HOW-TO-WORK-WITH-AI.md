# 🤖 HOW TO WORK WITH AI ON THIS PROJECT

## ⚠️ IMPORTANT: Read this before asking AI for any changes!

### 🎯 The Problem:
When you open a new chat with AI, it has **NO MEMORY** of your project. This means:
- AI doesn't know what works and what doesn't
- AI might break existing features
- AI might forget to commit changes
- AI might use wrong approach

### ✅ The Solution: 3-Step Process

---

## STEP 1: Share Context (MANDATORY!)

**Every new chat, copy-paste this to AI:**

```
I have a working WMS project. Before making ANY changes:

1. Read AI-CONTEXT.md file completely
2. Create backup tag: git tag backup-$(Get-Date -Format "yyyyMMdd-HHmmss")
3. Create feature branch: git checkout -b feature/[feature-name]
4. Make changes incrementally
5. Commit after EACH working change
6. Test before merging
7. Ask me to verify before merging to master

Project is PRODUCTION READY and WORKING. Don't break it!

Now I want to add: [YOUR FEATURE REQUEST]
```

---

## STEP 2: AI Will Auto-Protect

The auto-backup system will save you even if AI forgets:

```powershell
# This runs automatically every 5 minutes
# (Started by desktop shortcut "WMS - START")
scripts/auto-backup.ps1
```

**What it does:**
- Auto-commits every 5 minutes
- Even if AI forgets to commit
- Even if you forget to commit
- Runs in background silently

---

## STEP 3: Verify & Test

After AI makes changes:

```powershell
# 1. Check what changed
git status
git diff

# 2. Test in browser
# Open http://localhost
# Try the new feature
# Make sure old features still work

# 3. If GOOD:
git checkout master
git merge feature/your-feature
git push origin master

# 4. If BAD:
git checkout master
git branch -D feature/your-feature
git tag -l "backup-*"
git reset --hard backup-XXXXXXXX
```

---

## 📋 Example Conversation

### ❌ WRONG WAY (Dangerous!):
```
You: "Add a dashboard with charts"
AI: *makes random changes*
AI: *breaks authentication*
You: 😱 Project broken!
```

### ✅ RIGHT WAY (Safe!):
```
You: "I have a working WMS project. Read AI-CONTEXT.md first.
      Then add a dashboard with charts.
      Use feature branch. Test before merge."

AI: *reads context*
AI: *creates backup tag*
AI: *creates feature branch*
AI: *adds feature incrementally*
AI: *commits each step*
AI: "Feature ready! Please test at http://localhost/dashboard"

You: *tests*
You: "Looks good!"
AI: *merges to master*
```

---

## 🛡️ Safety Net (Even if AI messes up)

### Auto-Backup System:
- ✅ Commits every 5 minutes automatically
- ✅ Runs in background (started by "WMS - START" shortcut)
- ✅ Check log: `auto-backup.log`

### Volume Mounts:
- ✅ Code changes persist even if Docker restarts
- ✅ Edit files locally, Docker auto-reloads
- ✅ Database in separate volume

### Manual Backups:
```powershell
# Before any risky change
git tag backup-safe-$(Get-Date -Format "yyyyMMdd-HHmmss")
```

### Recovery:
```powershell
# See all backups
git tag -l "backup-*"

# Restore
git reset --hard backup-20251025-143000
```

---

## 📝 Template for New Chat

**Copy this template when opening new AI chat:**

```markdown
🎯 PROJECT: Warehouse Management System (WMS)
📁 LOCATION: c:\Users\USER\Videos\NEW START\

⚠️ CRITICAL INSTRUCTIONS:
1. Read AI-CONTEXT.md file FIRST
2. This is a WORKING production system
3. Use feature branches for ALL changes
4. Create backup before starting
5. Commit frequently
6. Test before merging
7. Ask me to verify

📋 WHAT I NEED:
[Your feature request here]

🔍 CURRENT STATUS:
- Docker: Running ✅
- Database: MySQL 8.0 ✅
- All features: Working ✅
- Auto-backup: Running ✅
```

---

## 🎓 Pro Tips

### Tip 1: Always verify AI understood the project
```
After sharing context, ask AI:
"What database are we using?"
"What framework is the frontend?"

If AI says wrong answer, share AI-CONTEXT.md again!
```

### Tip 2: Small changes are safer
```
Instead of: "Build complete reporting dashboard"
Better: "Add one simple chart showing material count"
Then: "Add another chart for..."
```

### Tip 3: Test frequently
```
After every AI change:
1. Refresh browser
2. Check console for errors
3. Test the new feature
4. Test old features (make sure nothing broke)
```

### Tip 4: Keep auto-backup running
```
Desktop shortcut "WMS - START" does this automatically
Check if running:
Get-Process | Where-Object {$_.CommandLine -like "*auto-backup*"}
```

### Tip 5: Commit messages matter
```
Good: "Add material chart to dashboard"
Bad: "Update files"

Good commit messages help you find the right backup!
```

---

## 🚨 Emergency Contacts (For You)

If something breaks badly:

### Option 1: Rollback
```powershell
git tag -l "backup-*"
git reset --hard [latest backup tag]
docker-compose down
docker-compose -f docker-compose.dev.yml up -d
```

### Option 2: Start fresh from GitHub
```powershell
cd c:\Users\USER\Videos\
git clone https://github.com/Akifbade/wms.git wms-fresh
cd wms-fresh
.\scripts\START-EVERYTHING.ps1
```

### Option 3: Check auto-backup log
```powershell
Get-Content "c:\Users\USER\Videos\NEW START\auto-backup.log" -Tail 50
```

---

## ✅ Checklist Before Asking AI for Changes

- [ ] Auto-backup is running (check taskbar)
- [ ] Current code is working (test in browser)
- [ ] Docker containers are healthy (`docker ps`)
- [ ] No uncommitted changes (`git status`)
- [ ] Created backup tag manually (for safety)
- [ ] Ready to share AI-CONTEXT.md with AI

**If all checked, you're safe to proceed! 🚀**
