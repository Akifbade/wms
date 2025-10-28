# ًں¤– AI SESSION CONTEXT
**Last Updated:** 2025-10-28 11:10:11  
**Branch:** stable/prisma-mysql-production  
**Auto-Generated:** This file is updated every 5 minutes automatically

---

## ًں“ٹ CURRENT PROJECT STATUS

### Docker Containers:
```
NAMES             STATUS
wms-backend       Up 13 hours (healthy)
wms-db-backup     Up 13 hours
wms-frontend      Up 13 hours (unhealthy)
wms-database      Up 13 hours (healthy)
wms-git-watcher   Up 13 hours

```

### Git Status:
```
Branch: stable/prisma-mysql-production

Changed Files:
 M AI-SESSION-CONTEXT.md
 D ai-conversation-backups/AI-CONTEXT-20251028-083710.md
 D ai-conversation-backups/AI-CONTEXT-20251028-084217.md
 D ai-conversation-backups/AI-CONTEXT-20251028-084725.md
 D ai-conversation-backups/AI-CONTEXT-20251028-085232.md
 D ai-conversation-backups/AI-CONTEXT-20251028-085740.md
 D ai-conversation-backups/AI-CONTEXT-20251028-090248.md
 D ai-conversation-backups/AI-CONTEXT-20251028-090755.md
 D ai-conversation-backups/AI-CONTEXT-20251028-091303.md
 D ai-conversation-backups/AI-CONTEXT-20251028-091808.md
 D ai-conversation-backups/AI-CONTEXT-20251028-092315.md
 M auto-backup.log
 M frontend/nginx.conf
?? ai-conversation-backups/AI-CONTEXT-20251028-101931.md
?? ai-conversation-backups/AI-CONTEXT-20251028-102434.md
?? ai-conversation-backups/AI-CONTEXT-20251028-102938.md
?? ai-conversation-backups/AI-CONTEXT-20251028-103442.md
?? ai-conversation-backups/AI-CONTEXT-20251028-103946.md
?? ai-conversation-backups/AI-CONTEXT-20251028-104450.md
?? ai-conversation-backups/AI-CONTEXT-20251028-104955.md
?? ai-conversation-backups/AI-CONTEXT-20251028-105459.md
?? ai-conversation-backups/AI-CONTEXT-20251028-110003.md
?? ai-conversation-backups/AI-CONTEXT-20251028-110507.md
?? frontend/nginx_clean.conf

```

### Recent Commits:
```
fcb34361a AUTO-BACKUP: 2025-10-28 10:19:28
1b171ded6 AUTO-BACKUP: 2025-10-28 10:14:23
e7de48da0 AUTO-BACKUP: 2025-10-28 10:09:16
8f648b727 AUTO-BACKUP: 2025-10-28 10:04:10
6cdd61b70 AUTO-BACKUP: 2025-10-28 09:59:03

```

### Recent Backup Tags:
```
backup-before-fixes-20251026-205204
backup-before-fixes-20251026-205214
backup-before-mui-fix-20251026-201645
backup-staff-assignment-20251026-192228
backup-v1.0

```

---

## ًںژ¯ CURRENT SESSION INFO

### What We're Working On:
Auto-backup in progress

### Recent Conversation Summary:
Active development session

### Issues Faced (if any):


### Next Steps (if planned):


### ًں’¬ LAST AI CONVERSATION TOPICS:
**Auto-detected from recent commits and activity:**

Active development session

**Key Points for New AI:**
1. Read the recent commits above to understand what was done
2. Check Docker status to see system health
3. Review changed files to know what's modified
4. Continue from current branch: stable/prisma-mysql-production
5. User prefers Hinglish communication
6. Always create backup before risky changes
7. Test thoroughly before merging to master

---

## ًں› ï¸ڈ TECHNICAL STACK

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

## ًں”§ COMMON PROBLEMS & FIXES

### Problem 1: Vite Crashed
```powershell
.\scripts\auto-fix.ps1
# Select option 1
```

### Problem 2: Prisma Error
```powershell
.\scripts\auto-fix.ps1
# Select option 2
```

### Problem 3: Database Schema Change
```powershell
.\scripts\fix-prisma-after-db-change.ps1
```

### Problem 4: Frontend Not Loading
```powershell
docker restart wms-frontend-dev
```

### Problem 5: Backend Crash
```powershell
docker logs wms-backend-dev --tail 20
docker restart wms-backend-dev
```

---

## ًں“پ IMPORTANT FILES LOCATIONS

### Backend:
- Schema: `backend/prisma/schema.prisma`
- Routes: `backend/src/routes/`
- Main: `backend/src/index.ts`

### Frontend:
- Components: `frontend/src/components/`
- Pages: `frontend/src/pages/`
- Utils: `frontend/src/utils/`

### Scripts:
- Auto-backup: `scripts/auto-backup.ps1`
- Auto-fix: `scripts/auto-fix.ps1`
- Prisma fix: `scripts/fix-prisma-after-db-change.ps1`

### Documentation:
- Main guide: `00-README-START-HERE.md`
- AI guide: `HOW-TO-WORK-WITH-AI.md`
- Database guide: `WHY-DATABASE-BREAKS.md`

---

## ًںژ¨ USER PREFERENCES

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

## ًںڑ€ QUICK START FOR NEW AI

If you're a new AI taking over this conversation:

1. **Read this file completely**
2. **Check current branch:** `git branch --show-current`
3. **Check Docker status:** `docker ps`
4. **Read recent commits:** `git log --oneline -5`
5. **Check for errors:** `docker logs wms-frontend-dev --tail 20`
6. **Continue from "Next Steps" section above**

---

## ًں”„ EMERGENCY ROLLBACK

If something breaks:

```powershell
# See backup tags
git tag -l "backup-*"

# Rollback to safe point
git reset --hard backup-XXXXXXXX

# Restart Docker
docker-compose down
docker-compose -f docker-compose.dev.yml up -d
```

---

## ًں“‍ AUTO-BACKUP INFO

**Frequency:** Every 5 minutes  
**Script:** `scripts/auto-backup.ps1`  
**Log:** `auto-backup.log`

**Check if running:**
```powershell
Get-Process | Where-Object {$_.CommandLine -like "*auto-backup*"}
```

---

## âœ… LAST KNOWN WORKING STATE

**Timestamp:** 2025-10-28 11:10:11  
**Branch:** stable/prisma-mysql-production  
**Frontend:** â‌Œ Not Running  
**Backend:** â‌Œ Not Running  
**Database:** â‌Œ Unhealthy

---

## ًںژ¯ FEATURE DEVELOPMENT GUIDELINES

### When Adding New Feature:

1. **Create backup:**
   ```powershell
   git tag backup-feature-name-20251028-111011
   ```

2. **Create branch:**
   ```powershell
   git checkout -b feature/feature-name
   ```

3. **If database changes needed:**
   - Edit `backend/prisma/schema.prisma`
   - Run `.\scripts\fix-prisma-after-db-change.ps1`

4. **Test thoroughly:**
   - Frontend: `http://localhost`
   - Backend API: `http://localhost:5000/api/`
   - Check console (F12) for errors

5. **Commit incrementally:**
   ```powershell
   git add .
   git commit -m "Clear description of change"
   ```

6. **Merge only when stable:**
   ```powershell
   git checkout master
   git merge feature/feature-name
   git push origin master
   ```

---

**ًں”„ This file is auto-updated every 5 minutes by auto-backup script**

**ًں“Œ For manual update, edit:** `scripts/update-ai-context.ps1`

---
