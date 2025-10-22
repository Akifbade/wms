# 🧪 RELEASE VALIDATION - TESTING GUIDE

## ⚠️ IMPORTANT DISCOVERY

### Issue with Old Shipment:
```json
{
  "id": "cmgpcqacd003yv63nhhxfi1fw",
  "currentBoxCount": 25,
  "boxes": [],           // ❌ EMPTY!
  "totalBoxes": 0,       // ❌ No boxes
  "inStorageBoxes": 0    // ❌ Can't release
}
```

**Problem:** Old shipment created BEFORE box creation logic was added.

**Backend Error:** `"No boxes available to release"`

---

## ✅ SOLUTION: Create New Shipment

### Via Browser UI:
```
1. Go to http://localhost:3000
2. Click "📦 New Shipment Intake"
3. Fill required fields:
   - Client Name: "Test Release User"
   - Client Phone: "1234567890"
   - Client Email: "test@demo.com"
   - Pieces: 3
   - Estimated Value: 500
4. Click "Create Shipment"
5. New shipment will have boxes array populated!
```

### Expected Result:
```json
{
  "id": "<NEW_ID>",
  "originalBoxCount": 3,
  "currentBoxCount": 3,
  "boxes": [
    { "boxNumber": 1, "status": "IN_STORAGE" },
    { "boxNumber": 2, "status": "IN_STORAGE" },
    { "boxNumber": 3, "status": "IN_STORAGE" }
  ],
  "totalBoxes": 3,
  "inStorageBoxes": 3
}
```

---

## 🧪 TESTING RELEASE VALIDATION

### Step 1: Create Shipment
- Use browser UI (New Shipment Intake form)
- Fill all required fields
- Verify shipment created successfully

### Step 2: Open Release Modal
```
1. Go to Shipments page
2. Find your new shipment
3. Click "Release" button
4. Release modal opens
```

### Step 3: Verify UI Fields
```
✅ Should see:
- Release Type (Full/Partial)
- Quantity Type selector
- Collector ID Verification * (Required - red asterisk)
- Release Photos (Optional - no asterisk)
- Additional Charges
- Line Items Preview
```

### Step 4: Test Validation

#### Test A: Missing Collector ID
```
1. Leave "Collector ID" empty
2. Try to click "Generate Invoice & Release"
3. Button should be DISABLED (opacity 50%)
4. Cannot proceed
```

#### Test B: With Collector ID
```
1. Enter Collector ID: "ID12345"
2. Button becomes ENABLED
3. Click "Generate Invoice & Release"
4. Should succeed! ✅
```

#### Test C: Partial Release
```
1. Select "Partial Release"
2. Enter quantity: 2 (out of 3)
3. Enter Collector ID
4. Submit
5. Should release 2 boxes ✅
```

---

## 📊 VALIDATION CHECKS

### Frontend Validation (ReleaseShipmentModal.tsx)
```typescript
// Lines 217-225
if (settings?.requireIDVerification && !collectorID.trim()) {
  alert('Collector ID verification is required by company settings');
  return;
}

if (settings?.requireReleasePhotos && releasePhotos.length === 0) {
  alert('Release photos are required by company settings');
  return;
}
```

### Button Disable Logic
```typescript
// Lines 693-699
disabled={
  generating || 
  lineItems.length === 0 || 
  (settings?.requireIDVerification && !collectorID.trim()) ||
  (settings?.requireReleasePhotos && releasePhotos.length === 0)
}
```

### Backend Validation (shipments.ts)
```typescript
// Lines 442-447
if (settings.requireIDVerification && !collectorID) {
  return res.status(400).json({ 
    error: 'Collector ID verification is required by company settings' 
  });
}

if (settings.requireReleasePhotos && (!releasePhotos || releasePhotos.length === 0)) {
  return res.status(400).json({ 
    error: 'Release photos are required by company settings' 
  });
}
```

---

## 🎯 CURRENT SETTINGS

From `GET /api/shipment-settings`:
```json
{
  "requireIDVerification": true,      // ✅ Collector ID REQUIRED
  "requireReleasePhotos": false,      // ❌ Photos OPTIONAL
  "allowPartialRelease": true,        // ✅ Partial ALLOWED
  "partialReleaseMinBoxes": 1         // Min 1 box
}
```

---

## 🚀 QUICK TEST PROCEDURE

### 1. Create Fresh Shipment (2 min)
```
Browser → New Shipment Intake
Fill: Name, Phone, Email, Pieces=3, Value=500
Submit ✅
```

### 2. Test Release (3 min)
```
Shipments → Find shipment → Release button
Modal opens
Enter Collector ID: "TEST123"
Click "Generate Invoice & Release"
Verify success ✅
```

### 3. Verify Result (1 min)
```
Check shipment status = "RELEASED"
Check boxes status = "RELEASED"
Check invoice created
Check rack capacity freed
```

---

## 🐛 TROUBLESHOOTING

### Error: "No boxes available to release"
**Cause:** Using old shipment without boxes array
**Fix:** Create new shipment via UI

### Error: "Collector ID verification is required"
**Cause:** Frontend not sending collectorID
**Fix:** Already fixed! Just enter ID in field

### Error: "Internal server error" on create
**Cause:** Wrong field name (used `pieces` instead of `originalBoxCount`)
**Fix:** Use correct field names in API

### Button stays disabled
**Check:**
1. Collector ID filled? (required)
2. Line items calculated? (should auto-calculate)
3. Settings loaded? (check browser console)

---

## ✅ SUCCESS CRITERIA

### Frontend:
- ✅ Collector ID field shows with asterisk
- ✅ Button disabled until ID entered
- ✅ Validation alert if ID missing
- ✅ Settings respected

### Backend:
- ✅ Receives collectorID in request
- ✅ Validates based on settings
- ✅ Returns clear error messages
- ✅ Releases boxes successfully

### Database:
- ✅ Boxes updated to RELEASED status
- ✅ Rack capacity decreased
- ✅ Invoice created
- ✅ Shipment status updated

---

## 📝 TEST CHECKLIST

- [ ] Create new shipment via UI
- [ ] Verify shipment has boxes array
- [ ] Open release modal
- [ ] See Collector ID field
- [ ] Try submit without ID (should block)
- [ ] Enter Collector ID
- [ ] Submit successfully
- [ ] Verify boxes released
- [ ] Verify invoice created
- [ ] Test partial release
- [ ] Test with different settings

---

## 🎉 EXPECTED OUTCOME

**After successful release:**
```json
{
  "shipment": {
    "status": "RELEASED",
    "currentBoxCount": 0,
    "releasedAt": "2025-10-13T...",
    "totalBoxes": 3,
    "inStorageBoxes": 0,
    "releasedBoxes": 3
  },
  "boxes": [
    { "status": "RELEASED", "releasedAt": "..." },
    { "status": "RELEASED", "releasedAt": "..." },
    { "status": "RELEASED", "releasedAt": "..." }
  ]
}
```

---

**Browser testing recommended - terminal commands hanging!** 🚀
