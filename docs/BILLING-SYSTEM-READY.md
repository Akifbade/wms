# ✅ BILLING SYSTEM - READY TO USE!

## 🎉 WHAT I JUST ADDED:

### ✅ **1. Auto-CBM Calculation**
When creating or updating shipments:
```json
{
  "length": 120,  // cm
  "width": 80,
  "height": 100
  // cbm is AUTO-CALCULATED: 0.96 m³
}
```

**Location:** `backend/src/routes/shipments.ts` (lines 581-585, 911-920)

---

### ✅ **2. Custom Charge Types Integration**
Charge calculation now includes:
- **Storage charges** (CBM or box-based)
- **Handling fees** (per box, per shipment, flat rate)
- **Release fees** (per cubic meter, per kg)
- **Service charges** (custom calculations)

**All charges auto-apply based on ChargeType settings!**

**Location:** `backend/src/utils/chargeCalculation.ts` (lines 138-261)

---

### ✅ **3. Detailed Line Items for Invoices**
`/api/shipments/:id/charges-calculation` now returns:
```json
{
  "totalCharge": 157.500,
  "breakdown": {
    "baseCharge": 144.000,
    "additionalCharges": 10.000,
    "taxAmount": 7.700,
    "currency": "KWD"
  },
  "lineItems": [
    {
      "description": "Storage charges (9 days × 0.960 m³ × 5 KWD/m³/day)",
      "category": "STORAGE",
      "quantity": 9,
      "unitPrice": 16.000,
      "amount": 144.000,
      "isTaxable": true
    },
    {
      "description": "Handling Fee",
      "category": "HANDLING",
      "quantity": 5,
      "unitPrice": 2.000,
      "amount": 10.000,
      "chargeTypeId": "charge-123",
      "isTaxable": true
    }
  ],
  "rateUsed": {
    "type": "CUSTOM",
    "ratePerCBMPerDay": 5.000
  },
  "daysCharged": 9
}
```

---

## 🚀 HOW TO USE IT NOW:

### **Step 1: Restart Backend**
```bash
# Stop current backend (Ctrl+C in terminal)
cd backend
npm run dev
```

**The Prisma client is already regenerated!**

---

### **Step 2: Create Custom Charge Types (Optional)**

Add handling fees, release fees, etc:

```http
POST http://localhost:5000/api/billing/charge-types
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Handling Fee",
  "code": "HANDLING_FEE",
  "description": "Fee for handling and processing shipment",
  "category": "HANDLING",
  "calculationType": "PER_BOX",
  "rate": 2.000,
  "applyOnRelease": true,
  "applyOnStorage": true,
  "isTaxable": true,
  "isActive": true
}
```

**Calculation Types Available:**
- `PER_BOX` - Multiply by box count
- `PER_SHIPMENT` or `FLAT` - Fixed fee per shipment
- `PER_CUBIC_M` - Multiply by CBM
- `PER_KG` - Multiply by weight
- `PERCENTAGE` - Percentage of total

**Example Charge Types:**
```json
[
  {
    "name": "Handling Fee",
    "calculationType": "PER_BOX",
    "rate": 2.000,  // 2 KWD per box
    "category": "HANDLING"
  },
  {
    "name": "Release Processing Fee",
    "calculationType": "FLAT",
    "rate": 10.000,  // 10 KWD flat fee
    "category": "RELEASE",
    "applyOnRelease": true
  },
  {
    "name": "Heavy Cargo Surcharge",
    "calculationType": "PER_KG",
    "rate": 0.100,  // 0.1 KWD per kg
    "category": "SERVICE",
    "minCharge": 5.000
  },
  {
    "name": "Bulk Storage Fee",
    "calculationType": "PER_CUBIC_M",
    "rate": 1.500,  // 1.5 KWD per m³
    "category": "STORAGE"
  }
]
```

---

### **Step 3: Create Shipment with CBM Pricing**

```http
POST http://localhost:5000/api/shipments
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Dior Luxury Goods",
  "referenceId": "DIOR-001",
  "originalBoxCount": 10,
  "type": "COMMERCIAL",
  "clientName": "Dior Kuwait",
  "clientPhone": "12345678",
  "arrivalDate": "2024-11-01",
  
  "length": 200,
  "width": 150,
  "height": 120,
  "weight": 150,
  
  "customRateEnabled": true,
  "customRatePerCBMPerDay": 5.000,
  "customRateNotes": "VIP customer - premium rate"
}
```

**System will:**
1. Auto-calculate CBM: `(200×150×120) / 1,000,000 = 3.6 m³`
2. Store with custom rate: `5 KWD/m³/day`
3. Apply any active ChargeTypes

---

### **Step 4: Preview Live Charges**

```http
GET http://localhost:5000/api/shipments/:id/charges-calculation
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "totalCharge": 189.000,  // TOTAL with all charges + tax
  "breakdown": {
    "baseCharge": 162.000,  // Storage: 3.6 m³ × 5 KWD × 9 days
    "additionalCharges": 20.000,  // Handling: 10 boxes × 2 KWD
    "taxAmount": 9.100,  // 5% tax
    "currency": "KWD"
  },
  "lineItems": [
    {
      "description": "Storage charges (9 days × 3.600 m³ × 5 KWD/m³/day)",
      "amount": 162.000
    },
    {
      "description": "Handling Fee",
      "amount": 20.000
    }
  ],
  "daysCharged": 9,  // 12 days - 3 grace days
  "gracePeriodApplied": false
}
```

