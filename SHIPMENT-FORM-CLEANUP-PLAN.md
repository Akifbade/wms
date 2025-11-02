# 📋 Shipment Form Cleanup Plan

## 🎯 Goal
Unify Add/Edit/View shipment workflows using WHMShipmentModal as the master template.

## ⚠️ Issues Found

### 1. **Duplicate Fields in WHMShipmentModal.tsx**
- "Additional Notes" appears 2x (line 1607 + 2014)
- Likely other duplicates in 2061-line file
- Very messy and confusing for users

### 2. **Edit Shipment Uses Old Form**
- Currently uses `EnhancedShipmentForm.tsx` (outdated)
- Missing new fields: companyProfileId, storageType, shipper/consignee details
- Different UI/UX than intake form

### 3. **View Details Missing Fields**
- Might not show new warehouse fields
- companyProfile, storageType, shipper/consignee data
- Custom fields display

## ✅ Solution Plan

### Step 1: Clean WHMShipmentModal.tsx
- Remove duplicate "Additional Notes" section
- Remove duplicate "Estimated Value" if any
- Organize into clear sections:
  - Basic Info (client, barcode, arrival)
  - Intake Mode (Pallet vs Piece)
  - Warehouse Details (shipper, consignee, addresses)
  - Storage (rack, type, special instructions)
  - Photos (per-pallet or shipment-wide)
  - Pricing/Notes
  - Custom Fields

### Step 2: Update Edit Shipment
- Replace EnhancedShipmentForm with WHMShipmentModal
- Add `mode` prop: 'create' | 'edit'
- Pre-fill all fields when editing
- Load existing photos, custom fields, etc.

### Step 3: Update View Details Modal
- Show all fields from WHMShipmentModal structure
- Display company profile info
- Show shipper/consignee details
- Display storage type and special instructions
- Show custom field values
- Display photos grid

### Step 4: Test All 3 Workflows
- Create new shipment → Check all fields save
- Edit existing shipment → Check all fields load and update
- View shipment details → Check all fields display

## 🚫 What We WON'T Touch
- ❌ NO backend API changes
- ❌ NO database schema changes
- ❌ NO breaking existing shipments
- ❌ NO core logic modifications

## ✅ Expected Result
- Clean, organized 800-line form (vs 2061 lines)
- Add/Edit/View all use same structure
- No duplicate fields
- Professional, easy to understand
- All data properly connected

---

Ready to implement? Reply "yes" to start the cleanup!
