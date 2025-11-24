# 🚀 Auto-Commit & Auto-Deploy Setup

Is system mein **3 tareeqe** hain automatic commit aur deploy karne ke:

---

## Method 1: File Watcher (Recommended) 👀

File changes ko **automatically detect** karke commit & push karta hai.

### Start Kaise Karein:

```powershell
.\auto-commit-watcher.ps1
```

Ya **VS Code Task** se:
- Press `Ctrl+Shift+P`
- Type: "Run Task"
- Select: "👀 Start Auto-Commit Watcher"

### Kya Hota Hai:
1. ✅ `frontend/src/` folder ko monitor karta hai
2. ✅ File save hone ke **5 seconds baad** automatically:
   - `git add .`
   - `git commit -m "auto: Local changes at [timestamp]"`
   - `git push origin stable/prisma-mysql-production`
3. ✅ Push hone ke baad **GitHub Actions automatically staging pe deploy** kar dega
4. ✅ Test staging: http://148.230.107.155:8080

### Features:
- 🔥 Real-time file monitoring
- ⏱️ 5 second debounce (multiple saves ko ek commit mein)
- 🚫 Ignores: `node_modules`, `dist`, `.git`, `.vscode`
- ✅ Only watches: `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.scss`, `.json`

---

## Method 2: Quick Commit Script 🎯

Manually run karein jab aapne changes kiye hon.

### Run Kaise Karein:

```powershell
.\quick-commit.ps1
```

Ya **VS Code Task** se:
- Press `Ctrl+Shift+P`
- Type: "Run Task"
- Select: "🚀 Auto Commit & Push"

### Kya Hota Hai:
1. ✅ Check for changes
2. ✅ Automatically commit with timestamp
3. ✅ Push to current branch
4. ✅ GitHub Actions triggers staging deployment

---

## Method 3: Normal Git Commands (Manual) 📝

Traditional tareeqa:

```powershell
git add .
git commit -m "your message"
git push origin stable/prisma-mysql-production
```

---

## 🎯 Complete Workflow

### Automatic Pipeline:

```
Local Changes (Save File)
    ↓
Auto-Commit Watcher Detects (5s debounce)
    ↓
Automatic Commit & Push
    ↓
GitHub Actions Trigger (ON PUSH)
    ↓
Build Frontend (npm run build)
    ↓
Deploy to Staging (Auto) ← http://148.230.107.155:8080
    ↓
✋ MANUAL TEST (Aap test karein staging pe)
    ↓
✋ MANUAL APPROVAL (Good hai to production trigger karein)
    ↓
Deploy to Production ← http://qgocargo.cloud
```

---

## 📋 Configuration

### GitHub Actions Workflow

File: `.github/workflows/three-stage-deployment.yml`

**Triggers:**
- ✅ **Automatic**: Har `push` pe staging deploy
- ✅ **Manual**: Production deployment manual trigger

**Conditions:**
```yaml
on:
  push:
    branches:
      - stable/prisma-mysql-production
    paths:
      - 'frontend/**'
      - '.github/workflows/**'
```

---

## 🛠️ VS Code Tasks

Press `Ctrl+Shift+B` ya `Ctrl+Shift+P` > "Run Task":

1. **🚀 Auto Commit & Push** - One-time commit & push
2. **👀 Start Auto-Commit Watcher** - Background file watcher
3. **🏗️ Build Frontend** - Build production bundle
4. **🚢 Deploy to Local Container** - Build + Deploy locally

---

## 🎨 Testing Workflow

### 1. Start Auto-Watcher (Recommended):

```powershell
.\auto-commit-watcher.ps1
```

### 2. Make Changes:
- Edit any file in `frontend/src/`
- Save file (`Ctrl+S`)

### 3. Watch Console:
```
📝 Detected Changed : C:\...\Racks.tsx
⏳ Debounce complete. Processing changes...
🔍 Changes detected in git:
 M frontend/src/pages/Racks/Racks.tsx
📦 Adding changes...
💾 Committing: auto: Local changes at 2025-10-30 21:30:45
📤 Pushing to stable/prisma-mysql-production...
✅ Auto-commit and push complete!
🎯 GitHub Actions will now deploy to staging automatically
```

### 4. Check GitHub Actions:
- Go to: https://github.com/Akifbade/wms/actions
- Dekho "Three-Stage Deployment Pipeline" running hai

### 5. Test Staging:
- Open: http://148.230.107.155:8080
- Changes verify karein

### 6. Deploy to Production (Manual):
- GitHub Actions mein jao
- "Run workflow" click karein
- Select: "production"
- Confirm approval
- Production live: http://qgocargo.cloud

---

## 🚨 Important Notes

### File Watcher Limitations:
- ⚠️ **PowerShell window ko band mat karein** (watcher stop ho jayega)
- ⚠️ **Accidental changes** bhi commit ho jaayenge
- ⚠️ **5 second delay** hai debouncing ke liye

### Best Practices:
1. ✅ Pehle **local container mein test** karein
2. ✅ Phir **staging pe verify** karein
3. ✅ Last mein **production deploy** karein
4. ✅ Watcher ke saath kaam karte waqt **thoughtful edits** karein

### Rollback:
Agar kuch galat ho jaye:
```powershell
# Last commit undo (keep changes)
git reset HEAD~1

# Force push (careful!)
git push origin stable/prisma-mysql-production --force
```

---

## 📊 Monitoring

### Check Running Watcher:
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*powershell*"}
```

### Stop Watcher:
- Press `Ctrl+C` in watcher terminal

### View Git Log:
```powershell
git log --oneline -10
```

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| Start Auto-Watcher | `.\auto-commit-watcher.ps1` |
| Quick Commit | `.\quick-commit.ps1` |
| Build Local | `cd frontend; npm run build` |
| Deploy Local | `docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/` |
| Test Local | http://localhost |
| Test Staging | http://148.230.107.155:8080 |
| Production | http://qgocargo.cloud |

---

## 💡 Pro Tips

1. **Development Mode**: Normal `npm run dev` use karein testing ke liye
2. **Auto-Watcher**: Sirf jab production-ready changes ho tab start karein
3. **Quick Commit**: Daily development mein use karein
4. **Manual Git**: Fine-grained control ke liye

---

**Created:** 2025-10-30  
**Updated:** Auto-commit system with GitHub Actions integration