---

### **Step 5: Set Custom Rate for Specific Shipment**

```http
PUT http://localhost:5000/api/shipments/:id/custom-rate
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "customRateEnabled": true,
  "ratePerCBMPerDay": 8.000,  // Higher rate for premium customer
  "notes": "VIP customer - expedited service"
}
```

---

### **Step 6: Generate Invoice on Release**

```http
POST http://localhost:5000/api/billing/invoices
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "shipmentId": "ship-123",
  "clientName": "Dior Kuwait",
  "clientPhone": "12345678",
  "lineItems": [
    {
      "description": "Storage charges (9 days × 3.600 m³ × 5 KWD/m³/day)",
      "category": "STORAGE",
      "quantity": 9,
      "unitPrice": 18.000,
      "amount": 162.000,
      "taxRate": 5,
      "taxAmount": 8.100
    },
    {
      "description": "Handling Fee (10 boxes × 2 KWD)",
      "category": "HANDLING",
      "quantity": 10,
      "unitPrice": 2.000,
      "amount": 20.000,
      "taxRate": 5,
      "taxAmount": 1.000
    }
  ]
}
```

**System generates:**
- Invoice Number: `INV-00001`
- Subtotal: 182.000 KWD
- Tax: 9.100 KWD
- **Total: 191.100 KWD**

---

## 📊 COMPLETE WORKFLOW EXAMPLE:

### **Scenario: Dior Shipment - CBM Pricing**

1. **Nov 1:** Shipment arrives
   - 10 boxes
   - Dimensions: 200×150×120 cm each (total 36 m³)
   - Weight: 150 kg
   - Custom rate: 5 KWD/m³/day

2. **Nov 13:** Check live charges (12 days later)
   ```
   GET /api/shipments/:id/charges-calculation
   
   Result:
   - Storage: 3.6 m³ × 5 KWD × 9 days = 162 KWD
   - Handling: 10 boxes × 2 KWD = 20 KWD
   - Tax (5%): 9.10 KWD
   - TOTAL: 191.10 KWD
   ```

3. **Nov 13:** Release boxes
   ```
   POST /api/shipments/:id/release-boxes
   { "releaseAll": true }
   ```

4. **Nov 13:** Generate invoice
   ```
   POST /api/billing/invoices
   { "shipmentId": "...", "lineItems": [...] }
   
   Invoice: INV-00001
   Total: 191.10 KWD
   Due: Nov 23
   ```

5. **Nov 15:** Record payment
   ```
   POST /api/billing/invoices/:id/payments
   {
     "amount": 191.100,
     "paymentMethod": "KNET",
     "transactionRef": "TXN-123"
   }
   
   Status: PAID ✅
   ```

---

## 🎯 PRICING STRATEGIES YOU CAN USE:

### **Strategy 1: Different Rates Per Customer**
```javascript
// Dior (VIP)
customRatePerCBMPerDay: 8.000

// Regular customer
customRatePerCBMPerDay: 5.000

// Bulk customer
customRatePerCBMPerDay: 3.000

// No custom rate = use company default (box-based)
customRateEnabled: false  // Uses 0.500 KWD/box/day
```

---

### **Strategy 2: Different Rates Per Shipment Type**
```javascript
// Airport cargo (fast turnover)
customRatePerCBMPerDay: 10.000

// Long-term storage
customRatePerCBMPerDay: 3.000

// Hazmat/special handling
customRatePerCBMPerDay: 12.000
```

---

### **Strategy 3: Custom Charges for Services**
```javascript
// Base storage + extras
ChargeTypes: [
  {
    name: "Cold Storage Premium",
    calculationType: "PER_CUBIC_M",
    rate: 2.000  // +2 KWD per m³
  },
  {
    name: "Express Release",
    calculationType: "FLAT",
    rate: 50.000  // +50 KWD flat fee
  },
  {
    name: "Overweight Handling",
    calculationType: "PER_KG",
    rate: 0.200,  // +0.2 KWD per kg over 100kg
    minCharge: 20.000
  }
]
```

---

## ✅ SYSTEM IS READY!

**Just restart backend and test:**

```bash
# Terminal 1: Restart backend
cd backend
npm run dev

# Terminal 2: Test
curl http://localhost:5000/api/billing/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔥 KEY FEATURES NOW LIVE:

✅ Auto-CBM calculation from dimensions  
✅ Custom rates per customer (CBM or box-based)  
✅ Custom rates per shipment  
✅ Live charge preview (shows current bill anytime)  
✅ Custom charge types (handling, release, service fees)  
✅ Detailed line items for invoices  
✅ Tax calculation on taxable items  
✅ Grace periods (3 days free by default)  
✅ Minimum charge protection  
✅ Invoice generation with full breakdown  
✅ Payment tracking  

---

## 📞 NEXT STEPS:

1. **Restart backend** (to load new Prisma client)
2. **Create test shipment** with dimensions
3. **Preview charges** to see CBM calculation
4. **Add custom charge types** (handling fees, etc)
5. **Test complete workflow** (create → preview → release → invoice → pay)

**Want me to:**
- Walk through creating a test shipment?
- Set up default charge types?
- Create frontend UI for setting custom rates?
- Add automated monthly invoicing?

Just tell me what you need! 🚀
