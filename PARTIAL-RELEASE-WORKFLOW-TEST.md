# 🧪 Partial Release & Payment Workflow Testing Guide

## ✅ Test Checklist - Complete Workflow Verification

### 1️⃣ **Input Field Fix Test** (CRITICAL - Your Issue)

#### Test 1.1: Number of Boxes Input Field Behavior
- [ ] Go to Shipments page on localhost:3000
- [ ] Find a shipment with IN_STORAGE or PARTIAL status
- [ ] Click "Generate Invoice & Release" button
- [ ] Click "Partial Release" button on the invoice modal
- [ ] **VERIFY:** Input field should be EMPTY or show current box count
- [ ] Click inside the input field
- [ ] **VERIFY:** Text should auto-select (highlighted)
- [ ] Type a new number (e.g., "5")
- [ ] **VERIFY:** Old value clears and new number appears
- [ ] Delete all text (backspace)
- [ ] **VERIFY:** Field accepts empty state temporarily
- [ ] Type new number again
- [ ] **VERIFY:** Works smoothly without "1" getting stuck

#### Test 1.2: Form Reset Between Opens
- [ ] Enter a number in the box count field (e.g., "3")
- [ ] Close the payment modal (X button)
- [ ] Click "Generate Invoice & Release" again
- [ ] **VERIFY:** Input field resets to current box count (not previous "3")
- [ ] All other fields (withdrawn by, reason, notes) should also be empty

---

### 2️⃣ **Full Release Flow Test**

#### Test 2.1: Full Release with Full Payment (CASH)
- [ ] Find shipment with 10 boxes IN_STORAGE
- [ ] Click "Generate Invoice & Release"
- [ ] **VERIFY:** Invoice auto-generates with correct amounts
- [ ] Click "Full Release" button
- [ ] **VERIFY:** Box count shows all 10 boxes
- [ ] **VERIFY:** Payment amount matches invoice total
- [ ] Select payment method: CASH
- [ ] Click "Process Payment & Release"
- [ ] **VERIFY:** Success message appears
- [ ] **VERIFY:** Receipt opens in new window/tab
- [ ] **VERIFY:** Receipt auto-prints
- [ ] **VERIFY:** Shipment status changes to RELEASED
- [ ] Go to Invoices section
- [ ] Find the invoice
- [ ] **VERIFY:** Status shows green badge "PAID"
- [ ] **VERIFY:** Paid Amount shows full amount (not 0.000)

#### Test 2.2: Full Release with Full Payment (KNET)
- [ ] Find another IN_STORAGE shipment
- [ ] Click "Generate Invoice & Release"
- [ ] Click "Full Release"
- [ ] Select payment method: KNET
- [ ] Enter transaction reference: "KNET123456"
- [ ] Click "Process Payment & Release"
- [ ] **VERIFY:** Works without errors
- [ ] Check invoice detail
- [ ] **VERIFY:** Transaction reference is saved

---

### 3️⃣ **Partial Release Flow Test** (Your Main Issue)

#### Test 3.1: Partial Release - First Time
- [ ] Find shipment with 20 boxes IN_STORAGE
- [ ] Click "Generate Invoice & Release"
- [ ] Invoice generates for all 20 boxes
- [ ] Click "Partial Release" button
- [ ] In "Number of Boxes to Withdraw" field:
  - [ ] Click inside field
  - [ ] **VERIFY:** Text auto-selects
  - [ ] Type "8" (releasing 8 out of 20)
- [ ] Fill "Withdrawn By": "Ali Khan"
- [ ] Fill "Reason": "Customer request"
- [ ] Select payment method: CASH
- [ ] **VERIFY:** Payment amount updates based on 8 boxes
- [ ] Click "Process Payment & Release"
- [ ] **VERIFY:** Success message shows partial amount
- [ ] **VERIFY:** Receipt prints for 8 boxes
- [ ] **VERIFY:** Shipment status changes to PARTIAL
- [ ] **VERIFY:** Current box count shows 12 (20 - 8 = 12)

