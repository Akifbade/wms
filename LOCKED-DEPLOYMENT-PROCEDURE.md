# 🔒 LOCKED DEPLOYMENT PROCEDURE (DO NOT CHANGE)

**Status:** ✅ VERIFIED WORKING  
**Last Tested:** November 2, 2025  
**Safety Level:** MAXIMUM (Auto-rollback enabled)

---

## 📋 THE EXACT WORKFLOW (MUST FOLLOW THIS ORDER)

### ✅ STEP 1: LOCAL DEVELOPMENT & TESTING
```
Location: Your machine (localhost)
Process:
  1. Edit code in VSCode (backend/src or frontend/src)
  2. Save file (auto-save enabled)
  3. Test locally: http://localhost:5000 (backend) or http://localhost (frontend)
  4. Verify changes work on your machine
  5. NO COMMITS YET
```

**Safety:** ✅ Only affects your local Docker containers  
**Rollback:** ✅ Easy - just reload page or restart container  

---

### ✅ STEP 2: GIT COMMIT (with auto-version update)
```
Command: git add . && git commit -m "your message"
OR: Use VSCode Source Control panel
OR: Use Task: 📝 WORKFLOW STEP 2: Commit Changes Locally

What happens:
  1. Code committed locally
  2. Git hook runs (pre-commit)
  3. Version auto-updates: v2.1.45 → v2.1.46
  4. Commit message saved to VERSION.md
  5. Version displays in UI "Info" button
  6. Code NOT pushed yet (local only)
```

**Safety:** ✅ No remote changes yet  
**Rollback:** ✅ `git revert COMMIT_HASH`

---

### ✅ STEP 3: PUSH TO GITHUB
```
Command: git push origin stable/prisma-mysql-production
OR: Use Task: 🚀 WORKFLOW STEP 3: Push to GitHub

What happens:
  1. Code pushed to GitHub
  2. GitHub Actions automatically triggers
  3. THREE-STAGE DEPLOYMENT STARTS
  4. (You wait 2-5 minutes)
```

**Safety:** ✅ GitHub Actions validates everything  
**Rollback:** ✅ Auto-rollback if staging fails

---

### ✅ STEP 4: AUTO DEPLOY TO STAGING (GitHub Actions)
```
GitHub Actions does this automatically (you don't touch it):

  Stage 1: BUILD
    ✓ Checkout code
    ✓ Install dependencies
    ✓ Build frontend
    ✓ Update version
    ✓ Upload artifact
    
  Stage 2: DEPLOY TO STAGING (148.230.107.155:8080)
    ✓ Download build artifact
    ✓ Create pre-deployment backup
    ✓ Deploy frontend via SCP
    ✓ Deploy backend via rsync
    ✓ Install backend dependencies
    ✓ Generate Prisma client
    ✓ Run migrations
    ✓ Health checks
    ✓ If ALL OK: Staging is updated
    ✓ If ANY FAILS: Auto-rollback from backup
```

**What you do:**
  - WAIT 2-5 minutes for deployment
  - Watch GitHub Actions: https://github.com/Akifbade/wms/actions
  - Check staging: http://148.230.107.155:8080

**Safety:** ✅ Automatic rollback if anything fails  
**Rollback:** ✅ Already automatic

---

### ✅ STEP 5: TEST ON STAGING
```
URL: http://148.230.107.155:8080

Test checklist:
  ✓ Frontend loads
  ✓ Can log in
  ✓ Dashboard shows
  ✓ Shipments page works
  ✓ QR codes generate (SHIPMENT_XXX format)
  ✓ Rack QR works (RACK_XXX format)
  ✓ Photo uploads work
  ✓ Scanner works with new format
  ✓ No console errors (F12)
  ✓ All features you changed work

IF ANYTHING FAILS:
  → Don't proceed to production
  → Tell developer: "Staging has issue X"
  → Wait for fix and re-push
```

**Safety:** ✅ Staging is isolated from production  
**Rollback:** ✅ Can revert in GitHub/staging if needed

---

### ✅ STEP 6: MANUAL PRODUCTION APPROVAL (You decide)
```
ONLY if staging is 100% OK:

How to deploy to production:
  1. Go to: https://github.com/Akifbade/wms/actions
  2. Click: "Three-Stage Deployment" workflow
  3. Click: "Run workflow"
  4. Select: environment = "production"
  5. Click: "Run workflow"
  6. GitHub asks for approval → Click "Approve"
  7. Wait 2-5 minutes
  8. Production is updated
  
OR Use VSCode Task:
  Task: 🟢 WORKFLOW STEP 5: Approve Production Deployment
```

**What happens:**
```
  Stage 3: DEPLOY TO PRODUCTION (qgocargo.cloud)
    ✓ Create pre-deployment backup (frontend, backend, database)
    ✓ Promote staging containers → production
    ✓ Verify health checks
    ✓ If ALL OK: Production is live
    ✓ If ANY FAILS: Auto-rollback from backup
```

**Safety:** ✅ Backup created before ANY change  
**Rollback:** ✅ Automatic if health checks fail  
**Manual Recovery:** ✅ Backup stored in `/root/NEW START/backups/`

---

## 🚨 WHAT MUST NEVER HAPPEN

❌ **NEVER** commit directly to `main` or `production` branch  
❌ **NEVER** manually SSH to VPS and change code  
❌ **NEVER** skip staging testing  
❌ **NEVER** push to production without manual approval  
❌ **NEVER** deploy if staging tests fail  
❌ **NEVER** change GitHub Actions workflow without approval  

