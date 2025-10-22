# 🔧 Branding System - Local Development Fixes

## 🐛 Issues Found

### 1. Upload API Endpoint Mismatch ✅ FIXED
**Error:** `POST http://localhost:3000/api/upload 404 (Not Found)`

**Problem:** 
- BrandingSettings was calling `/api/upload`
- Backend route is at `/api/upload/logo`

**Fix Applied:**
- Changed `BrandingSettings.tsx` line 98:
  - ❌ `fetch('/api/upload')`  
  - ✅ `fetch('/api/upload/logo')`
- Changed FormData field name:
  - ❌ `formData.append('file', logoFile)`
  - ✅ `formData.append('logo', logoFile)`
- Changed response field:
  - ❌ `return data.url`
  - ✅ `return data.logoUrl`

### 2. Company API 500 Error ⚠️ NEEDS DATABASE UPDATE
**Error:** `PUT http://localhost:3000/api/company 500 (Internal Server Error)`

**Problem:**
- Schema added new fields (primaryColor, secondaryColor, accentColor, showCompanyName)
- Prisma client regenerated
- But local SQLite database doesn't have these columns yet

**Fix Applied:**
- Updated `company.ts` to accept and return branding fields
- Generated new Prisma client

**Still Needed:**
- Database migration to add columns (see below)

### 3. Uploads Directory Missing ✅ FIXED
**Created:** `backend/public/uploads/logos/` directory

---

## 🔨 Immediate Fix Required

### Option 1: Recreate Database (Easiest)
```powershell
cd "c:\Users\USER\Videos\NEW START\backend"

# Backup existing database (if you have important data)
Copy-Item prisma\dev.db prisma\dev.db.backup

# Delete old database
Remove-Item prisma\dev.db -Force

# Create new database with all fields
npx prisma migrate dev --name init

# Seed with test data
npx ts-node prisma/seed-permissions.ts
```

### Option 2: Add Columns Manually (If you have data to keep)
```powershell
cd "c:\Users\USER\Videos\NEW START\backend"

# If you have sqlite3 command:
Get-Content add-branding-fields.sql | sqlite3 prisma/dev.db

# OR manually via Prisma Studio:
npx prisma studio
# Then manually add columns in GUI (not recommended)
```

### Option 3: Use MySQL Locally (Match Production)
```powershell
# Install MySQL locally or use Docker
# Update .env:
DATABASE_URL="mysql://root:password@localhost:3306/wms_dev"

# Run migration:
npx prisma migrate dev --name add_branding_fields
```

---

## ✅ Files Modified

### Frontend
1. **BrandingSettings.tsx**
   - Line 95: Changed 'file' to 'logo' in FormData
   - Line 98: Changed '/api/upload' to '/api/upload/logo'
   - Line 107: Changed 'data.url' to 'data.logoUrl'

### Backend
2. **company.ts**
   - Added branding fields to GET route select
   - Added branding fields to PUT route (accept and save)
   - Lines 26-29: Added to GET select
   - Lines 43, 70-73, 83-86: Added to PUT

3. **Created:**
   - `add-branding-fields.sql` - SQL script to add columns
   - `quick-fix-branding-local.ps1` - Automated fix script
   - `public/uploads/logos/` - Upload directory

---

## 🧪 Testing After Fix

### Step 1: Verify Database Has Columns
```powershell
cd backend
npx prisma studio
# Check companies table has: primaryColor, secondaryColor, accentColor, showCompanyName
```

### Step 2: Restart Backend
```powershell
# In backend terminal:
# Press Ctrl+C to stop
npm run dev
```

### Step 3: Test in Browser
1. Open `http://localhost:3000`
2. Login
3. Go to Settings → Branding & Appearance
4. Try uploading logo - should work now (no 404 error)
5. Try saving colors - should work if database updated

### Step 4: Check Console
```
Browser Console (F12):
✅ No 404 errors
✅ No 500 errors
✅ Success message after save

Backend Terminal:
✅ "Logo uploaded successfully: {...}"
✅ No Prisma errors
✅ PUT /api/company returns 200
```

---

## 🚀 Recommended Fix Right Now

**Run this command:**
```powershell
cd "c:\Users\USER\Videos\NEW START\backend"

# Backup existing DB
if (Test-Path prisma\dev.db) { Copy-Item prisma\dev.db prisma\dev.db.backup }

# Recreate database
Remove-Item prisma\dev.db -Force
npx prisma migrate dev --name init

# Restart backend (press Ctrl+C first)
npm run dev
```

**Then in frontend:**
- Refresh browser (Ctrl+R)
- Login (you'll need to register again if database was recreated)
- Test branding settings

---

## 📝 Alternative: Deploy to VPS Instead

If local development is problematic, you can deploy directly to VPS where MySQL is properly configured:

```powershell
cd "c:\Users\USER\Videos\NEW START"
.\deploy-branding-system.ps1
```

Then test on VPS:
- URL: `https://72.60.215.188`
- Login: `admin@warehouse.com` / `admin123`
- Settings → Branding & Appearance

---

## 🔍 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend Code | ✅ Fixed | API endpoints corrected |
| Backend Code | ✅ Fixed | Branding fields added |
| Prisma Client | ✅ Generated | New fields available |
| Uploads Directory | ✅ Created | `/public/uploads/logos/` |
| Local Database | ❌ Missing Columns | Needs migration |
| VPS Database | ❌ Not Updated | Needs deployment |

---

## 🎯 Quick Decision

**If you want to test locally:**
```powershell
# Recreate database (lose existing data):
cd backend
Remove-Item prisma\dev.db -Force
npx prisma migrate dev --name init

# Restart backend
npm run dev
```

**If you want to test on VPS:**
```powershell
# Deploy everything:
cd "c:\Users\USER\Videos\NEW START"
.\deploy-branding-system.ps1
```

---

## 🆘 Still Getting Errors?

### Error: "primaryColor does not exist"
- Prisma client needs restart
- Solution: Stop backend (Ctrl+C), run `npm run dev` again

### Error: "404 Not Found on /api/upload"
- Frontend not updated
- Solution: Hard refresh browser (Ctrl+Shift+R)

### Error: "500 Internal Server Error on /api/company"
- Database missing columns
- Solution: Recreate database (see above)

### Error: "Failed to upload logo"
- Directory permissions or doesn't exist
- Solution: Check `backend/public/uploads/logos/` exists

---

**Recommended Action:**
Recreate local database to test, or deploy to VPS where MySQL is properly configured.

**Current Next Step:**
```powershell
cd "c:\Users\USER\Videos\NEW START\backend"
Remove-Item prisma\dev.db -Force
npx prisma migrate dev --name init
npm run dev
```

Then test in browser!
