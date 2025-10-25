# 🧪 TESTING GUIDE - Payment Before Release System

## ✅ System Status: FULLY INTEGRATED

The payment-before-release system is **already built into your Shipments page**!

---

## 📍 WHERE TO FIND IT

### **Main Location: Shipments Page**

1. **Go to**: Dashboard → **Shipments** (in sidebar)
2. **Filter**: Click "In Storage" tab (green checkmark ✅)
3. **Find**: Any shipment with status "IN_STORAGE"
4. **Look for**: Purple arrow icon (→) in Actions column
5. **This is**: The "**Withdraw Items**" button

---

## 🎯 COMPLETE TESTING FLOW

### **Step 1: Prepare Test Shipment**

#### **Option A: Create New Test Shipment**
1. Click "**+ New Shipment**" button (top right)
2. Fill in:
   ```
   Client Name: Ahmed Test
   Client Phone: +965 1234 5678
   Box Count: 10
   Type: Regular
   ```
3. Click "**Save**"
4. Shipment status will be: **PENDING**

#### **Option B: Use Existing Shipment**
1. Go to **Shipments** page
2. Click "**In Storage**" tab
3. Find any shipment with boxes available

---

### **Step 2: Move to IN_STORAGE (if needed)**

If shipment is PENDING:
1. Find the shipment
2. Click **Edit** button (pencil icon)
3. Change status to: **IN_STORAGE**
4. Or assign to a rack (automatically sets IN_STORAGE)
5. Click **Save**

---

### **Step 3: Start Withdrawal (Payment Flow Begins)**

1. **Go to Shipments** → Click "**In Storage**" tab
2. **Find your test shipment**
3. **Look at Actions column** → Find purple arrow icon (→)
4. **Hover over icon** → Tooltip says "**Withdraw Items**"
5. **Click the purple arrow icon** (→)

**✅ WithdrawalModal opens!**

---

### **Step 4: Enter Withdrawal Details**

Modal shows: **"📦 Withdraw Items"**

**Fill in:**
```
Release Type:
  ○ Full Release (all 10 boxes)     ← Click this
  ○ Partial Release

Boxes to withdraw: 10

Collected by: Ahmed Mohammed     ← Enter name

Reason: Customer Collection      ← Select

Receipt Number: WD-1729012345    ← Auto-generated

Notes: Test withdrawal            ← Optional
```

**Click**: **"💰 Continue to Payment"** button (bottom right)

---

### **Step 5: Payment Modal Appears**

**New modal opens: "💰 Payment Required Before Release"**

#### **Step Indicator Shows:**
```
✅ 1. Invoice Created
→  2. Payment & Release
```

---

### **Step 6: View Auto-Generated Invoice**

**Invoice Preview Shows:**

```
┌────────────────────────────────┐
│ Invoice #INV-00001             │
│ Generated: Oct 15, 2025        │
├────────────────────────────────┤
│ Client: Ahmed Test             │
│ Phone: +965 1234 5678          │
│ Shipment: SHP-001              │
│ Releasing: 10 boxes            │
├────────────────────────────────┤
│ Storage: 5 days × 10 boxes ×  │
│          0.500 KWD = 25.000    │
├────────────────────────────────┤
│ Subtotal:        25.000 KWD    │
│ Tax (5%):         1.250 KWD    │
│ TOTAL:           26.250 KWD    │
└────────────────────────────────┘
```

**Two Buttons:**
- "**Print Invoice**" - Print invoice for customer
- "**Proceed to Payment**" - Continue to payment

**Click**: "**Proceed to Payment**"

---

### **Step 7: Choose Payment Option**

**Three options appear:**

```
┌─────────────────────────────────┐
│ ✅ Full Payment                 │
│    26.250 KWD                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 💵 Partial Payment              │
│    Pay some now                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 📝 On Debt                      │
│    Pay later                    │
└─────────────────────────────────┘
```

---

### **TEST A: Full Payment with KNET**

