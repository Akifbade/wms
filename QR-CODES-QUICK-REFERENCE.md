# 🎯 QR CODE QUICK REFERENCE

## What Changed - At A Glance

| Aspect | Before | After | Status |
|--------|--------|-------|--------|
| **Shipment QR** | `QR-SH-1234567890-P2B5T10` | `SHIPMENT_1704067200000-A5X9K2L7` | ✅ Simplified |
| **Box QR** | `QR-SH-...-BOX-1-OF-10-PAL-1` | `SHIPMENT_...-BOX001` | ✅ Cleaner |
| **Rack QR** | `QR-RACK-001` | `RACK_RACK-001` | ✅ Consistent |
| **Pallet QR** | `PALLET-cmhh8ka8s0001xtg...` | ❌ REMOVED | ✅ Gone |
| **Metadata** | In QR string | In database JSON | ✅ Cleaner |
| **UI Options** | "View Pallet QR" / "View Box QR" | "View Shipment QR" | ✅ Simple |

---

## Where to Find Each QR Type

### 📦 Shipment QR
- **Created:** When shipment is made
- **Displayed:** 
  - Shipment intake modal ("View Shipment QR")
  - Release note PDF
  - Warehouse system
- **Format:** `SHIPMENT_{timestamp-randomId}`
- **Database:** `shipment.qrCode`

### 📪 Box QR
- **Created:** Auto-generated for each box
- **Displayed:**
  - Shipping labels
  - Warehouse pick lists
- **Format:** `SHIPMENT_{timestamp-randomId}-BOX{001}`
- **Database:** `shipment_box.qrCode`
- **Metadata:** `shipment_box.pieceQR` (JSON with box/pallet info)

### 🏗️ Rack QR
- **Created:** When rack is created
- **Displayed:**
  - Rack labels
  - Warehouse signage
- **Format:** `RACK_{rackCode}`
- **Database:** `rack.qrCode`

---

## Scanner Flow

```
Scan QR Code
    ↓
Send to /api/warehouse/qr-scan
    ↓
Match Format:
  • SHIPMENT_xxx → Fetch shipment + all boxes
  • SHIPMENT_xxx-BOXxxx → Fetch box details
  • RACK_xxx → Fetch rack + contents
  • WH_xxx → Legacy support
    ↓
Display Results
```

---

## What's In The QR? What's In The Database?

### **IN QR CODE (Text):**
- Identification only
- Shipment/Rack/Box ID
- NEVER metadata

### **IN DATABASE (Not in QR):**
- Pallet number
- Box count per pallet
- Total boxes
- Customer info
- All metadata
- Status history

**Why?** QR stays small & scannable. Database holds all details.

---

## Frontend Changes Users See

### ❌ **REMOVED UI Elements:**
- "Pallet QR" option
- Pallet details display
- Box count selector in QR preview
- Confusing dropdown menus

### ✅ **NEW UI Elements:**
- Single "View Shipment QR" button
- Clean shipment info display
- "QR codes are permanent and never change" notice
- Simplified modal design

---

## Backend Logic (For Developers)

### Shipment Creation
```typescript
// backend/src/routes/shipments.ts (line ~423)
const shipmentNumber = `${Date.now()}-${randomString}`;
const masterQR = `SHIPMENT_${shipmentNumber}`;

// Store in database
shipment.qrCode = masterQR;  // ← This QR NEVER changes

// Create boxes with derived QR
box.qrCode = `${masterQR}-BOX${boxNum}`;

// All metadata stored separately
box.pieceQR = JSON.stringify({
  masterQRCode: masterQR,
  boxNumber,
  palletNumber,
  // ... all info here
});
```

### QR Scanning
```typescript
// backend/src/routes/warehouse.ts (line ~335)
if (qrCode.startsWith('SHIPMENT_')) {
  const shipment = await findShipmentByQR(qrCode);
  return shipment with all related data;
}

if (qrCode.startsWith('RACK_')) {
  const rack = await findRackByQR(qrCode);
  return rack with contents;
}
```

---

## Testing Scenarios

### ✅ Test 1: Create Shipment with Photo
1. Create new shipment
2. Click "View Shipment QR"
3. See `SHIPMENT_XXXXX` format
4. QR should be simple, scannable

### ✅ Test 2: Scan Shipment
1. Use warehouse QR scanner
2. Scan shipment QR
3. Shows shipment details & all boxes

### ✅ Test 3: Scan Box
1. Scan `SHIPMENT_XXXXX-BOX001`
2. Shows individual box info
3. Shows which pallet (from pieceQR)

### ✅ Test 4: Scan Rack
1. Create rack → generates `RACK_RACK-001`
2. Scan rack QR
3. Shows rack + all boxes in it

### ✅ Test 5: QR Never Changes
1. Create shipment → note QR
2. Refresh page multiple times
3. QR should be identical every time
4. (Database proves it's stored permanently)

---

## Files Changed

```
backend/
  └─ src/
      ├─ routes/
      │   ├─ shipments.ts         ← QR generation
      │   ├─ racks.ts             ← Rack QR format
      │   └─ warehouse.ts         ← Scanner endpoint
      └─ lib/
          └─ shipmentWorkflow.ts  ← Alternative creation

frontend/
  └─ src/
      ├─ components/
      │   └─ WHMShipmentModal.tsx ← UI changes
      └─ dist/
          └─ version.json         ← v2.1.32
```

---

## Version History

- **v2.1.32:** QR code simplification (CURRENT)
- **v2.1.31:** Photo upload fix
- **v2.1.30:** SSH path fixes
- Previous: Older versions (before this sprint)

---

## ⚠️ Important Reminders

🔒 **QR CODES ARE PERMANENT**
- Once assigned, they never change
- Physical stickers are permanent
- No need to reprint if format seems "off"

🎯 **2 QR TYPES ONLY**
- SHIPMENT_
- RACK_
- Nothing else in this project

📊 **All Metadata in Database**
- Not encoded in QR
- Faster scanning
- More flexible

🔄 **Backward Compatible**
- Old WH_ format still works
- Automatic format detection
- No migration needed

---

**Last Updated:** November 2, 2024  
**Version:** v2.1.32  
**Status:** ✅ Ready for Production
