# 🚀 AUTOMATED WORKFLOW: LOCAL → STAGING → PRODUCTION

**NO MORE MANUAL VPS WORK!** ✅

All deployment automation is built into VSCode and PowerShell scripts.

---

## 🎯 HOW TO USE (Quick Start)

### Option 1: VSCode Tasks (Easiest)

1. **Open VSCode Command Palette:** `Ctrl+Shift+P`
2. **Type:** `Tasks: Run Task`
3. **Select:** `⚡ QUICK WORKFLOW: Local → Staging → Production`
4. **Follow the prompts!**

The workflow will automatically:
- ✅ Build frontend locally
- ✅ Commit to git
- ✅ Push to GitHub
- ✅ Wait for staging deployment (2-5 min)
- ✅ Test staging health
- ✅ Guide you to approve production

### Option 2: PowerShell Script

```powershell
.\workflow.ps1
```

Same thing, but in a standalone script. Run from project root.

---

## 📋 AVAILABLE VSCODE TASKS

### Development Tasks
- **🧪 TEST LOCAL - Backend** - Start backend dev server (`npm run dev`)
- **🧪 TEST LOCAL - Frontend** - Start frontend dev server
- **✅ BUILD LOCAL - Frontend** - Build frontend for deployment
- **✅ BUILD LOCAL - Backend Check** - Verify backend TypeScript compiles

### Workflow Tasks (Use These!)
- **✅ WORKFLOW STEP 1: Build & Test Locally** - Builds and verifies no errors
- **📝 WORKFLOW STEP 2: Commit Changes Locally** - Commits changes to git
- **🚀 WORKFLOW STEP 3: Push to GitHub** - Pushes code (triggers staging)
- **🧪 WORKFLOW STEP 4: Test on Staging** - Waits for deployment, opens staging
- **🟢 WORKFLOW STEP 5: Approve Production Deployment** - Opens GitHub for approval
- **⚡ QUICK WORKFLOW: Local → Staging → Production** - Run ALL steps

### Safety/Verification Tasks
- **🔒 SAFETY: Verify Staging Before Production** - Health check on staging
- **🔒 SAFETY: Verify Production Health** - Health check on production

---

## 🔄 COMPLETE WORKFLOW STEPS

### Step 1️⃣: Make Code Changes Locally
```
Edit files in VSCode (frontend, backend, whatever)
Save your changes
```

### Step 2️⃣: Build & Test Locally
```
Task: ✅ BUILD LOCAL - Frontend
Verifies frontend builds without errors
If build fails → Fix it before continuing
```

### Step 3️⃣: Commit Locally
```
Task: 📝 WORKFLOW STEP 2: Commit Changes Locally
- Type your commit message
- Code is committed but NOT pushed yet
```

### Step 4️⃣: Push to GitHub
```
Task: 🚀 WORKFLOW STEP 3: Push to GitHub
- Code pushed to GitHub
- GitHub Actions automatically starts
- Deploys to Staging (2-5 minutes)
```

### Step 5️⃣: Test on Staging
```
Task: 🧪 WORKFLOW STEP 4: Test on Staging
- Wait for GitHub Actions deployment
- Staging URL: http://148.230.107.155:8080
- Test all features:
  ✓ Frontend loads
  ✓ API responds
  ✓ QR codes work
  ✓ Photo uploads work
  ✓ No console errors
```

### Step 6️⃣: Approve Production
```
Task: 🟢 WORKFLOW STEP 5: Approve Production Deployment
- Go to GitHub Actions
- Select "Three-Stage Deployment" workflow
- Click "Run workflow"
- Select environment: production
- Click "Run workflow"
- GitHub asks for approval → Click "Approve"
- Production deploys automatically
```

---

## 🛡️ SAFETY FEATURES (Automatic)

### ✅ Local Build Validation
- Frontend MUST build successfully before commit
- If build fails → Stop and fix errors
- Never commit broken code

### ✅ Git Commit Required
- Must commit code locally before push
- Push only sends committed code
- Easy to see what's being deployed

### ✅ GitHub Actions Testing
- Runs full test suite on GitHub
- Deploys to staging FIRST
- Production only if staging succeeds

### ✅ Staging Health Checks
- After staging deployment, health checks run
- Verifies frontend responds (200 OK)
- Verifies backend API responds (200 OK)
- If checks fail → Auto-rollback

### ✅ Pre-Deployment Backups
- Automatic backup created BEFORE any change
- Frontend backup
- Backend backup
- Database backup (production)
- Stored for instant recovery

### ✅ Automatic Rollback
- If ANY step fails → Auto-rollback triggered
- Previous version restored from backup
- Services restarted
- No manual recovery needed

### ✅ Manual Production Approval
- Production NEVER updates automatically
- Requires manual GitHub approval
- You decide when to go live
- 2 people can review before approval

---

## ⚠️ WHAT GETS DEPLOYED

