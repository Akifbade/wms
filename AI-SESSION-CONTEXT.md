# ًں¤– AI SESSION CONTEXT
**Last Updated:** 2025-10-28 01:54:38  
**Branch:** stable/prisma-mysql-production  
**Auto-Generated:** This file is updated every 5 minutes automatically

---

## ًں“ٹ CURRENT PROJECT STATUS

### Docker Containers:
```
NAMES             STATUS
wms-backend       Up 4 hours (healthy)
wms-db-backup     Up 4 hours
wms-frontend      Up 4 hours (unhealthy)
wms-database      Up 4 hours (healthy)
wms-git-watcher   Up 4 hours

```

### Git Status:
```
Branch: stable/prisma-mysql-production

Changed Files:
 M auto-backup.log

```

### Recent Commits:
```
bd5a1711c AUTO-BACKUP: 2025-10-28 01:54:37
4b2226038 AUTO-BACKUP: 2025-10-28 01:49:31
73d752688 AUTO-BACKUP: 2025-10-28 01:19:13
4cf29a8b3 AUTO-BACKUP: 2025-10-28 01:14:08
b23ce9fba AUTO-BACKUP: 2025-10-28 01:04:01

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

**Timestamp:** 2025-10-28 01:54:38  
**Branch:** stable/prisma-mysql-production  
**Frontend:** â‌Œ Not Running  
**Backend:** â‌Œ Not Running  
**Database:** â‌Œ Unhealthy

---

## ًںژ¯ FEATURE DEVELOPMENT GUIDELINES

### When Adding New Feature:

1. **Create backup:**
   ```powershell
   git tag backup-feature-name-20251028-015438
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
