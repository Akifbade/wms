# 🧾 Warehouse Billing & Invoicing System Plan

## 📌 Requirements Analysis

### User Need:
- Charge customers for storing shipments in warehouse
- Calculate charges based on storage duration
- Handle full release and partial release scenarios
- Configurable rate settings
- Generate proper invoices
- Track payment status

---

## 🎯 Core Features to Implement

### 1. **Storage Charge Calculation**

#### A. Storage Rate Types:
- **Per Day Rate** - Charge per box per day (e.g., 0.500 KWD/box/day)
- **Per Week Rate** - Weekly package pricing
- **Per Month Rate** - Monthly subscription pricing
- **Flat Rate** - One-time storage fee

#### B. Charge Calculation Logic:
```
Total Storage Charge = (Number of Boxes × Rate Per Box × Days Stored)

Example:
- Client stores 20 boxes
- Rate: 0.500 KWD per box per day
- Stored for 15 days
- Total: 20 × 0.500 × 15 = 150.000 KWD
```

#### C. Partial Release Calculation:
```
When releasing 10 out of 20 boxes:
- Released boxes: 10 boxes × 0.500 × 15 days = 75.000 KWD
- Remaining boxes: 10 boxes continue accumulating charges
```

---

### 2. **Release Charges**

#### A. Release Fee Types:
- **Handling Fee** - Per box handling charge (e.g., 2.000 KWD/box)
- **Documentation Fee** - Flat fee per release (e.g., 5.000 KWD)
- **Inspection Fee** - Quality check fee (optional)
- **Rush Release Fee** - Extra charge for urgent releases

#### B. Calculation:
```
Release Charge = (Boxes Released × Handling Fee) + Documentation Fee

Example:
- Releasing 10 boxes
- Handling Fee: 2.000 KWD per box
- Documentation: 5.000 KWD
- Total: (10 × 2.000) + 5.000 = 25.000 KWD
```

---

### 3. **Invoice Generation**

#### A. Invoice Types:
- **Storage Invoice** - Generated when shipment is released
- **Partial Release Invoice** - Generated for partial releases
- **Periodic Invoice** - Monthly billing for long-term storage
- **Proforma Invoice** - Advance estimate before release

#### B. Invoice Details:
```
INVOICE #INV-2025-0001
Date: Oct 12, 2025
Due Date: Oct 22, 2025

Client: Mohammed Al-Rashid
Shipment ID: SH-2024-1001

LINE ITEMS:
1. Storage Charges (15 boxes × 15 days × 0.500 KWD)    112.500 KWD
2. Handling Fee (15 boxes × 2.000 KWD)                  30.000 KWD
3. Documentation Fee                                     5.000 KWD
                                                    ---------------
Subtotal:                                              147.500 KWD
VAT (5%):                                                7.375 KWD
                                                    ---------------
TOTAL DUE:                                             154.875 KWD

Payment Status: PENDING
Payment Due: Oct 22, 2025
```

---

## 🗄️ Database Schema Changes Needed

### New Tables Required:

#### 1. **BillingSettings** (Company-level configuration)
```prisma
model BillingSettings {
  id                    String   @id @default(cuid())
  companyId             String   @unique
  
  // Storage Rates
  storageRateType       String   @default("PER_DAY") // PER_DAY, PER_WEEK, PER_MONTH, FLAT
  storageRatePerBox     Float    @default(0.500)
  storageRatePerWeek    Float?
  storageRatePerMonth   Float?
  
  // Tax & Currency
  taxEnabled            Boolean  @default(true)
  taxRate               Float    @default(5.0)    // 5% VAT
  currency              String   @default("KWD")
  
  // Invoice Settings
  invoicePrefix         String   @default("INV")
  invoiceDueDays        Int      @default(10)     // Payment due in 10 days
  
  // Grace Periods
  gracePeriodDays       Int      @default(3)      // Free storage for first 3 days
  minimumCharge         Float    @default(10.0)   // Minimum invoice amount
  
  // Invoice Customization ⭐ NEW
  logoUrl               String?  // Company logo for invoice
  logoPosition          String   @default("LEFT") // LEFT, CENTER, RIGHT
  primaryColor          String   @default("#2563eb") // Brand color
  secondaryColor        String   @default("#64748b")
  showCompanyDetails    Boolean  @default(true)
  showBankDetails       Boolean  @default(true)
  showTermsConditions   Boolean  @default(true)
  
  // Bank Details for Invoice
  bankName              String?
  accountNumber         String?
  accountName           String?
  iban                  String?
  swiftCode             String?
  
  // Terms & Conditions
  invoiceFooterText     String?  // Footer message
  termsAndConditions    String?  // Default T&C text
  paymentInstructions   String?  // Payment instructions
  
  // Additional Fields
  taxRegistrationNo     String?  // VAT/Tax registration number
  companyRegistrationNo String?  // Company registration number
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  company               Company  @relation(fields: [companyId], references: [id])
  chargeTypes           ChargeType[]
}
```