1. **Click**: "**✅ Full Payment**"
2. **Amount shows**: 26.250 KWD (auto-filled, cannot change)
3. **Payment Method**: Click "**KNET**"
4. **Transaction Reference**: Enter `123456789` ⚠️ (REQUIRED!)
5. **Receipt Number**: PMT-1729012345 (auto-filled)
6. **Click**: "**💰 Record Payment & Release**"

**Expected Result:**
```
✅ Alert: "Payment recorded successfully! Invoice PAID. Release completed."
✅ Modal closes
✅ Shipments page refreshes
✅ Shipment status → RELEASED
✅ Current boxes → 0
```

**Verify in Database:**
1. Go to **Invoices** page
2. Find invoice #INV-00001
3. Status: **PAID** ✅
4. Balance: 0.000 KWD
5. Click invoice → View Payments
6. Payment shows: 26.250 KWD, KNET, Ref: 123456789 ✅

---

### **TEST B: Partial Payment with CASH**

1. **Click**: "**💵 Partial Payment**"
2. **Amount**: Change to `15.000` (half payment)
3. **Remaining shows**: 11.250 KWD
4. **Payment Method**: Click "**CASH**"
5. **Click**: "**💰 Record Payment & Release**"

**Expected Result:**
```
✅ Alert: "Partial payment of 15.000 KWD recorded. Balance: 11.250 KWD. Release completed."
✅ Modal closes
✅ Goods released
```

**Verify in Database:**
1. Go to **Invoices** page
2. Find invoice
3. Status: **PARTIAL** ⚠️
4. Balance: 11.250 KWD
5. Click invoice → See payment history
6. Payment: 15.000 KWD (CASH) ✅

**Customer Still Owes**: 11.250 KWD

---

### **TEST C: On Debt (No Payment)**

1. **Click**: "**📝 On Debt**"
2. **Warning appears**:
   ```
   ⚠️ Releasing on DEBT
   Customer can collect items without payment.
   Invoice #INV-00002 will remain UNPAID.
   Customer must pay later.
   ```
3. **Click**: "**✅ Approve Debt & Release**"

**Expected Result:**
```
✅ Alert: "Withdrawal approved on DEBT. Customer must pay invoice later."
✅ Modal closes
✅ Goods released WITHOUT payment
```

**Verify in Database:**
1. Go to **Invoices** page
2. Find invoice
3. Status: **PENDING** ⚠️
4. Balance: Full amount (e.g., 26.250 KWD)
5. No payments recorded yet

**Customer Owes**: Full amount

---

## 📊 Verification Checklist

After testing, verify these in the system:

### **✅ Invoices Page**
- [ ] Go to Invoices
- [ ] See all created invoices
- [ ] Filter by "PENDING" - See unpaid invoices
- [ ] Filter by "PARTIAL" - See partially paid
- [ ] Filter by "PAID" - See fully paid
- [ ] Click invoice - See payment history

### **✅ Dashboard Stats**
- [ ] Total outstanding amount updated
- [ ] Number of unpaid invoices shown
- [ ] Total collected today/week/month

### **✅ Shipments Page**
- [ ] Released shipments show status: RELEASED
- [ ] Current box count = 0 (if full release)
- [ ] Can view shipment details
- [ ] Release note can be printed

### **✅ Database Records**
- [ ] Invoice table has new records
- [ ] Payment table has payment records (if paid)
- [ ] Withdrawal table has withdrawal records
- [ ] Shipment status updated
- [ ] KNET transaction references saved

---

## 🔍 Troubleshooting

### **Problem: Withdraw button not showing**

**Possible reasons:**
1. Shipment status is not "IN_STORAGE"
   - **Fix**: Edit shipment, change status to IN_STORAGE
   
2. Shipment has 0 boxes
   - **Fix**: Cannot withdraw from empty shipment
   
3. Looking in wrong tab
   - **Fix**: Click "In Storage" tab to see shipments

### **Problem: "Continue to Payment" button does nothing**

**Check:**
1. Boxes count entered? (required)
2. Collected by name entered? (required)
3. Check browser console for errors
4. Refresh page and try again

### **Problem: Invoice not creating**

