# 🎯 HOW TO REMOVE BOXES FROM RACK & DELETE SHIPMENT

## Problem You Described:
**"SHIPMENT DELETE KARNE KA OPTION NAHI HAI, AGAR MUJE SHIPMENT DELETE KARNA HAI TO USKO RACK SE HATNA HOGA"**

Translation: "There's no option to delete a shipment. If I want to delete a shipment, I have to remove it from the rack first."

---

## ✅ Solution: **Release Boxes Workflow**

### **The Correct Workflow is:**

```
1. Shipment is IN_STORAGE (boxes are in a rack)
                    ⬇️
2. Go to "Warehouse Release" page (or Shipment details)
                    ⬇️
3. Click "Release All Boxes" button
                    ⬇️
4. Boxes status changes: IN_STORAGE → RELEASED
   Boxes removed from rack (rackId = NULL)
                    ⬇️
5. Shipment status changes: IN_STORAGE → RELEASED
                    ⬇️
6. Now you can DELETE the shipment (no boxes allocated)
                    ⬇️
7. Shipment status: RELEASED → DELETED (soft delete)
   Shipment archived forever with full audit trail
```

---

## 📍 WHERE TO FIND THE "RELEASE BOXES" OPTION

### **Option 1: Warehouse Release Page** (Recommended)
**Path:** `http://localhost:80` → Left Sidebar → **"Warehouse Release"**

This page is specifically designed for releasing shipments:
- Shows all shipments with IN_STORAGE status
- Shows rack location for each shipment
- Click the blue "Release" button
- System calculates storage charges and generates invoice automatically

### **Option 2: Shipments List Page**
**Path:** `http://localhost:80` → Left Sidebar → **"Shipments"** → Click shipment

From shipment details:
- Click the action button (⋯ or Release icon)
- Look for "Release Boxes" option
- Same workflow as above

---

## 🔄 API ENDPOINTS (Backend)

### **Step 1: Release All Boxes from Shipment**
```
POST /api/shipments/:id/release-boxes
Content-Type: application/json

Body:
{
  "releaseAll": true,           // Release ALL boxes
  "collectorID": "COLLECTOR123", // Optional: who is picking up
  "releasePhotos": [...]        // Optional: pickup photos
}

Response:
{
  "success": true,
  "releasedCount": 5,           // Number of boxes released
  "remainingCount": 0,          // Boxes still in storage (if partial release)
  "shipmentStatus": "RELEASED",  // New status
  "charges": {                   // Storage charges calculated
    "total": 25.50,
    "currency": "KWD",
    "breakdown": {
      "storage": 10.00,
      "boxes": 5.00,
      "handling": 5.00,
      "transport": 5.50
    }
  }
}
```

**What happens:**
- All boxes status: `IN_STORAGE` → `RELEASED`
- All boxes `rackId`: removed (set to NULL)
- Rack capacity updated automatically
- Rack activity logged: "Released 5 boxes from shipment REF123"
- Shipment status: `IN_STORAGE` → `RELEASED`
- Invoice generated with charges

---

### **Step 2: Delete Shipment** (After all boxes released)
```
DELETE /api/shipments/:id
Content-Type: application/json

Response:
{
  "message": "Shipment deleted successfully",
  "shipment": {
    "id": "ship123",
    "referenceId": "REF123",
    "status": "RELEASED",
    "deletedAt": "2025-11-01T12:30:00Z"  // Soft delete timestamp
  }
}
```

**What happens:**
- Shipment marked as deleted (`deletedAt = NOW()`)
- All audit trail preserved
- Shipment appears as DELETED in system
- Can be recovered from database if needed

---

## 🎬 Step-by-Step UI Guide

### **Step 1: Go to Warehouse Release**
```
Home Page
  └─ Left Sidebar
    └─ "Warehouse" section
      └─ Click "Warehouse Release" ← THIS IS THE MAIN PAGE
```

### **Step 2: Find Your Shipment**
- You'll see a table of all shipments with status `IN_STORAGE`
- Search by Reference ID, Shipper, or Consignee
- Filter by status (ACTIVE, IN_STORAGE, PARTIAL, RELEASED, etc.)

### **Step 3: Release the Shipment**
- Locate your shipment in the table
- Click the blue **"Release"** button (trash/release icon)
- System will ask for confirmation:
  ```
  "Are you sure you want to release this shipment? 
   This will calculate charges and generate an invoice."
  ```
- Click **"Yes"** to confirm

### **Step 4: Invoice Generated**
- A popup shows the invoice with:
  - Invoice Number
  - Storage charges breakdown
  - Total amount to collect
  - Boxes released count

### **Step 5: Now Delete Shipment** (If needed)
- Go back to "Shipments" page
- Find the shipment (now status = RELEASED)
- Click the **"Delete"** button (trash icon)
- Confirm deletion
- ✅ Shipment deleted successfully!

---

## 📊 Box Status Transitions

