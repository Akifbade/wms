# 🚀 SAFE DEPLOYMENT PLAN - November 5, 2025

## 📊 Changes Summary

### 1. Backend Code Changes (✅ SAFE - Read-Only)
- **pieceQR Parsing:** Reads existing JSON, doesn't modify data
- **Photo Collection:** Collects photos from boxes, doesn't modify data
- **TypeScript Config:** Build-time only, no runtime impact
- **File:** `backend/src/routes/shipments.ts`, `backend/tsconfig.json`

### 2. Database Schema Changes (⚠️ REQUIRES MIGRATION)
- **Custom Charges Fields:** Added 4 new columns to shipments table
  - `customRateEnabled` (BOOLEAN, default false)
  - `customRatePerCBMPerDay` (DECIMAL)
  - `customRatePerBoxPerDay` (DECIMAL)
  - `customRateNotes` (TEXT)
- **Migration:** `20251105063900_add_custom_shipment_charges`
- **Safety:** Uses `ADD COLUMN IF NOT EXISTS` - won't fail if columns exist

### 3. Frontend Changes (✅ SAFE)
- **Custom Charges Modal:** New component (won't affect existing features)
- **Report Page:** Added button (optional feature, doesn't break existing)

---

## 🛡️ Safety Features Built-In

### 1. Idempotent Migration
```sql
ALTER TABLE `shipments` 
  ADD COLUMN IF NOT EXISTS `customRateEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS `customRatePerCBMPerDay` DECIMAL(10,3) NULL,
  ...
```
✅ Can run multiple times without error
✅ Won't duplicate columns
✅ Won't affect existing data

### 2. Default Values
- `customRateEnabled` defaults to `false`
- Other fields are `NULL`
- ✅ All existing shipments will have custom charges DISABLED
- ✅ No behavior change unless user explicitly enables custom charges

### 3. Backwards Compatible
- ✅ Old code can run with new schema (columns have defaults)
- ✅ New code can run with old schema (will just not show custom charges button)
- ✅ No breaking changes to existing features

---

## 🎯 Deployment Strategy

### Stage 1: Localhost Testing (DONE ✅)
- [x] Migration applied locally
- [x] Backend running successfully
- [x] Custom charges API endpoints working
- [x] Frontend modal working
- [x] Data integrity verified

### Stage 2: Staging Deployment
**GitHub Actions Workflow:** `three-stage-deployment-ENHANCED.yml`

**Steps:**
1. ✅ **Build & Test:** Runs on GitHub
2. ✅ **Deploy to Staging:** Copies code to 148.230.107.155:8080
3. ✅ **Database Migration:** Runs `prisma migrate deploy` on staging database
4. ✅ **Health Check:** Verifies staging is healthy
5. ⏸️ **Wait for Approval:** Manual testing on staging

**Safety Checks:**
- Pre-deployment migration status check
- Schema comparison (staging vs what will be deployed)
- Automatic rollback if migration fails
- Health check before marking as success

### Stage 3: Production Deployment
**Requires:** Manual approval after staging tests pass

**Steps:**
1. ✅ **Schema Backup:** GitHub Actions backs up production schema
2. ✅ **Pre-flight Checks:** Compares staging vs production migrations
3. ✅ **Deploy Code:** Copies backend + frontend to production
4. ✅ **Apply Migration:** Runs migration on production database
5. ✅ **Health Check:** Verifies production is healthy
6. ⚠️ **Rollback Trigger:** If health check fails, auto-rollback

---

## 🔄 Rollback Options

### Option 1: Code-Only Rollback (Safest)
```powershell
.\emergency-rollback.ps1
```
- Reverts backend + frontend code
- **KEEPS database schema** (no data loss)
- Custom charges features will disappear but data stays

### Option 2: Code + Schema Rollback
```powershell
.\emergency-rollback.ps1 -IncludeSchema
```
- Reverts code + removes custom rate columns
- ⚠️ **LOSES custom rate settings** if any were saved
- Shipment data intact

### Option 3: Full Rollback (Nuclear Option)
```powershell
.\emergency-rollback.ps1 -FullRestore
```
- Restores entire database from backup
- ⚠️ **LOSES ALL DATA** created after backup
- Only use if production is completely broken

---

## ✅ Pre-Deployment Checklist

### Before Pushing to GitHub:
- [x] Local testing complete
- [x] Migration is idempotent (✅ uses IF NOT EXISTS)
- [x] Migration in proper folder structure
- [x] Default values prevent breaking changes
- [x] Rollback script tested locally
- [ ] **TODO:** Test on localhost one more time
- [ ] **TODO:** Commit all changes
- [ ] **TODO:** Push to GitHub

### After Staging Deployment:
- [ ] Check staging health: `http://148.230.107.155:8080/api/health`
- [ ] Login to staging and test:
  - [ ] Shipments page loads
  - [ ] Pallet breakdown displays correctly
  - [ ] Photos appear in shipment cards
  - [ ] Report page opens
  - [ ] Custom charges button works
  - [ ] Can set custom rates and preview
  - [ ] Charges recalculate correctly
- [ ] Check database on staging:
  ```bash
  ssh root@148.230.107.155
  docker exec staging-database mysql -u root -p warehouse_wms
  DESCRIBE shipments;  # Check custom columns exist
  SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;
  ```

### Before Production Deployment:
- [ ] Staging has been tested for 24+ hours (optional but recommended)
- [ ] No errors in staging logs
- [ ] All features confirmed working
- [ ] Database backup verified on production
- [ ] Emergency rollback script ready
- [ ] Team notified of deployment

---

## 📝 Deployment Commands

### Deploy to Staging (GitHub Actions):
```bash
# Push to trigger workflow
git add .
git commit -m "✨ Add custom charges feature + pallet display fixes"
git push origin stable/prisma-mysql-production

# Watch deployment
# https://github.com/Akifbade/wms/actions
```

### Manual Staging Migration (if GitHub Actions fails):
```bash
ssh root@148.230.107.155
cd /root/wms-staging
docker exec staging-backend npx prisma migrate deploy
docker exec staging-backend npm run restart
```

### Check Staging Status:
```powershell
Invoke-WebRequest -Uri "http://148.230.107.155:8080/api/health"
```

### Approve Production:
1. Go to https://github.com/Akifbade/wms/actions
2. Click latest "Three-Stage Deployment" workflow
3. Review staging logs
4. Click "Review deployments"
5. Select "production"
6. Click "Approve and deploy"

---

## 🚨 What If Something Goes Wrong?

### Scenario 1: Migration Fails on Staging
**GitHub Actions will:**
1. ✅ Stop deployment automatically
2. ✅ Show migration error in logs
3. ✅ Keep old code running (no changes applied)

**Action:** Fix migration SQL, commit, push again

### Scenario 2: Staging Health Check Fails
**GitHub Actions will:**
1. ✅ Trigger automatic rollback
2. ✅ Restore previous code
3. ✅ Notify in GitHub logs

**Action:** Check logs, fix issue, redeploy

### Scenario 3: Production Migration Fails
**GitHub Actions will:**
1. ✅ Stop immediately
2. ✅ Rollback code changes
3. ✅ Provide rollback instructions

**Manual Action:**
```powershell
.\emergency-rollback.ps1 -IncludeSchema
```

### Scenario 4: Production Works But Custom Charges Broken
**This is SAFE because:**
- Custom charges are disabled by default
- Existing features unaffected
- Users won't see custom charges button

**Action:** Fix custom charges code, redeploy
**No data loss, no downtime for core features**

---

## 💡 Why This Is Safe

1. **Idempotent Migration:** Can't break database even if run twice
2. **Default Disabled:** New feature off by default
3. **Backwards Compatible:** Old data works with new schema
4. **Read-Only Changes:** PieceQR parsing doesn't modify data
5. **Automatic Rollback:** GitHub Actions handles failures
6. **Manual Rollback:** `emergency-rollback.ps1` script ready
7. **Staging First:** Test on staging before production
8. **Health Checks:** Automatic verification at each stage

---

## 📞 Emergency Contacts

**If Deployment Fails:**
1. Check GitHub Actions logs
2. Check VPS logs: `ssh root@148.230.107.155 'docker logs production-backend'`
3. Run rollback: `.\emergency-rollback.ps1`
4. Contact: (Add your contact info)

---

**Status:** ✅ Ready for deployment  
**Risk Level:** 🟢 LOW (idempotent migration, disabled by default)  
**Rollback Ready:** ✅ YES  
**Created:** November 5, 2025, 7:10 AM
