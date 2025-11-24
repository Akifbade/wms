# 3-STAGE DEPLOYMENT SAFETY SYSTEM

## 🚨 Problem Fixed

**Previous Issue:**
- Database migrations were NOT syncing from staging to production
- Caused 502 errors due to missing columns (zone, zoneDescription, zoneIcon)
- Backend code expected columns that didn't exist in production database
- No proper rollback mechanism for database schema

**Root Cause:**
The GitHub Actions workflow only copied backend **code** from staging to production, but never ran `prisma migrate deploy` on the production database.

---

## ✅ Solution Implemented

### 1. **Enhanced Deployment Pipeline**

**File:** `.github/workflows/three-stage-deployment-ENHANCED.yml`

**New Features:**
- ✅ **STEP 3A:** Pre-deployment database safety checks
  - Compares staging vs production migration status
  - Shows schema differences before deployment
  - Creates schema backup before migrations
  - Cleans failed migrations automatically

- ✅ **STEP 3C:** Database migration deployment (NEW!)
  - Runs `npx prisma migrate deploy` on production database
  - Automatically applies migrations tested in staging
  - Triggers rollback if migrations fail
  - Validates migration success before proceeding

- ✅ **Automatic Rollback:** On migration failure
  - Restores backend code from backup
  - Restores frontend from backup
  - Provides database schema restore instructions
  - Shows health status after rollback

### 2. **3-Stage Emergency Rollback System**

**File:** `emergency-rollback.ps1`

**Usage:**
```powershell
# Stage 1: Rollback code only (safe, no data loss)
.\emergency-rollback.ps1

# Stage 2: Rollback code + schema (resets table structure)
.\emergency-rollback.ps1 -IncludeSchema

# Stage 3: Full restore (WARNING: erases all data after backup)
.\emergency-rollback.ps1 -FullRestore
```

**Safety Features:**
- **Stage 1:** Automatic code rollback (frontend + backend files)
- **Stage 2:** Schema rollback with confirmation prompt
- **Stage 3:** Full database restore with double confirmation
- Health checks after each stage
- Detailed backup information display
- Prevents accidental data loss

### 3. **Database Sync Checker**

**File:** `check-database-sync.ps1`

**Usage:**
```powershell
# Basic check
.\check-database-sync.ps1

# Detailed column comparison
.\check-database-sync.ps1 -Detailed
```

**Features:**
- Compares staging vs production migration status
- Checks for missing critical columns
- Provides fix commands if out of sync
- Shows detailed schema differences

---

## 📋 How to Use

### Normal Deployment (Local → Staging → Production)

1. **Make changes locally** and commit:
   ```powershell
   .\quick-commit.ps1
   ```
   Or let auto-watcher commit automatically.

2. **Automatic staging deployment:**
   - GitHub Actions deploys to staging automatically on push
   - Tests migrations on staging database (port 3308)
   - Verifies health checks

3. **Check if databases are in sync** (optional):
   ```powershell
   .\check-database-sync.ps1
   ```

4. **Deploy to production** (manual approval):
   - Go to: https://github.com/Akifbade/wms/actions
   - Select: "Three-Stage Deployment Pipeline"
   - Click: "Run workflow"
   - Select environment: **production**
   - Click: "Run workflow"

5. **What happens during production deployment:**
   - ✅ Creates complete backups (code + database)
   - ✅ Promotes frontend from staging
   - ✅ Checks staging vs production schemas
   - ✅ Deploys backend code
   - ✅ **Runs database migrations** (NEW!)
   - ✅ Health checks after deployment
   - ✅ Automatic rollback if anything fails

### Emergency Rollback

**If deployment fails and automatic rollback doesn't work:**

1. **Check what went wrong:**
   ```powershell
   ssh -i ~/.ssh/github_actions_wms root@148.230.107.155
   docker logs wms-backend --tail 50
   ```

2. **Run manual rollback:**
   ```powershell
   # Safe: Only rollback code
   .\emergency-rollback.ps1
   
   # If schema is broken:
   .\emergency-rollback.ps1 -IncludeSchema
   
   # LAST RESORT (erases data):
   .\emergency-rollback.ps1 -FullRestore
   ```

3. **Verify production is working:**
   - Check: http://qgocargo.cloud
   - Check: http://148.230.107.155

---

## 🔍 Troubleshooting

### Issue: "502 Bad Gateway" after deployment

**Diagnosis:**
```powershell
.\check-database-sync.ps1 -Detailed
```