#### 2. **ChargeType** (Custom charge definitions - FULLY CUSTOMIZABLE!)
```prisma
model ChargeType {
  id                    String   @id @default(cuid())
  companyId             String
  billingSettingsId     String
  
  // Charge Details
  name                  String   // "Handling Fee", "Insurance", "Packaging", "Loading", etc.
  code                  String   // "HANDLING", "INSURANCE", "PACKAGING"
  description           String?
  category              String   // "STORAGE", "RELEASE", "SERVICE", "OTHER"
  
  // Calculation Method
  calculationType       String   // "PER_BOX", "PER_SHIPMENT", "PERCENTAGE", "FLAT", "PER_DAY", "PER_KG"
  rate                  Float    // Base rate/amount
  
  // Advanced Options
  minCharge             Float?   // Minimum charge if calculated amount is too low
  maxCharge             Float?   // Maximum cap on charge
  applyOnRelease        Boolean  @default(true)   // Auto-apply on release
  applyOnStorage        Boolean  @default(false)  // Auto-apply during storage
  isTaxable             Boolean  @default(true)   // Subject to tax
  isActive              Boolean  @default(true)   // Can be disabled
  isDefault             Boolean  @default(false)  // Auto-selected by default
  
  // Display
  displayOrder          Int      @default(0)      // Order in lists
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  company               Company        @relation(fields: [companyId], references: [id])
  billingSettings       BillingSettings @relation(fields: [billingSettingsId], references: [id])
  
  @@unique([companyId, code])
  @@map("charge_types")
}
```

#### 3. **Invoice** (Invoice records)
```prisma
model Invoice {
  id                    String   @id @default(cuid())
  invoiceNumber         String   @unique          // INV-2025-0001
  companyId             String
  shipmentId            String
  clientId              String?
  
  // Invoice Details
  invoiceDate           DateTime @default(now())
  dueDate               DateTime
  invoiceType           String   @default("STORAGE") // STORAGE, PARTIAL, PERIODIC
  
  // Amounts
  subtotal              Float    // Sum of all line items
  taxAmount             Float    // Calculated tax
  discountAmount        Float    @default(0)
  totalAmount           Float    // Final amount to pay
  
  // Payment Info
  paymentStatus         String   @default("PENDING") // PENDING, PAID, PARTIAL, OVERDUE, CANCELLED
  paidAmount            Float    @default(0)
  balanceDue            Float    // Remaining amount
  paymentDate           DateTime?
  paymentMethod         String?  // CASH, CARD, BANK_TRANSFER, KNET
  transactionRef        String?
  
  // Additional Info
  notes                 String?
  termsAndConditions    String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  company               Company       @relation(fields: [companyId], references: [id])
  shipment              Shipment      @relation(fields: [shipmentId], references: [id])
  lineItems             InvoiceLineItem[]
  payments              Payment[]
}
```

#### 4. **InvoiceLineItem** (Individual charges on invoice - FULLY FLEXIBLE!)
```prisma
model InvoiceLineItem {
  id                    String   @id @default(cuid())
  invoiceId             String
  companyId             String
  
  // Line Item Details
  chargeTypeId          String?  // Link to ChargeType (if using predefined)
  description           String   // "Storage Charges - 15 boxes × 10 days"
  category              String   // "STORAGE", "RELEASE", "SERVICE", "OTHER"
  
  // Calculation Details
  quantity              Float    @default(1)      // e.g., 15 boxes, 10 days
  unitPrice             Float                     // Rate per unit
  amount                Float                     // quantity × unitPrice
  
  // Tax
  isTaxable             Boolean  @default(true)
  taxRate               Float?                    // Can override invoice tax rate
  taxAmount             Float    @default(0)
  
  // Display
  displayOrder          Int      @default(0)
  
  createdAt             DateTime @default(now())
  
  // Relations
  invoice               Invoice  @relation(fields: [invoiceId], references: [id])
  company               Company  @relation(fields: [companyId], references: [id])
  
  @@map("invoice_line_items")
}
```

#### 5. **Payment** (Payment tracking)
```prisma
model Payment {
  id                    String   @id @default(cuid())
  invoiceId             String
  companyId             String
  
  amount                Float
  paymentDate           DateTime @default(now())
  paymentMethod         String   // CASH, CARD, BANK_TRANSFER, KNET
  transactionRef        String?
  receiptNumber         String?
  
  notes                 String?
  createdBy             String?
  
  createdAt             DateTime @default(now())
  
  // Relations
  invoice               Invoice  @relation(fields: [invoiceId], references: [id])
  company               Company  @relation(fields: [companyId], references: [id])
}
```

#### 6. **ShipmentCharges** (Track running charges)
```prisma
model ShipmentCharges {
  id                    String   @id @default(cuid())
  shipmentId            String   @unique
  companyId             String
  
  // Current Charges
  currentStorageCharge  Float    @default(0)
  daysStored            Int      @default(0)
  lastCalculatedDate    DateTime @default(now())
  
  // Released Items Tracking
  totalBoxesReleased    Int      @default(0)
  totalInvoiced         Float    @default(0)
  totalPaid             Float    @default(0)
  outstandingBalance    Float    @default(0)
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // Relations
  shipment              Shipment @relation(fields: [shipmentId], references: [id])
  company               Company  @relation(fields: [companyId], references: [id])
}
```

---

## �️ FULLY CUSTOMIZABLE CHARGE SYSTEM

### How It Works:

#### 1. **Predefined Charge Types** (You create these)
You can add unlimited charge types with any calculation method:

```javascript
// Example Charge Types You Can Create:

1. Storage Charges
   - Name: "Storage Fee"
   - Calculation: PER_BOX per PER_DAY
   - Rate: 0.500 KWD
   - Category: STORAGE
   - Auto-apply: Yes

2. Handling Fee
   - Name: "Box Handling"
   - Calculation: PER_BOX
   - Rate: 2.000 KWD
   - Category: RELEASE
   - Auto-apply: Yes

3. Documentation Fee
   - Name: "Documentation & Paperwork"
   - Calculation: FLAT (per shipment)
   - Rate: 5.000 KWD
   - Category: RELEASE
   - Auto-apply: Yes

4. Insurance Fee
   - Name: "Shipment Insurance"
   - Calculation: PERCENTAGE (of total value)
   - Rate: 2.5% (enter as 2.5)
   - Category: SERVICE
   - Auto-apply: Optional

5. Loading/Unloading
   - Name: "Loading Service"
   - Calculation: PER_BOX
   - Rate: 1.500 KWD
   - Min Charge: 20.000 KWD
   - Category: SERVICE
   - Auto-apply: No (manual selection)

6. Packaging Materials
   - Name: "Bubble Wrap & Boxes"
   - Calculation: FLAT
   - Rate: 15.000 KWD
   - Category: SERVICE
   - Auto-apply: No

7. Rush Release Fee
   - Name: "Emergency Release (Same Day)"
   - Calculation: PERCENTAGE
   - Rate: 20% (of subtotal)
   - Category: SERVICE
   - Auto-apply: No

8. Weight-Based Charge
   - Name: "Heavy Item Surcharge"
   - Calculation: PER_KG
   - Rate: 0.100 KWD per kg
   - Category: SERVICE
   - Auto-apply: No

9. Refrigerated Storage
   - Name: "Cold Storage Premium"
   - Calculation: PER_BOX per PER_DAY
   - Rate: 1.500 KWD
   - Category: STORAGE
   - Auto-apply: No

10. Security Seal
    - Name: "Tamper-Proof Seal"
    - Calculation: PER_BOX
    - Rate: 0.500 KWD
    - Category: SERVICE
    - Auto-apply: No
```

#### 2. **Calculation Types Available:**

```typescript
enum CalculationType {
  PER_BOX        // Charge per box (e.g., 2.000 KWD × 15 boxes)
  PER_SHIPMENT   // Flat fee per shipment (e.g., 5.000 KWD)
  PERCENTAGE     // Percentage of subtotal (e.g., 10% of total)
  FLAT           // Fixed amount (same as PER_SHIPMENT)
  PER_DAY        // Daily rate (e.g., 0.500 KWD per day)
  PER_KG         // Per kilogram (e.g., 0.100 KWD per kg)
  PER_HOUR       // Hourly rate (e.g., for labor)
  PER_CUBIC_M    // Per cubic meter (for volume-based)
}
```

#### 3. **Real-World Usage Example:**

When releasing a shipment:

```
Shipment: SH-2024-1001
Client: Mohammed Al-Rashid
Boxes: 15
Weight: 120 kg
Days Stored: 10
Shipment Value: 5,000 KWD

AUTO-APPLIED CHARGES:
─────────────────────────────────────────────
1. Storage Fee (PER_BOX × PER_DAY)
   15 boxes × 10 days × 0.500 KWD          75.000 KWD

2. Box Handling (PER_BOX)
   15 boxes × 2.000 KWD                    30.000 KWD

3. Documentation (FLAT)
   1 × 5.000 KWD                            5.000 KWD

OPTIONAL CHARGES (User can select):
─────────────────────────────────────────────
☐ Insurance (PERCENTAGE)
   5,000 KWD × 2.5%                       125.000 KWD

☐ Loading Service (PER_BOX, min 20 KWD)
   15 boxes × 1.500 KWD                    22.500 KWD

☐ Packaging Materials (FLAT)
   1 × 15.000 KWD                          15.000 KWD

☐ Heavy Item Surcharge (PER_KG)
   120 kg × 0.100 KWD                      12.000 KWD

☐ Rush Release (PERCENTAGE of subtotal)
   110.000 × 20%                           22.000 KWD

CUSTOM CHARGE (Add your own):
─────────────────────────────────────────────
+ Add Custom Charge...

Total Selected Charges:                   110.000 KWD
Tax (5%):                                   5.500 KWD
─────────────────────────────────────────────
TOTAL DUE:                                115.500 KWD
```

---

## �🎨 UI Pages to Build

### 1. **Billing Settings Page** (`/settings/billing`)

#### Tab 1: General Settings
- Storage rate type (per day/week/month)
- Base storage rate
- Tax rate configuration
- Invoice prefix & due days
- Grace period settings
- Minimum charge amount

#### Tab 2: Invoice Customization ⭐ **NEW - FULLY CUSTOMIZABLE DESIGN**
```
┌─────────────────────────────────────────────────────────────┐
│ Invoice Appearance                                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Company Logo                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [📷 Upload Logo]  or  [🔗 Enter Logo URL]             │ │
│ │                                                          │ │
│ │  Current: [company-logo.png]              [X Remove]   │ │
│ │  ┌──────────────┐                                       │ │
│ │  │  [Your Logo] │  Preview                             │ │
│ │  └──────────────┘                                       │ │
│ │                                                          │ │
│ │  Logo Position: ⦿ Left  ○ Center  ○ Right              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Brand Colors                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Primary Color:   [#2563eb ▼] [████]  Header & Accents  │ │
│ │ Secondary Color: [#64748b ▼] [████]  Text & Borders    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Company Information Display                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Show company details on invoice                       │ │
│ │ ☑ Show bank details section                             │ │
│ │ ☑ Show terms & conditions                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Registration Numbers                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tax Registration No (VAT):                              │ │
│ │ [_____________________________]                         │ │
│ │                                                          │ │
│ │ Company Registration No:                                │ │
│ │ [_____________________________]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│                                      [Save Settings]         │
└─────────────────────────────────────────────────────────────┘
```