### To Staging (Automatic on Push)
```
frontend/dist/   → wms-staging-frontend:80
backend/src/     → wms-staging-backend:5001
prisma/          → wms-staging-db:3306 (migrations tested)
```

### To Production (Manual Approval)
```
staging containers → production containers
(Everything that works on staging gets promoted)
```

---

## 🔍 MONITORING DEPLOYMENTS

### Watch GitHub Actions
```
https://github.com/Akifbade/wms/actions
```

### Test Staging
```
http://148.230.107.155:8080
```

### Test Production
```
https://qgocargo.cloud
```

### SSH Check (Advanced)
```bash
ssh -i ~/.ssh/github_actions_wms root@148.230.107.155
docker ps  # See all containers
docker logs wms-staging-backend --tail 50  # See logs
```

---

## 🚨 TROUBLESHOOTING

### Build Fails Locally
```
✅ SOLUTION: Fix TypeScript errors
npm run build (in frontend directory)
Fix errors, then retry
```

### Staging Deployment Takes Long
```
✅ SOLUTION: Wait 3-5 minutes
GitHub Actions needs time to build and deploy
Check progress: https://github.com/Akifbade/wms/actions
```

### Staging Health Check Fails
```
✅ SOLUTION: Check logs
docker logs wms-staging-backend --tail 50
Usually a database connection issue
Wait a bit and retry
```

### Need to Rollback Production
```
✅ SOLUTION: Automatic rollback already happened OR:
ssh root@148.230.107.155
BACKUP="/root/NEW START/backups/production-TIMESTAMP"
docker cp "$BACKUP/backend/." wms-backend:/app/
docker restart wms-backend
```

---

## 📊 DEPLOYMENT STATUS

### Current Versions
| Component | Staging | Production |
|-----------|---------|-----------|
| Frontend | v2.1.43 | v2.1.0 |
| Backend | v2.1.43 | v2.1.0 |
| QR Format | SHIPMENT_XXX | SHIPMENT_XXX |

### Container Status
```
Staging:
✅ wms-staging-frontend  (port 8080)
✅ wms-staging-backend   (port 5001)
✅ wms-staging-db        (port 3308)

Production:
✅ wms-frontend          (port 80/443)
✅ wms-backend           (port 5000)
✅ wms-database          (port 3307)
```

---

## 🎓 TRAINING FOR NEW DEVELOPERS

### First Time Developers
1. Clone the repository
2. Read this file
3. Run: `.\workflow.ps1`
4. Follow the prompts
5. Done!

### Experienced Developers
1. Edit code locally
2. Run: `Ctrl+Shift+P` → "Tasks: Run Task" → Select workflow
3. Done!

### Advanced
- Check `.vscode/tasks.json` for custom tasks
- Edit `workflow.ps1` to customize workflow
- Check `.github/workflows/three-stage-deployment.yml` for CI/CD config

---

## 🔐 SAFETY CHECKLIST BEFORE PRODUCTION

Before approving production deployment:

- [ ] Staging frontend loads successfully
- [ ] Can login to staging
- [ ] QR codes generate correctly
- [ ] Photo uploads work
- [ ] Shipment creation works
- [ ] Rack assignment works
- [ ] No console errors in browser
- [ ] Database queries respond normally
- [ ] All API endpoints work

If any of these fail → **DO NOT PROMOTE TO PRODUCTION**

---

## 📞 QUICK REFERENCE

### One-Command Deployment
```powershell
.\workflow.ps1
```

### Check Staging Health
```powershell
# VSCode Task: 🔒 SAFETY: Verify Staging Before Production
```

### Check Production Health
```powershell
# VSCode Task: 🔒 SAFETY: Verify Production Health
```

### Emergency Rollback (Production)
```bash
ssh root@148.230.107.155
BACKUP="/root/NEW START/backups/production-LATEST"
docker cp "$BACKUP/database/warehouse_wms.sql" wms-database:/tmp/
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms < /tmp/warehouse_wms.sql
docker restart wms-frontend wms-backend
```

### View Backups
```bash
ssh root@148.230.107.155
ls -la /root/NEW\ START/backups/
```

---

## ✨ KEY BENEFITS

✅ **No Manual SSH Work** - Everything is automated  
✅ **Safe Deployments** - Multiple safety checks prevent errors  
✅ **Fast Feedback** - Know in 2-5 minutes if staging works  
✅ **Easy Rollback** - Automatic backup and restore  
✅ **Proper Workflow** - Local → Staging → Production (always)  
✅ **New AI Friendly** - Automation rules prevent mistakes  
✅ **Scalable** - Add new tasks easily in `.vscode/tasks.json`

---

**Status:** ✅ ALL SYSTEMS AUTOMATED  
**Last Updated:** November 2, 2025  
**Version:** 2.1.43

---

## Next Steps

1. **Right Now:** Open VSCode Terminal
2. **Run:** `.\workflow.ps1`
3. **Follow:** The prompts
4. **Deploy:** Your changes to production!

---

**Happy Deploying! 🚀**