```
When a box is released from a rack:

Box Status Journey:
┌─────────────────────────────────────────┐
│ 1. CREATED                              │ (Box first added)
│ 2. IN_STORAGE + rackId = "RACK1"       │ (Box allocated to rack)
│ 3. RELEASED + rackId = NULL            │ (Box removed from rack)
│ 4. COLLECTED                           │ (Optional: picked up by customer)
└─────────────────────────────────────────┘

When you release boxes:
- Status: IN_STORAGE → RELEASED
- Rack: A1 → (removed)
- Rack Capacity: Updated (pallets/space freed)
- Rack Activity: Logged with "RELEASE" action
```

---

## 🔒 Access Control

**Who can release boxes:**
- ✅ ADMIN (can do anything)
- ✅ MANAGER (can release, calculate charges, create invoices)
- ❌ WORKER (cannot release - read-only)
- ❌ DRIVER (cannot release - read-only)
- ❌ SCANNER (cannot release - read-only)

**Who can delete shipments:**
- ✅ ADMIN (can delete any shipment)
- ❌ MANAGER (cannot delete - only release)
- ❌ Others (cannot delete)

---

## ⚠️ Important Rules

### **Cannot Release If:**
1. ❌ Boxes are in WRONG STATUS (not IN_STORAGE)
2. ❌ Shipment status is DELETED or RELEASED already
3. ❌ No boxes found to release
4. ❌ Shipment settings require photos but none provided
5. ❌ Shipment settings require ID verification but ID not provided

### **Cannot Delete If:**
1. ❌ Boxes are still allocated to rack (IN_STORAGE)
2. ❌ Shipment status is not fully RELEASED
3. ❌ User role is not ADMIN
4. ❌ Shipment doesn't exist

---

## 📝 Settings That Affect Release Process

These can be configured in **Settings → Shipment Settings**:

```javascript
{
  "requireIDVerification": true,        // Need collector ID
  "requireReleasePhotos": true,         // Need pickup photos
  "allowPartialRelease": false,         // Can only release ALL at once
  "partialReleaseMinBoxes": 0,          // Min boxes for partial release
  "generateReleaseInvoice": true,       // Auto-generate invoice
  "minimumChargeDays": 1,               // Minimum storage days to charge
  "storageRatePerDay": 5.0,            // KWD per day
  "storageRatePerBox": 1.0,            // KWD per box
  "releaseHandlingFee": 5.0,           // Fixed handling fee
  "releasePerBoxFee": 0.5,             // Fee per box
  "releaseTransportFee": 5.5,          // Transport fee
  "notifyClientOnRelease": true        // Send SMS/email to customer
}
```

---

## 🎯 Quick Reference Checklist

When you want to **DELETE A SHIPMENT**:

- [ ] Check shipment status = IN_STORAGE (has boxes in rack)
- [ ] Go to Warehouse Release page
- [ ] Find the shipment
- [ ] Click "Release" button
- [ ] Confirm release
- [ ] Wait for invoice generation
- [ ] ✅ Shipment now RELEASED (boxes removed from rack)
- [ ] Go to Shipments page
- [ ] Find the now-RELEASED shipment
- [ ] Click "Delete" button
- [ ] Confirm deletion
- [ ] ✅ Shipment DELETED successfully!

---

## 🔍 Where to See Audit Trail

To see what happened to a shipment:

**For Racks:**
```
GET /api/racks/:rackId/audit
Shows all deletion attempts, modifications, releases
```

**For Shipments:**
Would be:
```
GET /api/shipments/:shipmentId/audit
(Currently available through activity logs)
```

---

## ❓ FAQs

**Q: Can I delete a shipment with boxes in the rack?**
A: NO. You must release all boxes first. The system will return error: "Cannot delete shipment: Materials are currently allocated to racks"

**Q: What if I want to DELETE just some boxes?**
A: Use "Release Boxes" with specific box numbers (if `allowPartialRelease = true`). Then delete the shipment after release.

**Q: Where do I see the released boxes?**
A: They're now with status RELEASED in the system. Check "Warehouse Release" page or Shipments page with filter "RELEASED"

**Q: Is the data permanently deleted?**
A: NO - it's a SOFT DELETE. The `deletedAt` timestamp is set but data exists in database. Can be recovered if needed.

**Q: Can I undo a release?**
A: YES - admin can manually update box status back to IN_STORAGE if needed. But there's no automatic "undo" button.

---

## 🎬 Video Walkthrough (Step by Step)

1. **Open Warehouse Release** 
   - Click left sidebar → Warehouse → Release

2. **Search Shipment**
   - Type Reference ID in search box
   - Or filter by status IN_STORAGE

3. **Release Boxes**
   - Click blue Release button
   - Confirm in popup
   - Wait for invoice

4. **Go to Shipments**
   - Click left sidebar → Shipments

5. **Delete Shipment**
   - Find RELEASED shipment
   - Click Delete button
   - ✅ Done!

---

## 🚀 Now You Know!

**The key takeaway:**
- Shipments cannot be deleted while boxes are in racks
- Must RELEASE boxes first (moves them out of racks)
- Then DELETE the shipment
- Both actions are tracked in full audit trail

**Got it?** 

Let me know if you need help with:
- Implementing partial release (currently all-or-nothing)
- Adding more audit information
- Creating custom reports for releases
- Automating the invoice process
