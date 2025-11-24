# 🚀 QUICK START - AUTO-VERSION & NEW FEATURES

## ✅ AUTO-VERSION SYSTEM IS READY!

### One-Click Deploy with Auto-Version:

**Press `Ctrl+Shift+P` → Type: "Tasks: Run Task" → Choose:**

```
🚀 AUTO-VERSION: Build & Deploy (Quick)
```

**What happens:**
1. ✅ Version auto-increments (v2.2.1 → v2.2.2)
2. ✅ Builds frontend (npm run build)
3. ✅ Deploys to Docker container
4. ✅ Shows new version number
5. ✅ Takes ~30 seconds

**After deploy:**
- Press `Ctrl+Shift+R` in browser (hard refresh)
- Check version in bottom-left corner

---

## 📍 WHERE TO FIND NEW FEATURES:

### 1️⃣ EDITABLE INVOICE
**Path:** Shipments → Click "Release Shipment" → Scroll down

**You'll see:**
```
Invoice Preview - Editable
┌─────────────────────────────────────────┐
│ Description   Qty  Price   Amount  Tax │
│ [Edit me!]    [30] [100]  $3,000   [✓] │ <- Click to edit
│ [+ Add Manual Charge]                   │ <- Click to add
└─────────────────────────────────────────┘
```

### 2️⃣ CBM RATES (CUSTOM PRICING)
**Path:** Create Shipment → Enter dimensions → Check "Custom Pricing"

**You'll see:**
```
Dimensions
Length: [100] cm
Width:  [50]  cm
Height: [50]  cm

📦 Total CBM: 0.25 m³  <- Auto-calculated

☑ Custom Pricing
  CBM Rate: [40.00] $/m³/day
```

### 3️⃣ LIVE CHARGES PREVIEW
**Path:** Shipments → View Details → Look for "📊 Current Charges"

**You'll see:**
```
📊 Current Charges
Storage:    $3,000.00
Release:    $200.00
────────────────────
Total Due:  $3,520.00

Auto-refreshes every 30 seconds
```

### 4️⃣ MANUAL CHARGES
**Path:** Release Shipment → Invoice section → Click "+ Add Manual Charge"

**You'll see:**
- New blank line in invoice
- Type description, quantity, price
- Auto-calculates amount
- Updates totals instantly

---

## 🔧 AVAILABLE TASKS (Ctrl+Shift+P → Tasks: Run Task)

### Auto-Version Tasks:
- 🚀 **AUTO-VERSION: Build & Deploy (Quick)** ← Use this most
- 🔄 **AUTO-VERSION: Rebuild Docker (Full)** ← If quick doesn't work
- 🔢 **AUTO-VERSION: Increment Version Number** ← Version only

### Localhost Tasks:
- 🔄 **LOCALHOST REBUILD: Fresh Docker Build** ← Complete rebuild
- ⚡ **QUICK: Rebuild Localhost After Changes** ← Fast rebuild
- 🧪 **LOCALHOST TEST: Check All APIs** ← Test backend

---

## ⚠️ TROUBLESHOOTING

### "I don't see new features"
1. Run: `🚀 AUTO-VERSION: Build & Deploy (Quick)`
2. Hard refresh: `Ctrl+Shift+R`
3. Check version: Should be v2.2.1 or higher

### "Version didn't change"
1. Check: `frontend/src/config/version.ts`
2. Run: `.vscode\auto-version.ps1` manually
3. Rebuild: `🚀 AUTO-VERSION: Build & Deploy (Quick)`

### "Docker not updating"
1. Run: `🔄 AUTO-VERSION: Rebuild Docker (Full)`
2. Wait 2 minutes for complete rebuild
3. Hard refresh browser

---

## 📚 FOR FUTURE AI SESSIONS:

**Auto-version is configured in:**
- `.vscode/auto-version.ps1` - PowerShell script
- `.vscode/tasks.json` - VS Code tasks

**To deploy with new version:**
```powershell
# Option 1: Use VS Code task (recommended)
Ctrl+Shift+P → Tasks: Run Task → 🚀 AUTO-VERSION: Build & Deploy (Quick)

# Option 2: Manual command
.vscode\auto-version.ps1; cd frontend; npm run build; cd ..; docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/; docker exec wms-frontend nginx -s reload
```

**Version will auto-increment:**
- v2.2.1 → v2.2.2 → v2.2.3 → etc.

---

**Current Version:** v2.2.1  
**Last Updated:** December 2024  
**Auto-Version:** ✅ Enabled