**Check:**
1. Backend server running? (port 5000)
2. Billing settings configured?
3. Check browser console
4. Check backend terminal for errors

### **Problem: KNET payment fails**

**Reason:** Transaction reference not entered

**Fix:** 
1. KNET requires transaction reference
2. Enter any test number: `123456789`
3. In production, use real KNET ref from machine

### **Problem: Payment recorded but shipment not released**

**Check:**
1. Backend logs
2. Refresh Shipments page
3. Check shipment status in database
4. Try viewing shipment details

---

## 📱 User Interface Reference

### **Withdrawal Button Location:**
```
Shipments Table:
┌──────┬────────┬─────────┬──────┬────────┬──────┬────────────┐
│ ID   │ Client │ Contact │ Pcs  │ Rack   │ Days │ Actions    │
├──────┼────────┼─────────┼──────┼────────┼──────┼────────────┤
│SHP-1 │ Ahmed  │ +965... │ 10/10│ R-001  │ 5    │ [QR][→][👁]│
└──────┴────────┴─────────┴──────┴────────┴──────┴────────────┘
                                                      ↑
                                              This purple arrow
                                              = Withdraw button
```

### **Button Tooltip:**
Hover over purple arrow → Shows: **"Withdraw Items"**

---

## 🎯 Testing Scenarios

### **Scenario 1: Regular Customer (Pays Full)**
```
1. Customer wants to collect 10 boxes
2. Click Withdraw → Enter details
3. Choose Full Payment → KNET
4. Enter transaction ref: 987654321
5. Complete
Result: Paid ✅, Released ✅
```

### **Scenario 2: Customer Pays Partial**
```
1. Customer wants 20 boxes
2. Total: 60.000 KWD
3. Customer has only 40.000 KWD now
4. Choose Partial → Enter 40.000
5. Complete
Result: Partial ⚠️, Balance: 20.000 KWD, Released ✅
```

### **Scenario 3: Trusted Customer (Debt)**
```
1. Regular customer needs urgent release
2. Will pay next week
3. Choose On Debt
4. Approve
Result: Unpaid ⚠️, Balance: Full amount, Released ✅
Follow up: Customer pays next week
```

### **Scenario 4: Payment After Debt**
```
1. Customer was on debt (26.250 KWD owed)
2. Customer returns to pay
3. Go to Invoices → Find invoice
4. Click "Record Payment"
5. Enter: 26.250 KWD, CASH
6. Save
Result: Invoice → PAID ✅
```

---

## ✅ SUCCESS CRITERIA

Your system is working correctly if:

1. ✅ **Cannot release** without going through payment modal
2. ✅ **Invoice auto-generated** with correct storage charges
3. ✅ **KNET requires** transaction reference
4. ✅ **Payment recorded** in database with all details
5. ✅ **Shipment status updated** to RELEASED
6. ✅ **Balance tracked** for partial/debt payments
7. ✅ **Outstanding visible** in Invoices page
8. ✅ **Can pay later** for debt invoices

---

## 🚀 Next Steps After Testing

1. **Test all 3 scenarios** (Full/Partial/Debt)
2. **Verify database** records are correct
3. **Check Invoices page** shows all invoices
4. **Test payment later** for debt invoices
5. **Print invoice** and verify formatting
6. **Configure billing settings** with your rates
7. **Train staff** on the workflow
8. **Go live!** 🎉

---

## 📞 Quick Reference

**Where is Withdraw button?**
→ Shipments page → In Storage tab → Actions column → Purple arrow icon (→)

**What if I don't see the button?**
→ Check: Shipment is IN_STORAGE status, Has boxes > 0, Looking at right tab

**Can I skip payment?**
→ No! Must choose: Full Pay / Partial Pay / On Debt

**Is KNET transaction reference required?**
→ Yes! System enforces it for KNET payments

**Where to see outstanding payments?**
→ Invoices page → Filter by PENDING or PARTIAL

---

**System Status**: ✅ **FULLY OPERATIONAL**  
**Your Action**: Start testing with real shipments!

Good luck! 🚀
