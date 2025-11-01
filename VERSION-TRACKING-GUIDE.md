# 🚀 Automatic Version Tracking System - COMPLETE

> Ab tum **VERSION BADGE** dekh sakte ho every deployment mein! Auto-updates automatically!

---

## 📍 What You'll See

### **In Application UI**
- **Bottom-Right Corner**: Version badge appears automatically
- **Format**: `v2.1.0 • 🟡 Staging` (or 🟢 Production, 🔵 Local Dev)
- **Hover/Click**: Shows deployment details

### **In Browser Console**
```
🚀 WMS Version: v2.1.0
Environment: staging
Commit: 306a1a2b6
```

### **In API Response**
```bash
curl http://staging.qgocargo.cloud:8080/api/health

{
  "status": "ok",
  "version": "v2.1.0",
  "versionInfo": {
    "version": "v2.1.0",
    "environment": "staging",
    "stage": "staging",
    "buildDate": "2025-11-01T10:30:00.000Z",
    "commitHash": "306a1a2b6"
  }
}
```

---

## 🎯 How It Works (Three-Stage Auto-Update)

### **Stage 1️⃣: LOCAL**
```
You make changes → git push
↓
GitHub sees push to stable/prisma-mysql-production
```

### **Stage 2️⃣: STAGING (Auto ⚡)**
```
GitHub Actions IMMEDIATELY starts:

1. 🔨 Build Step
   - Compile frontend
   - Build backend code
   
2. 📝 Version Update Step (NEW!)
   - Read current version: v2.0.9
   - Increment PATCH: v2.0.9 → v2.1.0
   - Update all version files
   - Update VERSION.md with history
   
3. 📦 Deploy Step
   - Send to Staging VPS
   - Run migrations
   - Deploy containers
   
4. ✅ Result
   - Staging running v2.1.0
   - VERSION.md shows v2.1.0
   - UI shows version badge
```

### **Stage 3️⃣: PRODUCTION (Manual 🔒)**
```
You manually trigger in GitHub Actions:

1. Same build/deploy process
2. Version increments MINOR: v2.1.0 → v2.2.0
3. Production updated to v2.2.0

Result: Production running v2.2.0
```

---

## 🔢 Version Number Rules

**Format**: `vX.Y.Z`
- **X** = Major (breaking changes - manual update only)
- **Y** = Minor (new features - increments on production)
- **Z** = Patch (bug fixes - increments on staging)

### **Example Timeline**
```
v2.0.0  →  (Staging Deploy)  →  v2.0.1
v2.0.1  →  (Staging Deploy)  →  v2.0.2
v2.0.2  →  (Production Deploy) →  v2.1.0
v2.1.0  →  (Staging Deploy)  →  v2.1.1
v2.1.1  →  (Staging Deploy)  →  v2.1.2
v2.1.2  →  (Production Deploy) →  v2.2.0
```

---

## 📝 Files Updated by Automation

### **Auto-Updated by GitHub Actions:**
1. ✅ `VERSION.md` - Shows current version + history
2. ✅ `frontend/src/config/version.ts` - Frontend version
3. ✅ `backend/src/config/version.ts` - Backend version
4. ✅ `frontend/index.html` - Meta tag with version
5. ✅ `frontend/dist/index.html` - In built output

### **These files update AUTOMATICALLY when you:**
- Push to GitHub → Staging auto-increments PATCH
- Manually trigger production → Production auto-increments MINOR

---

## 🧪 Testing (Try It!)

### **1️⃣ Make a small code change**
```powershell
# Edit any file
echo "# Test" >> README.md

# Commit and push
git add -A
git commit -m "test: test version auto-increment"
git push origin stable/prisma-mysql-production
```

### **2️⃣ Watch GitHub Actions**
- Go to: https://github.com/Akifbade/wms/actions
- See "Three-Stage Deployment Pipeline" running
- Watch the "Update Version Numbers" step
- See version increment in logs

