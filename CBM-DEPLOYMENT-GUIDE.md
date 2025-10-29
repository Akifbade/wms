# 🚀 CBM (Cubic Meters) Charging System - Deployment Guide

## 📍 WHERE ARE THE CHANGES?

### **1. DATABASE - VPS Server (148.230.107.155)**
**Location:** `/root/NEW START/` (MySQL Container)

**New Columns Added to `shipments` table:**
```sql
ALTER TABLE shipments ADD COLUMN 
  length DOUBLE NULL,      -- centimeters
  width DOUBLE NULL,       -- centimeters
  height DOUBLE NULL,      -- centimeters
  cbm DOUBLE NULL,         -- cubic meters
  weight DOUBLE NULL;      -- kilograms
```

**Verify:** 
```bash
ssh root@148.230.107.155
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword123 warehouse_wms
DESC shipments;  # Look for: length, width, height, cbm, weight (all DOUBLE NULL)
```

---

### **2. BACKEND - TypeScript/Node.js**

**File:** `backend/src/routes/shipments.ts`
**Lines:** 400-410 (Create Route)

**What Changed:**
```typescript
// Dimension fields (nullable)
length: data.length !== undefined ? parseFloat(data.length) : undefined,
width: data.width !== undefined ? parseFloat(data.width) : undefined,
height: data.height !== undefined ? parseFloat(data.height) : undefined,
cbm: data.cbm !== undefined ? parseFloat(data.cbm) : undefined,
weight: data.weight !== undefined ? parseFloat(data.weight) : undefined,
```

**File:** `backend/prisma/schema.prisma`
**Lines:** 357-361 (Shipment Model)

**Schema Added:**
```prisma
// NEW: Dimension & CBM fields for volume-based charging
length            Float?    // Length in centimeters
width             Float?    // Width in centimeters
height            Float?    // Height in centimeters
cbm               Float?    // Cubic meters (m³) - auto-calculated: (L×W×H)/1000000
weight            Float?    // Weight in kilograms
```

**Deployed To:** VPS Container `wms-backend` (port 5000)

---

### **3. FRONTEND - React/TypeScript**

**File:** `frontend/src/components/WHMShipmentModal.tsx`
**Lines:** 787-847

**New UI Section Added:**
```tsx
{/* DIMENSIONS & CBM SECTION */}
<div className="md:col-span-3">
  <div className="bg-orange-50 border-2 border-orange-300 p-4 rounded-lg">
    <h4 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
      📏 Shipment Size & Volume
    </h4>
    {/* 5 Input fields:
        - Length (cm)
        - Width (cm)
        - Height (cm)
        - Weight (kg)
        - CBM (m³) - Read-only, auto-calculates
    */}
```

**Auto-Calculation Logic in `handleChange()`:**
```typescript
if (name === 'length' || name === 'width' || name === 'height') {
  const length = getSafeNumber(updated.length, 0);
  const width = getSafeNumber(updated.width, 0);
  const height = getSafeNumber(updated.height, 0);
  
  // CBM = (Length × Width × Height) / 1,000,000 (input is cm)
  const cbm = length > 0 && width > 0 && height > 0 
    ? (length * width * height) / 1000000
    : 0;

  return {
    ...updated,
    cbm: parseFloat(cbm.toFixed(4)), // Round to 4 decimals
  };
}
```

**Deployed To:** Nginx Container (port 80/443)

---

## 🌐 LIVE LINKS

### **Staging Server**
- **Main URL:** https://qgocargo.cloud
- **Shipments Page:** https://qgocargo.cloud/shipments
- **Backend API:** http://148.230.107.155:5000/api/shipments

### **Test Credentials**
```
Email: admin@demo.com
Password: demo123
Role: ADMIN
```

---

## ✅ HOW TO TEST

### **Step 1: Go to Shipments Page**
```
https://qgocargo.cloud/shipments
```

### **Step 2: Click "Add Shipment" Button**
Fill in form:
- **Shipment Name:** `Test CBM Intake`
- **Reference ID:** `TEST-CBM-001`
- **Pallet Count:** `1`
- **Boxes Per Pallet:** `10`
- **📏 Shipment Size:**
  - **Length:** `100` cm
  - **Width:** `50` cm
  - **Height:** `50` cm
  - **Weight:** `100` kg (optional)

### **Step 3: Watch CBM Auto-Calculate**
After entering dimensions, the **CBM field** should display:
```
0.2500 m³
```

**Formula:** (100 × 50 × 50) ÷ 1,000,000 = 0.25 m³

### **Step 4: Click "Create Shipment"**
Shipment is saved with all dimensions in database.

