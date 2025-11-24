# 🧪 TEST YOUR BILLING SYSTEM

## Quick Test Plan (5 Minutes)

### ✅ **Test 1: Check Current Billing Settings**

```bash
# Get your company's billing settings
curl http://localhost:5000/api/billing/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "storageRatePerBox": 0.500,
  "taxRate": 5.0,
  "currency": "KWD",
  "invoicePrefix": "INV",
  "invoiceDueDays": 10,
  "gracePeriodDays": 3,
  "minimumCharge": 10.0
}
```

---

### ✅ **Test 2: Create Test Shipment with CBM**

```bash
POST http://localhost:5000/api/shipments
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "TEST CBM Pricing",
  "referenceId": "TEST-001",
  "originalBoxCount": 5,
  "type": "COMMERCIAL",
  "category": "CUSTOMER_STORAGE",
  "clientName": "Test Customer",
  "clientPhone": "12345678",
  "arrivalDate": "2024-11-01T00:00:00Z",
  
  "length": 120,
  "width": 80,
  "height": 100,
  "weight": 50,
  
  "customRateEnabled": true,
  "customRatePerCBMPerDay": 5.000,
  "customRateNotes": "Test VIP customer rate"
}
```

**What this does:**
- Creates shipment with dimensions (120×80×100 cm)
- Auto-calculates CBM: 0.96 m³
- Sets custom rate: 5 KWD per m³ per day
- Stored for ~12 days (Nov 1 → Nov 13)

---

### ✅ **Test 3: Preview Charges**

```bash
GET http://localhost:5000/api/shipments/SHIPMENT_ID/charges-calculation
Authorization: Bearer YOUR_TOKEN
```

**Expected Result:**
```json
{
  "totalCharge": 57.600,  // (0.96 m³ × 5 KWD × 12 days)
  "breakdown": {
    "baseCharge": 57.600,
    "taxAmount": 2.880,
    "currency": "KWD"
  },
  "rateUsed": {
    "type": "CUSTOM",
    "ratePerCBMPerDay": 5.000,
    "source": "Custom CBM rate: 5.000 KWD/m³/day"
  },
  "daysCharged": 9,  // 12 days - 3 grace days
  "gracePeriodApplied": false
}
```

---

### ✅ **Test 4: Compare Box-Based vs CBM-Based**

**Create second shipment WITHOUT custom rate:**

```bash
POST http://localhost:5000/api/shipments
{
  "name": "TEST Box Pricing",
  "referenceId": "TEST-002",
  "originalBoxCount": 5,
  "clientName": "Regular Customer",
  "arrivalDate": "2024-11-01T00:00:00Z",
  
  "customRateEnabled": false
}
```

**Then preview charges:**
```bash
GET /api/shipments/SHIPMENT_ID/charges-calculation
```

**Expected:**
```json
{
  "totalCharge": 22.500,  // (5 boxes × 0.500 KWD × 9 days)
  "rateUsed": {
    "type": "COMPANY_DEFAULT",
    "ratePerBoxPerDay": 0.500,
    "source": "Company default: 0.500 KWD/box/day"
  }
}
```

**Comparison:**
- CBM-based: 57.600 KWD (for 0.96 m³ cargo)
- Box-based: 22.500 KWD (for 5 boxes)
- **CBM is 2.5× more expensive** for large/heavy cargo ✅

---

## 🎯 DECISION TIME

After testing, choose your strategy:

### **Strategy A: "All CBM-Based"**
✅ **What to do:**
1. Always record dimensions when shipment arrives
2. Enable custom rate for EVERY shipment
3. Set `customRatePerCBMPerDay` based on customer tier:
   - Regular: 3 KWD/m³/day
   - VIP: 5 KWD/m³/day
   - Bulk: 2 KWD/m³/day

⚠️ **Limitation:** Must manually enable custom rate per shipment (no global CBM default yet)

---

### **Strategy B: "Box-Based Default, CBM for Large Cargo"**
✅ **What to do:**
1. Keep `storageRatePerBox` = 0.500 KWD (default)
2. For large shipments (>10 boxes or >2 m³):
   - Enable `customRatePerCBMPerDay`
   - Record dimensions
   - System uses CBM pricing
3. Small shipments use box rate automatically

✅ **Best of both worlds!**

---

### **Strategy C: "Keep Current (Box-Only)"**
✅ **What to do:**
- Nothing! System already works
- 0.500 KWD per box per day
- No dimensions needed

---

## 🔧 OPTIONAL IMPROVEMENTS

### **1. Auto-Calculate CBM in Backend**

**Current:** Frontend must calculate `cbm` manually  
**Better:** Backend auto-calculates when saving shipment

**Quick Fix:** Add to `backend/src/routes/shipments.ts`:

```typescript
// Before creating shipment
if (length && width && height) {
  cbm = (length * width * height) / 1000000;
}
```

Want me to implement this?

---

### **2. Add Global CBM Rate to Billing Settings**

**Current:** Must use custom rate per shipment for CBM pricing  
**Better:** Set company-wide CBM rate in billing settings

**Changes needed:**
1. Add `storageRatePerCBM` to `BillingSettings` model
2. Update `chargeCalculation.ts` to use it
3. Fallback: CBM rate → Box rate

Want me to implement this?

---

### **3. Automated Monthly Invoicing**

**Current:** Manual invoice creation  
**Better:** Scheduled task to auto-generate invoices

**What it would do:**
- Every month, calculate charges for active shipments
- Generate invoices automatically
- Send to customers (future: email integration)

Want me to implement this?

---

## 📝 RECOMMENDATION

Based on your confusion about "how to charge properly":

### **DO THIS NOW:**

1. **Test with 2 shipments** (one CBM, one box-based) using commands above
2. **Compare the numbers** - which makes more business sense?
3. **Choose Strategy B (Hybrid)** - flexible for all customer types
4. **Let me implement:**
   - ✅ Auto-CBM calculation (5 min fix)
   - ✅ Global CBM rate in billing settings (15 min fix)
   - ⚠️ Auto-invoicing (optional, later)

---

## 🚀 NEXT STEP - TELL ME:

1. **"Test it first"** - I'll help you run the API tests above
2. **"Add auto-CBM calculation"** - I'll implement backend auto-calculation
3. **"Add global CBM rate"** - I'll add company-wide CBM pricing to settings
4. **"Explain pricing again"** - I'll clarify specific confusion points

**What do you want to do?**