**Fix if columns are missing:**
```powershell
ssh -i ~/.ssh/github_actions_wms root@148.230.107.155
docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms << 'EOF'
ALTER TABLE racks 
ADD COLUMN zone VARCHAR(191) DEFAULT 'Unassigned' AFTER location,
ADD COLUMN zoneDescription TEXT AFTER zone,
ADD COLUMN zoneIcon VARCHAR(50) DEFAULT '📦' AFTER zoneDescription;
EOF

docker restart wms-backend
```

### Issue: Migration failed during deployment

**What happens automatically:**
1. Workflow detects migration failure
2. Stops deployment immediately
3. Restores backend code from backup
4. Restores frontend from backup
5. Shows database restore instructions

**Manual recovery:**
```powershell
.\emergency-rollback.ps1 -IncludeSchema
```

### Issue: Need to restore to earlier state

**Check available backups on VPS:**
```powershell
ssh -i ~/.ssh/github_actions_wms root@148.230.107.155
cd "/root/NEW START"
ls -lht backups/production-*
```

**Restore from specific backup:**
```powershell
ssh -i ~/.ssh/github_actions_wms root@148.230.107.155
cd "/root/NEW START"

# Find backup
BACKUP="backups/production-20241102-143000"  # Use actual timestamp

# Restore code
docker stop wms-backend wms-frontend
docker cp "$BACKUP/backend/." wms-backend:/app/
docker cp "$BACKUP/frontend/." wms-frontend:/usr/share/nginx/html/
docker start wms-backend wms-frontend

# Restore database (if needed - WARNING: erases data)
docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms < "$BACKUP/database/warehouse_wms-full-backup.sql"
```

---

## 🛡️ Safety Features

### Backups Created Automatically:
1. **Frontend files** (HTML/JS/CSS)
2. **Backend code** (Node.js + Prisma)
3. **Database schema** (structure only, safe)
4. **Full database** (data + schema, for emergencies)

### Rollback Stages:
- **Stage 1:** Code only (fast, no data loss)
- **Stage 2:** Code + schema (resets tables, keeps data if compatible)
- **Stage 3:** Full restore (complete reset, last resort)

### Health Checks:
- Frontend HTTP response (port 80)
- Backend API health endpoint (port 5000)
- Database connectivity
- Container status

---

## 📝 Migration Workflow

### Before (Broken):
```
Local → Git Push → Staging (✅ migrations applied)
                         ↓
                   Production (❌ migrations NOT applied)
                   = 502 ERRORS
```

### After (Fixed):
```
Local → Git Push → Staging (✅ migrations applied)
                         ↓
                   Manual approval
                         ↓
                   Production:
                   1. Backup everything
                   2. Copy code
                   3. ✅ Run migrations (NEW!)
                   4. Health checks
                   5. Auto rollback if fails
```

---

## 🚀 Quick Reference

| Action | Command |
|--------|---------|
| Deploy to staging | `.\quick-commit.ps1` (automatic) |
| Check database sync | `.\check-database-sync.ps1` |
| Deploy to production | GitHub Actions → Run workflow → production |
| Emergency rollback (code) | `.\emergency-rollback.ps1` |
| Emergency rollback (schema) | `.\emergency-rollback.ps1 -IncludeSchema` |
| Full restore | `.\emergency-rollback.ps1 -FullRestore` |
| Check backend logs | `ssh ... "docker logs wms-backend --tail 50"` |
| Check container status | `ssh ... "docker ps"` |

---

## ⚠️ Important Notes

1. **Always test in staging first** before promoting to production
2. **Backups are automatic** but verify they exist before risky operations
3. **Database rollback is OPTIONAL** in emergency - only use if absolutely needed
4. **Stage 3 rollback ERASES DATA** - use only as last resort
5. **GitHub Actions now handles migrations** - no manual ALTER TABLE needed

---

## 🎯 Files Modified/Created

### Enhanced:
- `.github/workflows/three-stage-deployment-ENHANCED.yml` (replace old one)

### New:
- `emergency-rollback.ps1` (3-stage manual rollback)
- `check-database-sync.ps1` (schema comparison tool)
- `3-STAGE-DEPLOYMENT-SAFETY.md` (this file)

### Next Steps:
1. Replace old workflow with enhanced version:
   ```powershell
   Remove-Item ".github/workflows/three-stage-deployment.yml"
   Rename-Item ".github/workflows/three-stage-deployment-ENHANCED.yml" "three-stage-deployment.yml"
   ```

2. Commit and push:
   ```powershell
   .\quick-commit.ps1
   ```

3. Test staging deployment (automatic)

4. Test production deployment (manual)

---

**Created:** November 2, 2024  
**Version:** 3.0 (Enhanced with migration safety)  
**Status:** ✅ Ready for deployment