### **3️⃣ Check Results (2-3 minutes later)**
```powershell
# Check VERSION.md on GitHub
# Should show new version like v2.1.0

# Check deployed staging
curl -s http://staging.qgocargo.cloud:8080/api/version

# Should show new version in response
```

### **4️⃣ Open UI**
```
http://staging.qgocargo.cloud:8080
↓
Bottom-right corner
↓
See version badge: "v2.1.0 • 🟡 Staging"
```

---

## 📊 Deployment Visual

```
┌─────────────────────────────────────────────────────────┐
│ Your Laptop (Local)                                     │
│ ─────────────────────────────────────────────────────── │
│ • Edit code in VSCode                                   │
│ • git push origin stable/prisma-mysql-production       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ GitHub Actions CI/CD   │
        │ ─────────────────────  │
        │ 🔨 Build Stage        │
        │ 📝 Update Version*    │ ← NEW!
        │ 📦 Deploy Stage       │
        │ ✅ Test Stage         │
        └────────┬───────┬──────┘
                 │       │
         ┌───────▼─┐  ┌─▼────────┐
         │ Staging │  │ Production
         │ VPS     │  │ VPS
         │ v2.1.0  │  │ v2.0.9
         └─────────┘  └──────────┘
```

---

## 🎯 Key Differences: Before vs After

### **BEFORE (Manual Versioning)**
- ❌ Version numbers not tracked
- ❌ No idea what version is deployed
- ❌ Manual updates by developer
- ❌ Easy to forget version bumping
- ❌ No deployment history

### **AFTER (Automatic Versioning)** ✨
- ✅ Version auto-increments on every deploy
- ✅ UI shows current version always
- ✅ API responses include version
- ✅ VERSION.md has full history
- ✅ No manual updating needed!

---

## 🚨 Troubleshooting

### **"I don't see version badge"**
- Refresh browser (hard refresh: Ctrl+Shift+R)
- Check if page loaded correctly
- Check browser console for errors

### **"Version not updating"**
- Wait 5-10 minutes (sometimes GitHub Actions slow)
- Check GitHub Actions workflow status
- Check if push was to correct branch

### **"Wrong version showing"**
- Clear browser cache
- Check VERSION.md on GitHub (source of truth)
- Re-deploy staging manually

---

## 📱 Mobile / API Checks

### **Check Version from Terminal**
```powershell
# Staging
curl -s http://staging.qgocargo.cloud:8080/api/version | ConvertFrom-Json

# Production
curl -s https://qgocargo.cloud/api/version | ConvertFrom-Json
```

### **Check VERSION.md**
- Local: `cat VERSION.md | grep "Current Version"`
- GitHub: View raw file on GitHub repo

---

## 💡 What This Solves

✅ **Know exactly what version is deployed**
✅ **Track deployment history automatically**
✅ **No manual version bumping**
✅ **Easy debugging** ("This bug is in v2.0.9 but fixed in v2.1.0")
✅ **Users see they have latest version**
✅ **Staging/Production versions always synced**

---

## 🔗 Related Files

- `VERSION.md` - Central version tracker (READ THIS for current version!)
- `frontend/src/config/version.ts` - Frontend config
- `backend/src/config/version.ts` - Backend config
- `frontend/src/components/VersionBadge.tsx` - UI component
- `scripts/update-version.sh` - Auto-increment script
- `.github/workflows/three-stage-deployment.yml` - GitHub Actions workflow

---

## 📌 Remember

**Whenever you push to GitHub:**
1. ✅ Build automatically
2. ✅ Version auto-increments (PATCH for staging)
3. ✅ Deploys to staging
4. ✅ VERSION.md updates automatically
5. ✅ UI shows new version

**No manual work needed!** 🎉

---

**Status**: ✅ COMPLETE and DEPLOYED
**Auto-Update**: ✅ ENABLED
**Current Version**: v2.1.0
**Last Updated**: Nov 1, 2025