#### Tab 3: Bank Details
```
┌─────────────────────────────────────────────────────────────┐
│ Bank Account Information (For Invoice)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Bank Name:                                                   │
│ [_____________________________]                              │
│                                                               │
│ Account Name:                                                │
│ [_____________________________]                              │
│                                                               │
│ Account Number:                                              │
│ [_____________________________]                              │
│                                                               │
│ IBAN:                                                        │
│ [_____________________________]                              │
│                                                               │
│ SWIFT/BIC Code:                                              │
│ [_____________________________]                              │
│                                                               │
│                                      [Save Bank Details]     │
└─────────────────────────────────────────────────────────────┘
```

#### Tab 4: Terms & Conditions
```
┌─────────────────────────────────────────────────────────────┐
│ Invoice Footer & Terms                                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Invoice Footer Text (appears at bottom):                     │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Thank you for your business!                           │  │
│ │ For any queries, contact us at info@warehouse.com     │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                               │
│ Payment Instructions:                                        │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ - Payment due within 10 days                          │  │
│ │ - Bank transfer preferred                             │  │
│ │ - Cash/Card accepted at office                        │  │
│ │ - Late payments incur 5% penalty                      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                               │
│ Terms & Conditions (Full text):                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 1. All storage rates are in KWD                       │  │
│ │ 2. Charges calculated from arrival date               │  │
│ │ 3. Grace period: First 3 days free                    │  │
│ │ 4. Items must be released within 90 days              │  │
│ │ 5. Company not liable for damaged goods               │  │
│ │ 6. Insurance recommended for valuable items           │  │
│ │ 7. All disputes subject to Kuwait jurisdiction        │  │
│ │                                                        │  │
│ │ [Load Default Terms]                                  │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                               │
│                                      [Save Terms]            │
└─────────────────────────────────────────────────────────────┘
```

