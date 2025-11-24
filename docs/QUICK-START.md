# ⚡ QUICK START: DEPLOYMENT WORKFLOW

**Copy this. Follow it. That's it.**

---

## 🔄 THE WORKFLOW (3 Simple Steps)

### 1️⃣ TEST LOCALLY
```
Make changes → Save → Test on http://localhost
✓ Works? Continue to step 2
✗ Doesn't work? Fix and test again
```

### 2️⃣ PUSH TO GITHUB  
```
Ctrl+Shift+P → Run Task → "STEP 3: Push to GitHub"
OR: git push origin stable/prisma-mysql-production

✓ GitHub Actions starts automatically
✓ Deploys to staging (148.230.107.155:8080)
✓ Takes 2-5 minutes
```

### 3️⃣ TEST STAGING & APPROVE PRODUCTION
```
Wait 2-5 min → Open http://148.230.107.155:8080
✓ Test features
✓ All working? Approve production (see below)

To approve production:
  1. Go to https://github.com/Akifbade/wms/actions
  2. Click "Three-Stage Deployment"
  3. Click "Run workflow"
  4. Select: production
  5. Click "Run workflow"
  6. GitHub asks → Click "Approve"
  7. Wait 2-5 min → Production updated!
```

---

## ✅ THAT'S IT!

Everything else is automated. GitHub Actions handles deployment. Rollback is automatic if anything breaks.

---

## 🚀 VSCODE SHORTCUTS

**Quick workflow (runs all steps):**
```
Ctrl+Shift+P → Run Task → "⚡ QUICK WORKFLOW"
```

**Individual steps:**
```
Ctrl+Shift+P → Run Task → Pick one:
  • STEP 1: Build & Test Locally
  • STEP 2: Commit Changes Locally
  • STEP 3: Push to GitHub
  • STEP 4: Test on Staging
  • STEP 5: Approve Production
```

---

## ⚠️ DON'T DO THIS

❌ Don't manually SSH to VPS  
❌ Don't skip staging testing  
❌ Don't push to production without approval  
❌ Don't change GitHub Actions files  

---

## 🆘 IF SOMETHING BREAKS

✅ Automatic rollback already happened  
✅ Previous version restored  
✅ Database restored  

Just check GitHub Actions logs to see what failed, fix locally, and push again.

---

**Ready?** Run Task: `⚡ QUICK WORKFLOW: Local → Staging → Production`

Done! 🎉
