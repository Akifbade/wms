# 🎯 NEW BILLING FEATURES - WHERE TO FIND THEM

## ✅ Version: v2.2.0-EDITABLE-INVOICE

---

## 🔢 AUTO-VERSION SYSTEM (NEW!)

### How to Use Auto-Version:
1. Press **Ctrl+Shift+P**
2. Type: **"Tasks: Run Task"**
3. Choose one of these tasks:

#### Option 1: Quick Deploy (Recommended)
- Task: **🚀 AUTO-VERSION: Build & Deploy (Quick)**
- What it does:
  - ✅ Auto-increments version (v2.2.0 → v2.2.1)
  - ✅ Builds frontend
  - ✅ Deploys to Docker
  - ✅ Shows new version number
- Time: ~30 seconds

#### Option 2: Full Docker Rebuild
- Task: **🔄 AUTO-VERSION: Rebuild Docker (Full)**
- What it does:
  - ✅ Auto-increments version
  - ✅ Rebuilds entire Docker image (no cache)
  - ✅ Guaranteed fresh deployment
- Time: ~2 minutes

#### Option 3: Version Only
- Task: **🔢 AUTO-VERSION: Increment Version Number**
- Just updates version.ts without building/deploying

### After Deploy:
- **IMPORTANT**: Press **Ctrl+Shift+R** in browser to hard refresh
- Check version in bottom-left corner of app

---

## 📍 FEATURE LOCATION 1: EDITABLE INVOICE

### Where to Find:
1. Open **http://localhost** in browser
2. Login to WMS
3. Click **"Shipments"** in left sidebar
4. Find any shipment in the list
5. Click **"Release Shipment"** button (on the right)
6. Scroll down to **"Invoice Preview - Editable"** section

### What You'll See:
```
┌─────────────────────────────────────────────────────────────┐
│ Invoice Preview - Editable                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Description          Qty    Unit Price    Amount   Taxable  │
│ ─────────────────────────────────────────────────────────────│
│ [Storage Charges] │  [30]│ [100.00]  │ $3,000.00 │ [✓]    │ <- Editable!
│ [Release Fee]     │  [1] │ [200.00]  │ $200.00   │ [✓]    │ <- Editable!
│                                                              │
│ [+ Add Manual Charge]                                        │ <- Click to add
│                                                              │
│ Subtotal:  $3,200.00                                         │
│ Tax (10%): $320.00                                           │
│ Total:     $3,520.00                                         │
└─────────────────────────────────────────────────────────────┘
```

### How to Edit:
- **Change Description**: Click text field, type new description
- **Change Quantity**: Click number field, type new quantity
- **Change Price**: Click price field, type new unit price
- **Toggle Tax**: Check/uncheck "Taxable" checkbox
- **Delete Line**: Click trash icon (🗑️) on right
- **Add Manual Charge**: Click "+ Add Manual Charge" button

### What Updates Automatically:
- Amount = Quantity × Unit Price
- Tax recalculates when you check/uncheck taxable
- Totals update instantly

---

## 📍 FEATURE LOCATION 2: CBM RATES & CUSTOM PRICING

### Where to Find:
1. In same **"Release Shipment"** modal
2. Look at **Storage Charges** calculation
3. If shipment has custom pricing, you'll see:

```
Storage: 30 days × 2.5 m³ × $40.00/m³/day = $3,000.00
         ↑          ↑         ↑
       days     CBM rate   custom rate (if set)
```

### How CBM Rate is Selected (Smart Priority):
1. **First**: Custom CBM rate (set per shipment)
2. **Second**: Custom box rate (set per shipment)
3. **Third**: Company default rate

### How to Set Custom Pricing:
1. Click **"Create Shipment"** button
2. Fill in **Length, Width, Height** (CBM auto-calculates)
3. Check **"Custom Pricing"** checkbox
4. Enter **Custom CBM Rate** (e.g., 40.00)
5. Optionally: Add **Box Rate** and **Release Fee**
6. Click **Save**

### Where Custom Pricing Shows:
- In shipment list (shows custom icon if set)
- In release modal (uses custom rate for calculations)
- In editable invoice (shows correct per-CBM pricing)

---

## 📍 FEATURE LOCATION 3: LIVE CHARGES PREVIEW

### Where to Find:
1. Click **"Shipments"** → Select any shipment
2. Click **"View Details"** (eye icon)
3. Look for **"📊 Current Charges"** section

### What You'll See:
```
┌─────────────────────────────────────────────┐
│ 📊 Current Charges                          │
├─────────────────────────────────────────────┤
│ Storage:       $3,000.00                    │
│ Release Fee:   $200.00                      │
│ ────────────────────────────────            │
│ Subtotal:      $3,200.00                    │
│ Tax (10%):     $320.00                      │
│ Total Due:     $3,520.00                    │
│                                             │
│ Last updated: 2 minutes ago                 │
│ Auto-refreshes every 30 seconds             │
└─────────────────────────────────────────────┘
```

### Features:
- ✅ Auto-refreshes every 30 seconds
- ✅ Shows breakdown of all charges
- ✅ Updates as days increase
- ✅ Error handling if backend unavailable

---

## 📍 FEATURE LOCATION 4: MANUAL CHARGES (CUSTOM LINE ITEMS)