#### Tab 5: Charge Types Management ⭐ **NEW - FULLY CUSTOMIZABLE**
```
┌─────────────────────────────────────────────────────────┐
│ Charge Types                          [+ Add New Charge]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│ STORAGE CHARGES                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ ✓ Storage Fee                           [Edit] [X]│  │
│ │   PER_BOX × PER_DAY • 0.500 KWD                   │  │
│ │   Auto-apply on Storage • Taxable                 │  │
│ └───────────────────────────────────────────────────┘  │
│                                                           │
│ RELEASE CHARGES                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ ✓ Box Handling                          [Edit] [X]│  │
│ │   PER_BOX • 2.000 KWD                             │  │
│ │   Auto-apply on Release • Taxable                 │  │
│ └───────────────────────────────────────────────────┘  │
│                                                           │
│ ┌───────────────────────────────────────────────────┐  │
│ │ ✓ Documentation Fee                     [Edit] [X]│  │
│ │   FLAT • 5.000 KWD                                │  │
│ │   Auto-apply on Release • Taxable                 │  │
│ └───────────────────────────────────────────────────┘  │
│                                                           │
│ SERVICE CHARGES                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ ✓ Insurance Fee                         [Edit] [X]│  │
│ │   PERCENTAGE • 2.5%                               │  │
│ │   Optional • Taxable                              │  │
│ └───────────────────────────────────────────────────┘  │
│                                                           │
│ ┌───────────────────────────────────────────────────┐  │
│ │ □ Loading Service (Disabled)            [Edit] [X]│  │
│ │   PER_BOX • 1.500 KWD • Min: 20.000 KWD          │  │
│ │   Optional • Taxable                              │  │
│ └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

#### Add/Edit Charge Modal:
```
┌─────────────────────────────────────────┐
│ Add New Charge Type                  [X]│
├─────────────────────────────────────────┤
│ Name: [_____________________________]  │
│       e.g., "Packaging Materials"       │
│                                          │
│ Code: [________]                        │
│       e.g., "PACKAGING"                 │
│                                          │
│ Category: [Release ▼]                   │
│ • Storage  • Release                    │
│ • Service  • Other                      │
│                                          │
│ Calculation Type: [Per Box ▼]          │
│ • Per Box      • Per Shipment           │
│ • Percentage   • Flat Fee               │
│ • Per Day      • Per KG                 │
│ • Per Hour     • Per Cubic Meter        │
│                                          │
│ Rate: [___________] KWD                 │
│                                          │
│ Min Charge: [___________] KWD (opt)     │
│ Max Charge: [___________] KWD (opt)     │
│                                          │
│ ☑ Apply automatically on release       │
│ ☐ Apply automatically during storage   │
│ ☑ Subject to tax                        │
│ ☑ Active                                │
│ ☐ Default selection                     │
│                                          │
│ Description (optional):                 │
│ [_____________________________________] │
│                                          │
│         [Cancel]  [Save Charge Type]   │
└─────────────────────────────────────────┘
```

### 2. **Release Shipment Page** (`/shipments/:id/release`) ⭐ **WITH CUSTOMIZABLE CHARGES**

```
┌──────────────────────────────────────────────────────────────┐
│ Release Shipment: SH-2024-1001                            [X]│
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Client: Mohammed Al-Rashid                                   │
│ Original Boxes: 20 boxes                                     │
│ Current Boxes: 20 boxes                                      │
│ Stored Since: Sep 27, 2025 (15 days)                        │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Release Type                                             │ │
│ │ ⦿ Full Release (all 20 boxes)                           │ │
│ │ ○ Partial Release [__] boxes                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 AUTOMATIC CHARGES (Always Applied)                   │ │
│ │                                                          │ │
│ │ ✓ Storage Fee                                           │ │
│ │   20 boxes × 15 days × 0.500 KWD      150.000 KWD      │ │
│ │                                                          │ │
│ │ ✓ Box Handling                                          │ │
│ │   20 boxes × 2.000 KWD                 40.000 KWD       │ │
│ │                                                          │ │
│ │ ✓ Documentation Fee                                     │ │
│ │   1 × 5.000 KWD                         5.000 KWD       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎛️ OPTIONAL CHARGES (Select if needed)                  │ │
│ │                                                          │ │
│ │ ☑ Insurance Fee                                         │ │
│ │   5,000 KWD × 2.5%                    125.000 KWD       │ │
│ │                                                          │ │
│ │ ☑ Loading Service                                       │ │
│ │   20 boxes × 1.500 KWD                 30.000 KWD       │ │
│ │                                                          │ │
│ │ ☐ Packaging Materials                                   │ │
│ │   1 × 15.000 KWD                       15.000 KWD       │ │
│ │                                                          │ │
│ │ ☐ Heavy Item Surcharge                                  │ │
│ │   120 kg × 0.100 KWD                   12.000 KWD       │ │
│ │                                                          │ │
│ │ ☐ Rush Release Fee                                      │ │
│ │   Subtotal × 20%                       78.000 KWD       │ │
│ │                                                          │ │
│ │ ☐ Cold Storage Premium (if applicable)                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ➕ CUSTOM CHARGES                                        │ │
│ │                                                          │ │
│ │ [+ Add Custom Charge]                                   │ │
│ │                                                          │ │
│ │ (No custom charges added)                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💰 INVOICE PREVIEW                                       │ │
│ │                                                          │ │
│ │ Subtotal:                              350.000 KWD      │ │
│ │ Discount:                                0.000 KWD      │ │
│ │ Tax (5%):                               17.500 KWD      │ │
│ │ ─────────────────────────────────────────────────       │ │
│ │ TOTAL DUE:                             367.500 KWD      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ Notes (optional):                                            │
│ [___________________________________________________________] │
│                                                               │
│        [Cancel]  [Generate Invoice & Release Shipment]      │
└──────────────────────────────────────────────────────────────┘
```

**Add Custom Charge Modal:**
```
┌─────────────────────────────────────┐
│ Add Custom Charge                [X]│
├─────────────────────────────────────┤
│ Description:                        │
│ [_________________________________] │
│                                      │
│ Amount: [___________] KWD           │
│                                      │
│ ☑ Taxable                           │
│                                      │
│     [Cancel]  [Add to Invoice]     │
└─────────────────────────────────────┘
```

### 3. **Invoices List Page** (`/invoices`)
- List all invoices (pending, paid, overdue)
- Filter by status, date, client
- Search by invoice number
- Quick actions (view, download PDF, mark paid)
- Outstanding amount summary

### 4. **Invoice Detail Page** (`/invoices/:id`) ⭐ **CUSTOMIZABLE DESIGN**

```
┌────────────────────────────────────────────────────────────────────┐
│                                                  [✉️ Email] [📄 PDF]│
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                                                  │
│  │  [Your Logo] │             INVOICE                              │
│  └──────────────┘                                                  │
│                                                                     │
│  Demo Warehouse Co.                    Invoice #: INV-2025-0001    │
│  Kuwait City, Kuwait                   Date: Oct 12, 2025          │
│  +965 1234 5678                        Due Date: Oct 22, 2025      │
│  admin@demowarehouse.com               Status: PENDING             │
│  Tax Reg: 123456789                                                │
│  ──────────────────────────────────────────────────────────────   │
│                                                                     │
│  BILL TO:                              SHIPMENT DETAILS:           │
│  Mohammed Al-Rashid                    Shipment: SH-2024-1001      │
│  +965 6666 1111                        Boxes: 20                   │
│  Salmiya, Kuwait                       Rack: A1-1                  │
│                                        Received: Sep 27, 2025      │
│                                        Released: Oct 12, 2025      │
│                                        Days Stored: 15 days        │
│  ──────────────────────────────────────────────────────────────   │
│                                                                     │
│  DESCRIPTION                       QTY    RATE        AMOUNT       │
│  ───────────────────────────────────────────────────────────────  │
│  Storage Fee                                                       │
│  (20 boxes × 15 days × 0.500 KWD)  300   0.500 KWD   150.000 KWD │
│                                                                     │
│  Box Handling Fee                   20   2.000 KWD    40.000 KWD  │
│                                                                     │
│  Documentation Fee                   1   5.000 KWD     5.000 KWD  │
│                                                                     │
│  Insurance (Optional)                1   125.000 KWD 125.000 KWD  │
│                                                                     │
│  Loading Service                    20   1.500 KWD    30.000 KWD  │
│  ───────────────────────────────────────────────────────────────  │
│                                                                     │
│                                            SUBTOTAL:  350.000 KWD  │
│                                            TAX (5%):   17.500 KWD  │
│                                         ─────────────────────────  │
│                                       TOTAL DUE:      367.500 KWD  │
│                                         ─────────────────────────  │
│  ──────────────────────────────────────────────────────────────   │
│                                                                     │
│  BANK DETAILS:                                                     │
│  Bank: National Bank of Kuwait                                     │
│  Account Name: Demo Warehouse Co.                                 │
│  Account Number: 1234567890                                        │
│  IBAN: KW81CBKU0000000000001234567890                             │
│  SWIFT: NBOKKWKW                                                   │
│  ──────────────────────────────────────────────────────────────   │
│                                                                     │
│  PAYMENT INSTRUCTIONS:                                             │
│  - Payment due within 10 days of invoice date                     │
│  - Bank transfer preferred. Use invoice number as reference       │
│  - Cash/Card payments accepted at our office                      │
│  - Late payments subject to 5% penalty fee                        │
│  ──────────────────────────────────────────────────────────────   │
│                                                                     │
│  TERMS & CONDITIONS:                                               │
│  1. All storage rates are in KWD                                  │
│  2. Charges calculated from arrival date minus grace period       │
│  3. Company not liable for damaged goods                          │
│  4. All disputes subject to Kuwait jurisdiction                   │
│  ──────────────────────────────────────────────────────────────   │
│                                                                     │
│  Thank you for your business!                                      │
│  For queries, contact us at info@warehouse.com                    │
│                                                                     │
│  ──────────────────────────────────────────────────────────────   │
│  This is a computer-generated invoice and requires no signature.  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

