# ًں¤– AI SESSION CONTEXT
**Last Updated:** 2025-10-26 21:14:14  
**Branch:** feature/staff-assignment  
**Auto-Generated:** This file is updated every 5 minutes automatically

---

## ًں“ٹ CURRENT PROJECT STATUS

### Docker Containers:
```
NAMES                 STATUS
wms-frontend-dev      Up 9 minutes
wms-backend-dev       Up 33 minutes
wms-git-watcher-dev   Up 40 minutes
wms-database-dev      Up 40 minutes (healthy)

```

### Git Status:
```
Branch: feature/staff-assignment

Changed Files:
 M auto-backup.log
 M scripts/auto-backup.ps1
?? scripts/save-conversation.ps1
?? scripts/update-ai-context.ps1

```

### Recent Commits:
```
ecef0e24d AUTO-BACKUP: 2025-10-26 21:10:06
7fbe87f0e Add auto-fix script for common problems
7465e84a7 Move Staff Assignment to separate tab (beside Materials tab in Job Details)
851e1fd40 AUTO-BACKUP: 2025-10-26 21:00:03
306fc713a Install Material UI for StaffAssignmentDialog + Add database troubleshooting guide

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
Staff Assignment Feature - Moved to separate tab

### Issues Faced:
None - All working

### Next Steps:
Test in browser, then merge to master

### Conversation Summary:
Fixed Staff Assignment UI, added auto-fix script, explained tech stack choices

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

**Timestamp:** 2025-10-26 21:14:14  
**Branch:** feature/staff-assignment  
**Frontend:** âœ… Running  
**Backend:** âœ… Running  
**Database:** âœ… Healthy

---

## ًںژ¯ FEATURE DEVELOPMENT GUIDELINES

### When Adding New Feature:

1. **Create backup:**
   ```powershell
   git tag backup-feature-name-20251026-211414
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