### Where to Find:
1. In **"Release Shipment"** modal
2. Scroll to **"Invoice Preview - Editable"** section
3. Click **"+ Add Manual Charge"** button

### What Happens:
- New blank line appears in invoice:
```
Description      Qty    Unit Price    Amount   Taxable
[Type here...]   [1]    [0.00]        $0.00    [ ]
```

### Example Manual Charges:
- "Express Handling" - $50.00
- "Damage Inspection" - $100.00
- "Weekend Delivery" - $75.00
- "Documentation Fee" - $25.00
- "Special Packaging" - $150.00

### How to Fill:
1. Type description (e.g., "Express Handling")
2. Enter quantity (usually 1)
3. Enter unit price (e.g., 50.00)
4. Check taxable if applicable
5. Amount auto-calculates

---

## 📍 FEATURE LOCATION 5: CBM CALCULATION (AUTO)

### Where to Find:
1. Click **"Create Shipment"**
2. Enter **Length, Width, Height** in dimensions section
3. CBM shows **automatically** below fields

### Example:
```
┌─────────────────────────────────────┐
│ Dimensions                          │
├─────────────────────────────────────┤
│ Length:  [100] cm                   │
│ Width:   [50]  cm                   │
│ Height:  [50]  cm                   │
│                                     │
│ 📦 Total CBM: 0.25 m³               │ <- Auto-calculated
│                                     │
│ □ Custom Pricing                    │
│   CBM Rate: [____] $/m³/day         │
└─────────────────────────────────────┘
```

### Formula:
```
CBM = (Length × Width × Height) ÷ 1,000,000
```

### Used For:
- Storage charge calculation
- Custom CBM rate pricing
- Invoice line items

---

## 🎯 QUICK TEST CHECKLIST

### Test 1: See Editable Invoice
- [ ] Go to Shipments
- [ ] Click "Release Shipment"
- [ ] Scroll to "Invoice Preview - Editable"
- [ ] See text fields for description/qty/price
- [ ] See "+ Add Manual Charge" button

### Test 2: Edit Charges
- [ ] Change quantity of a line item
- [ ] See amount update automatically
- [ ] Uncheck "Taxable"
- [ ] See tax recalculate
- [ ] See total update

### Test 3: Add Manual Charge
- [ ] Click "+ Add Manual Charge"
- [ ] Type description: "Test Fee"
- [ ] Enter price: 100
- [ ] See it appear in invoice totals

### Test 4: Check CBM Rates
- [ ] Create new shipment with dimensions
- [ ] Enable "Custom Pricing"
- [ ] Enter CBM rate
- [ ] Release shipment
- [ ] See custom rate used in calculations

### Test 5: Live Preview
- [ ] Open shipment details
- [ ] See "📊 Current Charges" section
- [ ] Wait 30 seconds
- [ ] See "Last updated" timestamp change

---

## ⚠️ TROUBLESHOOTING

### "I don't see editable fields in invoice"
1. Press **Ctrl+Shift+R** to hard refresh browser
2. Check version in bottom-left: Should be **v2.2.0** or higher
3. Run task: **🚀 AUTO-VERSION: Build & Deploy (Quick)**
4. Hard refresh again

### "Version still shows old number"
1. Run: **🔢 AUTO-VERSION: Increment Version Number**
2. Check `frontend/src/config/version.ts` file
3. Rebuild: **🚀 AUTO-VERSION: Build & Deploy (Quick)**
4. Hard refresh browser: **Ctrl+Shift+R**

### "Charges not calculating correctly"
1. Check if shipment has **Custom Pricing** enabled
2. Verify CBM rate in shipment details
3. Check company settings for default rates
4. See priority: Custom CBM > Custom Box > Company Default

### "Changes not saving when I edit invoice"
- Currently **preview only** - edits shown but not saved to DB
- To implement saving: Need backend API endpoint
- For now: Used for adjusting before final release

---

## 📚 FILES MODIFIED (For AI Context)

### Frontend Files:
1. `frontend/src/config/version.ts` - Version control
2. `frontend/src/components/ReleaseShipmentModal.tsx` - Editable invoice
3. `frontend/src/components/CreateShipmentModal.tsx` - Custom pricing UI
4. `frontend/src/components/LiveChargesPreview.tsx` - Real-time charges
5. `frontend/public/sw.js` - Service worker (caching disabled)

### Backend Files:
1. `backend/src/routes/shipments.ts` - Auto-CBM calculation
2. `backend/src/utils/chargeCalculation.ts` - Smart rate selection
3. `backend/prisma/schema.prisma` - Custom pricing fields

### Automation Files:
1. `.vscode/auto-version.ps1` - Auto-increment script
2. `.vscode/tasks.json` - Auto-version tasks

---

## 🚀 NEXT STEPS

### For Future Development:
1. Add backend endpoint to save edited invoice
2. Add invoice history/versioning
3. Add discount percentage feature
4. Add bulk invoice generation
5. Add PDF export for invoices

### For AI/Future Sessions:
- Auto-version system is now in `.vscode/`
- Tasks are in `tasks.json`
- New AI can run: **🚀 AUTO-VERSION: Build & Deploy (Quick)**
- No need to manually update version numbers anymore

---

**Last Updated**: December 2024  
**Version**: v2.2.0-EDITABLE-INVOICE  
**Auto-Version**: Enabled in `.vscode/auto-version.ps1`