[← Back to Invoices]  [Record Payment]  [Send Email]  [Download PDF]
```

**Preview with Different Color Schemes:**
```
User can choose from:
- Professional Blue (default)
- Classic Black & White
- Modern Green
- Elegant Purple
- Corporate Gray
- Custom Colors (user-defined)
```

### 5. **Payments Page** (`/payments`)
- Record new payment
- Payment history
- Receipt generation
- Payment methods tracking
- Daily/monthly collection reports

### 6. **Client Billing Dashboard** (Optional - Client Portal)
- View own shipments
- See pending charges
- View invoices
- Make online payments
- Download receipts

---

## 📊 Workflow Implementation

### Scenario 1: Full Release
```
1. User clicks "Release" on shipment
2. System calculates:
   - Days stored = (Today - Arrival Date) - Grace Period
   - Storage charge = Boxes × Days × Rate
   - Handling charge = Boxes × Handling Fee
   - Documentation fee = Fixed Fee
3. Generate invoice
4. Mark shipment as RELEASED
5. Update rack capacity
6. Send invoice to client
```

### Scenario 2: Partial Release
```
1. User selects "Partial Release"
2. User enters number of boxes to release (e.g., 10 of 20)
3. System calculates charges for released boxes only
4. Generate invoice for partial release
5. Update shipment: currentBoxCount = 20 - 10 = 10
6. Remaining boxes continue accumulating charges
7. Update rack capacity
```

### Scenario 3: Periodic Billing (Long-term Storage)
```
1. Automated monthly job runs
2. For each active shipment > 30 days:
   - Calculate charges for past month
   - Generate periodic invoice
   - Reset charge counter
   - Send invoice to client
3. Continue tracking new charges
```

---

## 🔧 API Endpoints Needed

### Billing Settings
- `GET /api/billing/settings` - Get company billing config
- `PUT /api/billing/settings` - Update billing config
- `POST /api/billing/settings/upload-logo` - Upload company logo ⭐ **NEW**
- `GET /api/billing/settings/preview-invoice` - Preview invoice template ⭐ **NEW**

### Charge Types Management ⭐ **NEW**
- `GET /api/charge-types` - List all charge types
- `GET /api/charge-types/:id` - Get single charge type
- `POST /api/charge-types` - Create new charge type
- `PUT /api/charge-types/:id` - Update charge type
- `DELETE /api/charge-types/:id` - Delete charge type
- `GET /api/charge-types/active` - Get only active charges
- `GET /api/charge-types/by-category/:category` - Get by category

### Charge Calculation
- `POST /api/shipments/:id/calculate-charges` - Preview charges
- `GET /api/shipments/:id/charges` - Get current charges

### Release & Invoicing
- `POST /api/shipments/:id/release` - Full release + generate invoice
- `POST /api/shipments/:id/partial-release` - Partial release + invoice

### Invoice Management
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices/:id/generate-pdf` - Generate PDF with custom template ⭐
- `POST /api/invoices/:id/email` - Email invoice to client ⭐ **NEW**
- `GET /api/invoices/:id/preview` - Preview before generating ⭐ **NEW**
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Cancel invoice

### Payment Management
- `POST /api/invoices/:id/payment` - Record payment
- `GET /api/payments` - List payments
- `GET /api/payments/:id` - Payment details

---

## 💡 Additional Features

