# 🚀 Deployment Version Tracker

> Auto-updated by GitHub Actions on every three-stage deployment

## Current Version: **v2.1.0**

| Stage | Version | Status | Last Deploy | Environment |
|-------|---------|--------|------------|-------------|
| 🔵 Local | v2.1.0 | Active | Nov 1, 2025 | Development |
| 🟡 Staging | v2.1.0 | Deployed | Nov 1, 2025 | staging.qgocargo.cloud |
| 🟢 Production | v2.0.9 | Deployed | Oct 31, 2025 | qgocargo.cloud |

---

## Deployment History

### v2.1.0 - Nov 1, 2025
- **Commit**: `2d371a90a` (docs: add comprehensive QR logo and camera scanner fixes documentation)
- **Author**: GitHub Actions (Auto-Deploy)
- **Changes**:
  - ✅ Fix QR logo display in print
  - ✅ Fix camera scanner HTTPS compatibility
  - ✅ Enhanced print CSS for image visibility
  - ✅ Image preloading before printing
  - ✅ Improved secure context detection
- **Stages**: Local → Staging ✅

### v2.0.9 - Oct 31, 2025
- **Commit**: `60d664626` (fix: improve QR logo display and camera scanner HTTPS support)
- **Author**: GitHub Actions (Auto-Deploy)
- **Changes**:
  - ✅ User management consolidation
  - ✅ Moving job soft delete with material history preservation
  - ✅ Material cascade delete protection
- **Stages**: Local → Staging → Production ✅

### v2.0.8 - Oct 30, 2025
- **Commit**: `d3bafc80f` (refactor: consolidate user management and fix moving job deletion)
- **Changes**:
  - ✅ Removed duplicate Role Management
  - ✅ Strict delete protection for shipments
- **Stages**: Local → Staging ✅

---

## Version Format: `vX.Y.Z`
- **X (Major)**: Major features / breaking changes
- **Y (Minor)**: New features / improvements
- **Z (Patch)**: Bug fixes / minor updates

### Auto-Increment Rules:
- **Patch (Z)**: Increments on every staging deploy (default)
- **Minor (Y)**: Increments on production deploy (manual trigger)
- **Major (X)**: Manual update only (breaking changes)

---

## How to Check Version

### 1️⃣ **In Header (HTML)**
```html
<!-- Shows version in page header -->
<div class="version-badge">v2.1.0</div>
```

### 2️⃣ **In Console (Browser)**
```javascript
console.log('WMS Version:', window.APP_VERSION); // Output: v2.1.0
```

### 3️⃣ **In API Response**
```bash
curl http://localhost:5001/api/health
# Returns: { version: "v2.1.0", environment: "staging" }
```

### 4️⃣ **Check This File**
See the VERSION in first line of this file

---

## Deployment Stages & Auto-Updates

### 🔵 **Local Development**
- Version updates: Manual (when you bump version)
- Trigger: `git push` to `stable/prisma-mysql-production`

### 🟡 **Staging Deployment** (Auto)
- Version updates: **Patch increment** (v2.0.9 → v2.1.0)
- Trigger: Push to GitHub
- Auto-increment: ✅ Enabled
- Time: 2-3 minutes after push

### 🟢 **Production Deployment** (Manual)
- Version updates: **Minor increment** (v2.1.0 → v2.2.0)
- Trigger: Manual GitHub Actions trigger
- Auto-increment: ✅ Enabled
- Safety: Manual approval required

---

## Files Updated by Auto-Deploy

### 🤖 GitHub Actions Updates These Files:
1. **VERSION.md** ← You are here (current version)
2. **frontend/src/config/version.ts** (injected at build)
3. **backend/src/config/version.ts** (auto-generated)
4. **frontend/index.html** (version in meta tag)

### How It Works:
```
GitHub Push → Actions Trigger
           ↓
      Build Stage
           ↓
  Extract Commit Hash
           ↓
  Extract Last 2 commits messages
           ↓
  Calculate new version (patch++)
           ↓
  Update VERSION.md
           ↓
  Update version files
           ↓
  Commit auto-updated files
           ↓
  Deploy to Staging
           ↓
  ✅ Version now shows v2.1.0
```

---

## Commands to Check Version

```powershell
# Local - Show current version
cat VERSION.md | grep "Current Version"

# Staging - Check deployed version
curl -s http://staging.qgocargo.cloud/api/health | ConvertFrom-Json | Select version

# Production - Check production version  
curl -s https://qgocargo.cloud/api/health | ConvertFrom-Json | Select version
```

---

## Testing Version Updates

### 1️⃣ **Make a code change locally**
```powershell
# Edit any file in frontend or backend
code frontend/src/pages/Home.tsx
```

### 2️⃣ **Commit and push**
```powershell
git add -A
git commit -m "test: minor UI improvement"
git push origin stable/prisma-mysql-production
```

### 3️⃣ **Watch GitHub Actions**
- Go to: https://github.com/Akifbade/wms/actions
- Watch "Three-Stage Deployment Pipeline"
- See version auto-increment in logs

### 4️⃣ **Check new version**
```powershell
# After 2-3 minutes
curl -s http://staging.qgocargo.cloud/api/health

# Should show new version like:
# { "version": "v2.1.0", "environment": "staging" }
```

---

## Benefits ✨

✅ **Always know what version is deployed**
✅ **Auto-updated on every commit**
✅ **No manual version bumping**
✅ **Track deployment history**
✅ **Easy debugging** ("This issue is in v2.0.8 but fixed in v2.1.0")
✅ **User can see they have latest version**

---

## Next Steps

1. ✅ Push code to GitHub
2. ⏳ Wait for GitHub Actions (2-3 min)
3. 🎯 Check staging.qgocargo.cloud
4. 📊 Version badge shows v2.1.0
5. 📝 VERSION.md auto-updated
6. ✨ Done!

---

**Last Updated**: Automatically by GitHub Actions  
**Update Frequency**: On every deployment  
**Manual Update**: Edit this file and VERSION will increment on next deploy
