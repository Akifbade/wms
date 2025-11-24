# 🔧 Debugging Guide - View Details & Pallet QR Issues

## Version: v2.1.166 (Latest)

---

## ✅ FIXED: Photos Not Showing
**Status:** RESOLVED  
**Fix:** Corrected image paths from `/api/uploads` to `/uploads`  
**Test:** Photos should now display in shipment cards ✅

---

## 🔍 Issue 1: View Details Crashes to Blank Page

### What Was Fixed
- Added null check for `shipment.referenceId` in modal header
- Modal now safely handles loading states before data arrives

### How to Test
1. Open http://localhost in browser
2. Press **F12** to open Developer Console
3. Go to Shipments page
4. Click **"View Details"** button on any shipment
5. **WATCH THE CONSOLE** for errors

### Expected Behavior
- Modal should open with loading spinner
- After 1-2 seconds, shipment details should appear
- Should show: company info, box distribution, photos, custom fields

### If Still Crashing
**Copy this information:**
1. Any **RED error messages** in console
2. The exact text: `Uncaught Error:` or `TypeError:` messages
3. Screenshot of what you see (blank page, error page, etc.)

### Common Errors to Look For
```javascript
// Example error patterns:
TypeError: Cannot read property 'referenceId' of null
TypeError: Cannot read property 'companyProfile' of undefined
Failed to load shipment details
Network request failed
401 Unauthorized
```

---

## 🔍 Issue 2: Pallet QR Code Not Working

### What the Scanner Expects
**QR Code Format:** `PALLET_<shipmentId>_<palletNumber>`

**Examples:**
```
PALLET_cm3hd8fq10001abcdefgh_1  ✅ VALID
PALLET_cm3hd8fq10001abcdefgh_2  ✅ VALID
PALLET_ABC123_1                 ❌ INVALID (shipment ID too short)
PALLET-ABC-1                    ❌ INVALID (uses dashes, not underscores)
```

### How the Scanner Works
```typescript
1. Scanner reads: PALLET_cm3hd8fq10001abcdefgh_1
2. Splits by underscore: ['PALLET', 'cm3hd8fq10001abcdefgh', '1']
3. Extracts shipment ID: parts[1] = 'cm3hd8fq10001abcdefgh'
4. Tries direct API call: GET /api/shipments/cm3hd8fq10001abcdefgh
5. If that fails, searches: GET /api/shipments?search=cm3hd8fq10001abcdefgh
6. Returns shipment if found
```

### Step-by-Step Debug Process

#### Step 1: Generate Pallet QR
1. Go to Shipments page
2. Click **"QR Codes"** button on a shipment
3. In the modal, look for **"Pallet QR Codes"** section
4. **Write down the QR code text** (e.g., `PALLET_cm3abc123_1`)

#### Step 2: Test in Scanner
1. Press **F12** to open Console
2. Go to Scanner page
3. Select **"Shipment/Pallet"** mode (if available)
4. Scan the pallet QR code

#### Step 3: Check Console Output
**Look for these messages:**
```javascript
// SUCCESS:
Scanned code: PALLET_cm3abc123_1
Shipment found: {...}

// FAILURE (shipment not found):
Direct shipment lookup failed, trying search...
No shipment found matching: PALLET_cm3abc123_1

// FAILURE (API error):
Failed to fetch
401 Unauthorized
Network request failed
```

#### Step 4: Verify Shipment Exists
**Copy the shipment ID from the QR code** (the part between the underscores)

Example: `PALLET_cm3hd8fq10001_1` → shipment ID is `cm3hd8fq10001`

Then test directly in browser:
```
http://localhost/api/shipments/cm3hd8fq10001
```

**Expected:** Should show JSON with shipment data  
**If 404:** Shipment doesn't exist in database  
**If 401:** Authentication problem

---

## 🧪 Comparison Test: Loose Box vs Pallet QR

### Why Loose Box QR Works
Loose box QR format: `SHIPMENT_REF123-BOX001`

Scanner looks for `-BOX` in the code and extracts reference ID.

### Why Pallet QR Might Not Work