### 1. **Automatic Charge Calculation**
- Daily cron job to calculate storage charges
- Update ShipmentCharges table
- Alert for shipments exceeding threshold

### 2. **Payment Reminders**
- Email reminders for due invoices
- SMS notifications (optional)
- Overdue alerts

### 3. **Reports**
- Daily collection report
- Monthly revenue report
- Client-wise billing summary
- Outstanding receivables report

### 4. **Discounts & Promotions**
- Loyalty discounts
- Volume discounts (e.g., 100+ boxes = 10% off)
- Promotional codes

### 5. **Multi-currency Support**
- Support KWD, USD, EUR
- Automatic conversion
- Exchange rate management

### 6. **Invoice Customization Features** ⭐ **NEW**
- **Logo Upload** - Company logo on every invoice
- **Color Themes** - Match your brand colors
- **Custom Fields** - Add extra fields to invoice
- **Multiple Templates** - Professional, Modern, Classic layouts
- **Multilingual** - Arabic + English invoices
- **QR Code** - Payment QR code for easy scanning
- **Digital Signature** - Add authorized signature image
- **Watermarks** - "PAID", "DRAFT", "OVERDUE" stamps
- **Custom Footer** - Your custom message/tagline
- **Letter Head** - Full letter head design support

---

## 📅 Implementation Priority

---

## 🎨 Invoice Template Customization Options

### **Template Styles Available:**

#### 1. **Professional Template** (Default)
```
- Clean header with logo left-aligned
- Company details on left, invoice details on right
- Detailed line items table
- Bank details section
- Terms & conditions footer
- Branded colors throughout
```

#### 2. **Modern Minimalist**
```
- Large centered logo
- Minimal borders
- Bold typography
- Clean spacing
- Perfect for tech/startup companies
```

#### 3. **Classic/Traditional**
```
- Formal letterhead style
- Black & white design
- Traditional layout
- Detailed breakdown
- Suitable for corporate clients
```

#### 4. **Colorful/Creative**
```
- Vibrant header with gradient
- Custom color schemes
- Modern icons
- Eye-catching design
- Great for retail/consumer businesses
```

### **Customizable Elements:**

```javascript
Invoice Customization Options:
{
  // Logo & Branding
  logo: "Upload image or URL",
  logoPosition: "LEFT | CENTER | RIGHT",
  logoSize: "SMALL | MEDIUM | LARGE",
  
  // Colors
  primaryColor: "#2563eb",      // Headers, accents
  secondaryColor: "#64748b",    // Text, borders
  backgroundColor: "#ffffff",   // Page background
  
  // Company Info
  showLogo: true,
  showCompanyDetails: true,
  showTaxNumber: true,
  showRegistrationNumber: true,
  
  // Layout Options
  headerStyle: "CENTERED | LEFT_ALIGNED | SPLIT",
  tableStyle: "BORDERED | STRIPED | MINIMAL",
  
  // Footer Options
  showBankDetails: true,
  showPaymentInstructions: true,
  showTermsConditions: true,
  footerText: "Your custom message",
  
  // Additional Features
  showQRCode: true,             // For payment
  showSignature: true,          // Digital signature
  watermark: "PAID | DRAFT | OVERDUE",
  language: "EN | AR | BOTH",   // Bilingual support
  
  // PDF Settings
  pageSize: "A4 | LETTER",
  orientation: "PORTRAIT | LANDSCAPE"
}
```

### **Invoice Header Examples:**

```
Option 1: Logo Left, Details Right
┌────────────────────────────────────┐
│ [LOGO]              INVOICE        │
│ Company Name      #INV-2025-0001   │
│ Address           Date: Oct 12     │
│ Phone             Due: Oct 22      │
└────────────────────────────────────┘

Option 2: Centered Logo
┌────────────────────────────────────┐
│        [LARGE LOGO]                │
│        Company Name                │
│                                     │
│  INVOICE #INV-2025-0001            │
│  Date: Oct 12, 2025                │
└────────────────────────────────────┘

Option 3: Full Width Header
┌────────────────────────────────────┐
│ ████████████████████████████████   │ ← Colored banner
│ [LOGO]  Company Name    INVOICE    │
│         Tax: 123456789             │
└────────────────────────────────────┘
```

---

## 💡 More Custom Charge Examples You Can Add

```javascript
// Seasonal/Special Charges
{
  name: "Peak Season Surcharge",
  calculationType: "PERCENTAGE",
  rate: 15, // 15% extra during busy season
  category: "STORAGE"
}

// Location-Based
{
  name: "Premium Location Rack",
  calculationType: "PER_BOX",
  rate: 0.200, // Extra for ground floor racks
  category: "STORAGE"
}

// Service Charges
{
  name: "Inventory Count Service",
  calculationType: "PER_HOUR",
  rate: 25.000,
  category: "SERVICE"
}

{
  name: "Photo Documentation",
  calculationType: "PER_BOX",
  rate: 1.000,
  category: "SERVICE"
}

{
  name: "Forklift Usage",
  calculationType: "PER_HOUR",
  rate: 50.000,
  minCharge: 25.000,
  category: "SERVICE"
}

// Penalties
{
  name: "Late Payment Fee",
  calculationType: "PERCENTAGE",
  rate: 5, // 5% of invoice
  category: "OTHER"
}

{
  name: "Overdue Storage (>90 days)",
  calculationType: "PER_DAY",
  rate: 1.000, // Higher rate after 90 days
  category: "STORAGE"
}

// Special Handling
{
  name: "Fragile Item Handling",
  calculationType: "PER_BOX",
  rate: 3.000,
  category: "SERVICE"
}

{
  name: "Hazardous Materials Fee",
  calculationType: "FLAT",
  rate: 100.000,
  category: "SERVICE"
}

// Discounts (negative amounts)
{
  name: "Loyalty Discount",
  calculationType: "PERCENTAGE",
  rate: -10, // Negative for discount
  category: "OTHER"
}

{
  name: "Bulk Storage Discount (100+ boxes)",
  calculationType: "PERCENTAGE",
  rate: -15,
  category: "OTHER"
}
```