---

## ✅ VERSION AUTO-UPDATE SYSTEM

**How it works:**
```
1. You make code changes locally
2. You commit: git commit -m "feat: new feature"
3. Git pre-commit hook runs
4. Hook updates VERSION.md → v2.1.46
5. Hook updates frontend/public/version.json
6. Version shows in UI info button
7. Each commit = new version automatically
```

**Visible in UI:**
```
Info Button shows:
  Version: v2.1.46
  Build: Nov 2, 2025
  Commit: abc123def
  Message: feat: new feature
```

**All commits tracked:**
- Version.md has full history
- Each commit message saved
- Easy to see what changed in each version

---

## 🔄 VSCODE TASKS (Quick Reference)

**Use these to automate:**

| Task | What it does |
|------|-------------|
| ✅ WORKFLOW STEP 1 | Build locally, verify no errors |
| 📝 WORKFLOW STEP 2 | Commit to git locally |
| 🚀 WORKFLOW STEP 3 | Push to GitHub (triggers staging) |
| 🧪 WORKFLOW STEP 4 | Wait for staging, check health |
| 🟢 WORKFLOW STEP 5 | Open GitHub for production approval |
| ⚡ QUICK WORKFLOW | Run ALL steps in order |
| 🔄 LOCALHOST REBUILD | Rebuild localhost Docker |
| 📱 LOCALHOST TEST | Open frontend |
| 🧪 LOCALHOST TEST | Check all APIs |

---

## 📊 CURRENT SAFE STATE

**Localhost (Development):**
```
✅ v2.1.45 running
✅ All new QR features working
✅ All changes visible
✅ Safe to test
```

**Staging (Testing):**
```
✅ v2.1.38 currently deployed
✅ Ready for next push (will update to v2.1.45)
✅ Pre-deployment backups: AUTOMATIC
✅ Health checks: AUTOMATIC
✅ Auto-rollback: ENABLED
```

**Production (Live):**
```
✅ v2.1.0 currently live
✅ Awaiting manual approval from staging
✅ Pre-deployment backups: AUTOMATIC
✅ Health checks: AUTOMATIC  
✅ Auto-rollback: ENABLED
```

---

## 🎯 FOR NEW AI (MUST REMEMBER)

**THE ONLY WORKFLOW:**
1. Changes made → Test locally
2. Commit locally → Auto-version update
3. Push to GitHub → Auto-deploys to staging
4. Test staging thoroughly
5. Manual approval → Auto-deploys to production

**NEVER:**
- ❌ Manually edit VPS files
- ❌ Manually push to production
- ❌ Skip staging testing
- ❌ Change workflow without asking user
- ❌ Break auto-rollback safety systems

**IF SOMETHING BREAKS:**
1. Check GitHub Actions logs
2. Automatic rollback already happened
3. Previous version restored from backup
4. Check what went wrong
5. Fix locally and re-commit

**VERSION UPDATES:**
- Every commit = new version
- Automatic update via git hook
- Shows in UI info button
- Includes commit message

---

## ✨ BENEFITS OF THIS LOCKED WORKFLOW

✅ **Safe:** Auto-rollback prevents breaking production  
✅ **Automatic:** GitHub Actions handles deployment  
✅ **Testable:** Staging isolates from production  
✅ **Traceable:** Every commit tracked with version  
✅ **Fast:** 2-5 minutes from commit to staging  
✅ **Controlled:** Manual approval before production  
✅ **Recoverable:** Backups before every change  

---

## 📞 EMERGENCY CHECKLIST

**If staging deployment fails:**
```
✅ Already auto-rollback by GitHub Actions
✅ Check logs: GitHub Actions workflow
✅ Previous version automatically restored
✅ Staging still works (reverted)
→ Fix issue locally, commit, push again
```

**If production deployment fails:**
```
✅ Already auto-rollback by GitHub Actions
✅ Check logs: GitHub Actions workflow
✅ Previous version automatically restored
✅ Database backup restored automatically
✅ Production still works (reverted)
→ Fix issue locally, commit, push, test staging, re-approve
```

**If you need manual rollback:**
```
SSH: ssh root@148.230.107.155
Find backup: ls /root/NEW\ START/backups/
Restore: docker cp BACKUP/. CONTAINER:/app/
Restart: docker restart CONTAINER
Verify: curl http://localhost:5000/api/health
```

---

## 🔐 THIS WORKFLOW IS LOCKED

**Do not change:**
- ✅ GitHub Actions workflow (already perfect)
- ✅ Docker-compose files (already perfect)
- ✅ Git pre-commit hooks (already perfect)
- ✅ Version auto-update system (already perfect)
- ✅ Three-stage deployment order (already perfect)

**If you need to change:**
- Ask user first
- Explain why
- Test thoroughly
- Don't break safety systems

---

**LOCKED:** ✅ November 2, 2025  
**SAFETY:** ✅ VERIFIED AND WORKING  
**STATUS:** ✅ READY FOR PRODUCTION

This workflow will work forever if followed exactly.
New AI must use this exact procedure.
No shortcuts, no manual VPS changes, no skipping steps.

---

**YOU ARE HERE:** ✅ Localhost running v2.1.45  
**NEXT:** Push to GitHub → Deploy to staging → Test → Approve production

**Ready to proceed?** YES ✅