| Issue | Symptom | Fix |
|-------|---------|-----|
| Wrong format | QR doesn't start with `PALLET_` | Regenerate QR from Box QR modal |
| Missing underscore | Uses dashes instead: `PALLET-ID-1` | Regenerate with correct format |
| Shipment deleted | API returns 404 | Create new shipment |
| Wrong shipment ID | ID doesn't match database | Check database for correct IDs |
| Auth token expired | API returns 401 | Logout and login again |

---

## 📋 Information Needed to Debug

### For View Details Issue
```
1. Console error message (exact text):
   [PASTE ERROR HERE]

2. Screenshot of blank page:
   [ATTACH SCREENSHOT]

3. Does the modal open at all? (Yes/No)
   [ANSWER]

4. Can you see loading spinner? (Yes/No)
   [ANSWER]
```

### For Pallet QR Issue
```
1. Exact QR code text:
   [PASTE QR CODE, e.g., PALLET_cm3abc_1]

2. Console error when scanning:
   [PASTE ERROR HERE]

3. Does shipment exist when you open this URL?
   http://localhost/api/shipments/[SHIPMENT_ID]
   (Yes/No, or paste the response)
   [ANSWER]

4. Loose box QR code for same shipment:
   [PASTE BOX QR, e.g., SHIPMENT_REF123-BOX001]

5. Does the box QR work? (Yes/No)
   [ANSWER]
```

---

## 🔧 Quick Fixes to Try

### Fix 1: Clear Browser Cache Completely
```powershell
# In browser:
1. Press Ctrl+Shift+Delete
2. Select "All time"
3. Check: Cookies, Cache, Site data
4. Click "Clear data"
5. Close ALL browser windows
6. Reopen http://localhost
```

### Fix 2: Check Authentication
```powershell
# In browser console (F12):
localStorage.getItem('authToken')

# Should show a long token string
# If null or undefined, logout and login again
```

### Fix 3: Verify Frontend Version
```powershell
# In browser console:
fetch('/version.json').then(r => r.json()).then(console.log)

# Should show: {"version": "v2.1.166"}
```

### Fix 4: Check Backend Health
```powershell
# In PowerShell:
Invoke-WebRequest -Uri "http://localhost:5000/api/health"

# Should return 200 OK with version info
```

---

## 🚀 If Both Issues Fixed

Once you confirm both work on localhost:

### Deploy to Staging/Production
```powershell
# 1. Push to GitHub
git push origin stable/prisma-mysql-production

# 2. GitHub Actions auto-deploys to staging
# Wait 3-5 minutes

# 3. Test on staging
# http://148.230.107.155:8080

# 4. If good, approve production deployment
# Via GitHub Actions UI
```

---

## 📝 Current Status

| Issue | Code Fixed | Deployed | User Tested | Status |
|-------|-----------|----------|-------------|--------|
| Photos not showing | ✅ | ✅ | ⏳ | READY TO TEST |
| View Details crash | ✅ | ✅ | ⏳ | READY TO TEST |
| Pallet QR scanner | ✅ (code exists) | ✅ | ⏳ | NEED DEBUG INFO |

**Latest Build:** `index-C4xLWdfO.js`  
**Backend Version:** v2.1.147  
**Frontend Version:** v2.1.166 (being committed)

---

## 💡 Pro Tips

### Enable Verbose Console Logging
In Scanner.tsx, the code already has `console.log` statements. Make sure:
1. Console is open (F12)
2. "Preserve log" is checked (so logs don't clear on navigation)
3. Look for messages starting with "Scanned code:" or "Shipment found:"

### Test with Known Good Data
1. Create a FRESH shipment
2. Assign boxes to racks
3. Generate QR codes immediately
4. Test scanning within same browser session
5. This eliminates database sync issues

### Network Tab Debugging
1. Open F12 → Network tab
2. Scan QR code
3. Look for failed requests (red)
4. Click failed request to see error details
5. Share the URL and response

---

## 🆘 Emergency Rollback

If everything breaks:

```powershell
# Restore from production backup
cd C:\Users\USER\Videos\PRODUCTION_BACKUP_20251112_104107

# Follow BACKUP_MANIFEST.txt instructions
# This restores working v2.1.147 version
```

---

**Next Step:** Test View Details and Pallet QR, then provide console errors if still broken.