### **Step 5: Verify in Database**
```bash
ssh root@148.230.107.155
mysql -h 127.0.0.1 -P 3307 -u root -prootpassword123 warehouse_wms
SELECT id, name, length, width, height, cbm, weight FROM shipments WHERE name LIKE 'Test%';
```

**Expected Output:**
```
id: cmhbqqvXXXXXXXX
name: Test CBM Intake
length: 100
width: 50
height: 50
cbm: 0.25
weight: 100
```

---

## 📊 BACKEND API ENDPOINTS

### **Create Shipment with Dimensions**
```bash
POST /api/shipments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Test Shipment",
  "referenceId": "TEST-001",
  "originalBoxCount": 10,
  "palletCount": 1,
  "boxesPerPallet": 10,
  "clientName": "Test Client",
  "type": "COMMERCIAL",
  "arrivalDate": "2025-10-29",
  "companyId": "cb2e1107-b3da-11f0-ba16-aa8817dd87c5",
  
  // NEW: Dimension fields
  "length": 100,        // centimeters
  "width": 50,          // centimeters
  "height": 50,         // centimeters
  "cbm": 0.25,          // cubic meters (auto-calculated on frontend)
  "weight": 100         // kilograms
}
```

### **Get Shipment with Dimensions**
```bash
GET /api/shipments/:id
Authorization: Bearer <token>

Response includes:
{
  "shipment": {
    "id": "...",
    "name": "...",
    "length": 100,
    "width": 50,
    "height": 50,
    "cbm": 0.25,
    "weight": 100,
    // ... other fields
  }
}
```

---

## 🔄 DATA INTEGRITY

✅ **All existing shipments preserved** (3 shipments restored)
✅ **New columns are NULLABLE** (no data loss)
✅ **Backward compatible** (old shipments still work without dimensions)
✅ **Backup available** at `/root/NEW START/database-backups/backup-2025-10-29.sql`

---

## 🎯 NEXT STEPS

### **Phase 1: Testing** ✅ (Current)
- [x] Dimension fields visible in frontend form
- [x] CBM auto-calculates correctly
- [x] Shipments save dimensions to database
- [x] All existing data intact

### **Phase 2: Pricing Integration** (Pending)
- [ ] Update billing to use CBM for charge calculations
- [ ] Implement CBM-based pricing rules
- [ ] Create invoices with CBM charges
- [ ] Generate reports by CBM usage

### **Phase 3: Production Rollout** (Pending)
- [ ] Test with live customers
- [ ] Monitor performance
- [ ] Deploy to production VPS

---

## 🆘 TROUBLESHOOTING

### **CBM field not visible in form?**
1. Clear browser cache: Ctrl+Shift+Del
2. Refresh page: F5
3. Check: https://qgocargo.cloud/shipments (not localhost)

### **CBM not auto-calculating?**
1. Check browser console for errors: F12 → Console
2. Verify dimension values are entered correctly
3. All 3 fields (L, W, H) must have values > 0

### **Shipment not saving with dimensions?**
1. Check backend logs: `docker logs wms-backend`
2. Verify token is valid (if testing API)
3. Check database connection: `docker logs wms-database`

### **Data not visible in database?**
```bash
ssh root@148.230.107.155
docker exec wms-database mysql -u root -prootpassword123 warehouse_wms -e "SELECT * FROM shipments LIMIT 1\G"
```

---

## 📝 FILES MODIFIED

| File | Lines | Change | Status |
|------|-------|--------|--------|
| `backend/prisma/schema.prisma` | 357-361 | Added 5 CBM fields to Shipment model | ✅ Deployed |
| `backend/src/routes/shipments.ts` | 400-410 | Accept & persist dimension fields | ✅ Deployed |
| `backend/src/routes/shipments.ts` | 500-505 | Update route handles dimensions | ✅ Deployed |
| `frontend/src/components/WHMShipmentModal.tsx` | 55-80 | formData extended with CBM fields | ✅ Deployed |
| `frontend/src/components/WHMShipmentModal.tsx` | 325-355 | handleChange() auto-calculates CBM | ✅ Deployed |
| `frontend/src/components/WHMShipmentModal.tsx` | 787-847 | UI section for dimensions | ✅ Deployed |

---

## ✨ SUMMARY

Your WMS now supports **volume-based charging (CBM)** alongside traditional per-piece pricing:

- 📏 Users enter dimensions at shipment intake
- 🧮 CBM auto-calculates in real-time
- 💾 Values stored in database
- 📊 Ready for pricing calculations

**All data is safe, backups exist, and the system is ready for testing!**