#### Test 3.2: Partial Release - Second Time (The Critical Test)
- [ ] Same shipment now has 12 boxes and PARTIAL status
- [ ] Click "Generate Invoice & Release" button again
- [ ] **VERIFY:** Button is visible and clickable (not grayed out)
- [ ] New invoice generates for remaining 12 boxes
- [ ] Click "Partial Release" button
- [ ] **VERIFY:** Input field resets (NOT stuck on "1" or previous "8")
- [ ] Click inside "Number of Boxes to Withdraw" field
- [ ] **VERIFY:** Text auto-selects
- [ ] Type "5" (releasing 5 more boxes)
- [ ] **VERIFY:** "5" appears clearly, no stuck numbers
- [ ] Fill other details
- [ ] Select payment: CASH
- [ ] Click "Process Payment & Release"
- [ ] **VERIFY:** Works correctly
- [ ] **VERIFY:** Shipment still shows PARTIAL status
- [ ] **VERIFY:** Current box count now shows 7 (12 - 5 = 7)

#### Test 3.3: Partial Release - Final Release
- [ ] Same shipment with 7 boxes PARTIAL status
- [ ] Click "Generate Invoice & Release"
- [ ] Click "Full Release" (release all remaining 7)
- [ ] Pay full amount
- [ ] **VERIFY:** Status changes from PARTIAL to RELEASED
- [ ] **VERIFY:** Current box count becomes 0
- [ ] **VERIFY:** "Generate Invoice & Release" button disappears

---

### 4️⃣ **Partial Payment Test**

#### Test 4.1: Partial Payment Option
- [ ] Find shipment with invoice total of 50.000 KWD
- [ ] Click "Generate Invoice & Release"
- [ ] Invoice shows
- [ ] Select "Partial Payment" radio button
- [ ] Enter amount: 30.000 KWD (partial)
- [ ] **VERIFY:** Amount less than total is accepted
- [ ] Try entering 50.000 or more
- [ ] **VERIFY:** Error shows "Partial payment must be less than total"
- [ ] Enter valid partial: 30.000
- [ ] Select Full Release
- [ ] Process payment
- [ ] **VERIFY:** Success message shows balance due
- [ ] Check invoice in Invoices section
- [ ] **VERIFY:** Status shows blue badge "PARTIAL"
- [ ] **VERIFY:** Paid Amount shows 30.000
- [ ] **VERIFY:** Balance shows 20.000

#### Test 4.2: Multiple Partial Payments
- [ ] Same invoice with 20.000 balance
- [ ] Click "Record Payment" in invoice detail
- [ ] Add another 15.000 KWD payment
- [ ] **VERIFY:** Paid amount updates to 45.000
- [ ] **VERIFY:** Status still PARTIAL (blue)
- [ ] **VERIFY:** Balance shows 5.000
- [ ] Record final 5.000 payment
- [ ] **VERIFY:** Status changes to PAID (green)
- [ ] **VERIFY:** Balance shows 0.000

---

### 5️⃣ **Debt Option Test**

#### Test 5.1: Release on Debt
- [ ] Find shipment IN_STORAGE
- [ ] Click "Generate Invoice & Release"
- [ ] Select "Mark as Debt" radio button
- [ ] **VERIFY:** Payment fields are hidden/disabled
- [ ] Click Full Release
- [ ] Click "Process Payment & Release"
- [ ] **VERIFY:** Success message says "DEBT"
- [ ] **VERIFY:** Release completes
- [ ] **VERIFY:** Receipt prints
- [ ] Check invoice in Invoices section
- [ ] **VERIFY:** Status shows orange badge "PENDING"
- [ ] **VERIFY:** Paid Amount shows 0.000
- [ ] **VERIFY:** Balance shows full amount

---

### 6️⃣ **Logo Display Test**

#### Test 6.1: Logo Upload and Size
- [ ] Login to localhost:3000
- [ ] **VERIFY:** Company logo displays at login (if uploaded)
- [ ] Go to Settings > Company & Branding
- [ ] Upload a logo (PNG/JPG, under 2MB)
- [ ] **VERIFY:** Logo preview shows in settings
- [ ] **VERIFY:** No broken image icon
- [ ] Change logo size to "Small"
- [ ] Save settings
- [ ] Logout and return to login page
- [ ] **VERIFY:** Logo shows smaller (h-12 / 48px)
- [ ] Login again
- [ ] Change to "Large" in settings
- [ ] Logout and check login
- [ ] **VERIFY:** Logo shows larger (h-32 / 128px)