---

## 📅 Implementation Priority

### Phase 1 (High Priority):
1. ✅ Add BillingSettings to schema with invoice customization fields ⭐
2. ✅ Add ChargeType model ⭐ **NEW**
3. ✅ Add Invoice model with flexible line items
4. ✅ Add InvoiceLineItem model ⭐ **NEW**
5. ✅ Add ShipmentCharges model
6. ✅ Build Billing Settings page (5 tabs including Invoice Design) ⭐
7. ✅ Logo upload functionality ⭐
8. ✅ Build Charge Types management UI
9. ✅ Build Release Shipment flow with customizable charges
10. ✅ Implement charge calculation logic
11. ✅ Generate customized invoices with line items ⭐
12. ✅ PDF generation with custom template ⭐

### Phase 2 (Medium Priority):
1. ⏳ Invoice listing page
2. ⏳ Invoice detail & PDF generation
3. ⏳ Payment recording
4. ⏳ Payment tracking page

### Phase 3 (Low Priority):
1. ⏳ Automated periodic billing
2. ⏳ Email notifications
3. ⏳ Advanced reports
4. ⏳ Client portal

---

## 🎯 Next Steps

**Should I proceed with Phase 1 implementation?**

This will include:
1. Database schema updates (4 new models)
2. Migration creation
3. Billing Settings API endpoints
4. Billing Settings UI page
5. Release Shipment page with charge calculation
6. Basic invoice generation

**Estimated Time:** 60-75 minutes (with full customization + invoice design)
**Files to Create/Modify:** ~25 files

---

## 🎯 SUMMARY: What You Get

### ✅ **Flexibility**
- **Create unlimited charge types** with any name you want
- **10+ calculation methods** (per box, per kg, percentage, flat, etc.)
- **Auto-apply or optional** charges
- **Enable/disable** charges anytime
- **Min/max caps** on charges

### ✅ **Example Charges You Can Add:**
```
✓ Storage charges (per day/week/month)
✓ Handling fees
✓ Documentation fees
✓ Insurance
✓ Loading/unloading services
✓ Packaging materials
✓ Weight-based charges
✓ Rush/emergency fees
✓ Premium location charges
✓ Special handling (fragile, hazardous)
✓ Labor charges (per hour)
✓ Equipment rental (forklift, etc.)
✓ Photo documentation
✓ Inventory counting
✓ Late payment penalties
✓ Loyalty discounts
✓ Seasonal surcharges
✓ ... literally ANYTHING you want!
```

### ✅ **Invoice Features:**
- Professional invoices with detailed line items
- Multiple charges per invoice
- Tax calculation
- Payment tracking
- PDF generation
- Partial payments support

### ✅ **User Experience:**
```
1. You define charge types once
2. System auto-calculates based on rules
3. User can select optional charges
4. User can add custom one-time charges
5. Preview invoice before generating
6. Generate & print invoice
7. Track payments
```

---

## 🚀 Ready to Build?

**Phase 1 Implementation Includes:**
- ✅ 6 new database models (fully flexible)
- ✅ Prisma migration
- ✅ 25+ API endpoints
- ✅ **Invoice Customization Settings** ⭐
  - Logo upload & positioning
  - Brand colors selection
  - Bank details configuration
  - Terms & conditions editor
  - Invoice template preview
- ✅ **Charge Types Management UI**
  - Create unlimited charge types
  - 8+ calculation methods
  - Auto-apply settings
- ✅ **Release Page with Charge Selection**
  - Auto-calculated charges
  - Optional charge checkboxes
  - Custom one-time charges
  - Real-time preview
- ✅ **Professional Invoice Generation** ⭐
  - Customizable design & layout
  - Company logo & branding
  - Detailed line items
  - PDF generation with template
  - Email invoices
- ✅ **Payment Tracking**
  - Record payments
  - Multiple payment methods
  - Receipt generation

**This system will allow you to:**
1. ✅ Add ANY charge you can think of
2. ✅ Change rates anytime
3. ✅ Enable/disable charges
4. ✅ Auto-calculate complex invoices
5. ✅ Handle full & partial releases
6. ✅ Track all payments
7. ✅ **Customize invoice design completely** ⭐
8. ✅ **Upload your logo** ⭐
9. ✅ **Match your brand colors** ⭐
10. ✅ **Add bank details** ⭐
11. ✅ **Custom terms & conditions** ⭐
12. ✅ **Professional PDF invoices** ⭐
13. ✅ **Email invoices to clients** ⭐

**Would you like me to start building this FULLY CUSTOMIZABLE billing & invoice system?** 🎯