---

### 7️⃣ **Invoice Status Update Test**

#### Test 7.1: Status Badge Colors
- [ ] Go to Invoices section
- [ ] Find PENDING invoice (orange badge)
- [ ] Find PARTIAL invoice (blue badge)  
- [ ] Find PAID invoice (green badge)
- [ ] **VERIFY:** All three colors display correctly
- [ ] Click on PENDING invoice detail
- [ ] Record full payment
- [ ] **VERIFY:** Badge changes from orange → green instantly
- [ ] **VERIFY:** Paid Amount field updates (not stuck at 0.000)

---

### 8️⃣ **Receipt Printing Test**

#### Test 8.1: Receipt Format and Auto-Print
- [ ] Complete any release (full or partial)
- [ ] **VERIFY:** Receipt opens in new window/tab
- [ ] **VERIFY:** Auto-print dialog appears
- [ ] **VERIFY:** Receipt shows bilingual (EN/AR)
- [ ] **VERIFY:** All data correct: boxes, amounts, dates
- [ ] Click "Print Receipt" button manually
- [ ] **VERIFY:** Print dialog opens
- [ ] Click "Close" button
- [ ] **VERIFY:** Window/tab closes

---

## 🚨 Critical Issues to Watch For

### ❌ Issues That Should NOT Happen:
1. ❌ Number "1" stuck in box count input field
2. ❌ Input field not clearing when typing new number
3. ❌ Form fields showing old data when reopening modal
4. ❌ Paid Amount showing 0.000 after payment recorded
5. ❌ Invoice status stuck on orange (PENDING) after full payment
6. ❌ "Generate Invoice & Release" button not clickable for PARTIAL status
7. ❌ Logo showing broken image icon
8. ❌ Receipt not auto-printing
9. ❌ Status not updating from PARTIAL to RELEASED after final release

### ✅ Expected Behaviors:
1. ✅ Input field auto-selects text on focus
2. ✅ Form resets completely between modal opens
3. ✅ Can type any number easily without stuck values
4. ✅ Paid amount increments with each payment
5. ✅ Status badges change colors correctly (PENDING→PARTIAL→PAID)
6. ✅ Partial releases can be done multiple times
7. ✅ Final release changes status from PARTIAL to RELEASED
8. ✅ Logo displays at correct size
9. ✅ Receipts print automatically

---

## 📝 Test Results Template

```
DATE: __________
TESTER: __________

✅ PASSED / ❌ FAILED

1. Input Field Fix: [ ]
2. Full Release Flow: [ ]
3. Partial Release Flow: [ ]
4. Partial Payment: [ ]
5. Debt Option: [ ]
6. Logo Display: [ ]
7. Invoice Status: [ ]
8. Receipt Printing: [ ]

ISSUES FOUND:
1. ____________________
2. ____________________
3. ____________________

NOTES:
______________________
______________________
```

---

## 🎯 Success Criteria

**ALL TESTS MUST PASS** before deploying to VPS:
- ✅ Box count input field works smoothly (no stuck "1")
- ✅ Multiple partial releases work correctly
- ✅ Paid amounts update in invoices
- ✅ Status badges show correct colors
- ✅ Logo displays without broken image
- ✅ Receipts print automatically
- ✅ Workflow is intuitive and user-friendly

---

## 🚀 After All Tests Pass

If all tests pass on localhost, we will deploy to VPS with these commands:

```powershell
# 1. Upload backend changes
scp -r "C:\Users\USER\Videos\NEW START\frontend\src" root@72.60.215.188:"/var/www/wms/frontend/"

# 2. Upload frontend changes
scp -r "C:\Users\USER\Videos\NEW START\backend\src" root@72.60.215.188:"/var/www/wms/backend/"

# 3. Rebuild and restart
ssh root@72.60.215.188 "cd /var/www/wms/frontend && npm run build && pm2 restart wms-backend"
```

Then repeat all tests on VPS at **https://72.60.215.188**

---

**BHAI, AB TEST KARO! SABSE PEHLE PARTIAL RELEASE KA INPUT FIELD CHECK KARO!** 🎯
