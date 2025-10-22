# 🚀 SHIPMENT & RELEASE CONFIGURATION SYSTEM

## Overview
Complete configuration system for Shipment and Release workflow management in Settings.

---

## 📊 NEW DATABASE MODEL: ShipmentSettings

### Purpose
Centralized configuration for shipment intake, storage, and release workflows.

### Schema Addition
```prisma
model ShipmentSettings {
  id                      String   @id @default(cuid())
  companyId               String   @unique
  
  // Shipment Intake Settings
  requireClientEmail      Boolean  @default(false)
  requireClientPhone      Boolean  @default(true)
  requireEstimatedValue   Boolean  @default(false)
  requirePhotos           Boolean  @default(false)
  autoGenerateQR          Boolean  @default(true)
  qrCodePrefix            String   @default("SHP")
  
  // Storage Settings
  defaultStorageType      String   @default("PERSONAL") // PERSONAL, COMMERCIAL
  allowMultipleRacks      Boolean  @default(false)
  requireRackAssignment   Boolean  @default(false)
  autoAssignRack          Boolean  @default(false)
  notifyOnLowCapacity     Boolean  @default(true)
  lowCapacityThreshold    Int      @default(80) // Percentage
  
  // Release Settings
  requireReleaseApproval  Boolean  @default(false)
  releaseApproverRole     String   @default("MANAGER") // MANAGER, ADMIN
  requireReleasePhotos    Boolean  @default(false)
  requireIDVerification   Boolean  @default(true)
  generateReleaseInvoice  Boolean  @default(true)
  autoSendInvoiceEmail    Boolean  @default(false)
  
  // Pricing & Charges
  storageRatePerDay       Float    @default(2.0) // KWD
  storageRatePerBox       Float    @default(0.0) // 0 = charge by day only
  chargePartialDay        Boolean  @default(true)
  minimumChargeDays       Int      @default(1)
  
  // Release Charges
  releaseHandlingFee      Float    @default(0.0)
  releasePerBoxFee        Float    @default(0.0)
  releaseTransportFee     Float    @default(0.0)
  
  // Notifications
  notifyClientOnIntake    Boolean  @default(true)
  notifyClientOnRelease   Boolean  @default(true)
  notifyOnStorageAlert    Boolean  @default(true)
  storageAlertDays        Int      @default(30) // Alert after X days
  
  // Custom Field Settings
  enableCustomFields      Boolean  @default(true)
  requiredCustomFields    String?  // JSON array of custom field IDs
  
  // Partial Release Settings
  allowPartialRelease     Boolean  @default(true)
  partialReleaseMinBoxes  Int      @default(1)
  requirePartialApproval  Boolean  @default(false)
  
  // Documentation
  requireReleaseSignature Boolean  @default(true)
  requireCollectorID      Boolean  @default(true)
  allowProxyCollection    Boolean  @default(true)
  
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  // Relations
  company                 Company  @relation(fields: [companyId], references: [id])
  
  @@map("shipment_settings")
}
```

Add to Company model:
```prisma
shipmentSettings ShipmentSettings?
```

---

## 🎯 FEATURES

### 1. Shipment Intake Configuration
- **Client Information**: Toggle required fields (email, phone, value)
- **QR Code Generation**: Auto-generate with custom prefix
- **Photo Requirements**: Optional photo capture during intake
- **Storage Type**: Default selection (Personal/Commercial)

### 2. Storage Management
- **Rack Assignment**: Optional vs Required
- **Multi-Rack Support**: Allow items across multiple racks
- **Auto-Assignment**: Intelligent rack allocation
- **Capacity Alerts**: Low capacity notifications with threshold

### 3. Release Workflow
- **Approval Required**: Manager/Admin approval before release
- **Documentation**: ID verification, signatures, collector details
- **Photo Documentation**: Capture release photos
- **Invoice Generation**: Auto-generate invoice on release
- **Email Notifications**: Auto-send invoice to client

### 4. Pricing Configuration
- **Storage Rates**: Per day or per box pricing
- **Partial Day Charges**: Pro-rated charges
- **Minimum Charge**: Minimum billable days
- **Release Fees**: Handling, per-box, transport fees

### 5. Partial Release
- **Enable/Disable**: Control partial release feature
- **Minimum Boxes**: Minimum boxes per release
- **Approval Workflow**: Optional approval for partial releases

### 6. Notifications
- **Client Alerts**: Notify on intake and release
- **Storage Alerts**: Alert after X days in storage
- **Staff Notifications**: Low capacity alerts

---

## 📁 FILE STRUCTURE

```
backend/
  src/
    routes/
      shipment-settings.ts (NEW) - API endpoints

frontend/
  src/
    pages/
      Settings/
        components/
          ShipmentConfiguration.tsx (NEW) - Settings UI
```

---

## 🔌 API ENDPOINTS

### GET `/api/shipment-settings`
Get current shipment settings for company
```json
Response: {
  "settings": {
    "requireClientEmail": false,
    "autoGenerateQR": true,
    "storageRatePerDay": 2.0,
    ...
  }
}
```

### PUT `/api/shipment-settings`
Update shipment settings
```json
Request: {
  "requireClientEmail": true,
  "storageRatePerDay": 2.5,
  "requireReleaseApproval": true,
  ...
}
Response: {
  "message": "Settings updated successfully",
  "settings": { ... }
}
```

### POST `/api/shipment-settings/reset`
Reset to default settings
```json
Response: {
  "message": "Settings reset to defaults",
  "settings": { ... }
}
```

---

## 🎨 FRONTEND UI DESIGN

### Settings → Shipment Configuration

**6 Sections**:

#### 1. 📥 Intake Settings
- Toggle switches for required fields
- QR code prefix input
- Default storage type dropdown
- Photo requirement toggle

#### 2. 🏢 Storage Settings
- Rack assignment mode (Optional/Required/Auto)
- Multi-rack support toggle
- Capacity alert threshold slider
- Low capacity notification toggle

#### 3. 📤 Release Settings
- Approval requirement toggle
- Approver role selection
- Photo requirement toggle
- ID verification toggle
- Invoice auto-generation toggle
- Email auto-send toggle

#### 4. 💰 Pricing Configuration
- Storage rate per day (number input)
- Storage rate per box (number input)
- Partial day charging toggle
- Minimum charge days (number input)
- Release handling fee (number input)
- Release per-box fee (number input)
- Release transport fee (number input)

#### 5. 📦 Partial Release
- Enable partial release toggle
- Minimum boxes per release (number input)
- Approval requirement toggle

#### 6. 🔔 Notifications
- Client notification toggles
- Storage alert days (number input)
- Staff alert toggles

---

## 🎯 USAGE IMPACT

### During Shipment Creation:
```typescript
// Frontend checks settings
const settings = await shipmentSettingsAPI.get();

if (settings.requireClientEmail && !formData.clientEmail) {
  showError('Client email is required');
}

if (settings.autoGenerateQR) {
  formData.qrCode = generateQR(settings.qrCodePrefix);
}
```

### During Release:
```typescript
const settings = await shipmentSettingsAPI.get();

if (settings.requireReleaseApproval) {
  // Show approval workflow
  await requestApproval(shipmentId, currentUser);
}

if (settings.generateReleaseInvoice) {
  const invoice = await generateInvoice(shipmentId);
  
  if (settings.autoSendInvoiceEmail) {
    await sendInvoiceEmail(invoice.id);
  }
}
```

### During Storage Calculation:
```typescript
const settings = await shipmentSettingsAPI.get();
const days = calculateDays(arrivalDate, releaseDate);

// Apply minimum charge
const chargeableDays = Math.max(days, settings.minimumChargeDays);

// Calculate storage charge
let charge = 0;
if (settings.storageRatePerDay > 0) {
  charge += chargeableDays * settings.storageRatePerDay;
}
if (settings.storageRatePerBox > 0) {
  charge += boxCount * settings.storageRatePerBox;
}

// Add release fees
charge += settings.releaseHandlingFee;
charge += settings.releasePerBoxFee * boxCount;
charge += settings.releaseTransportFee;
```

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Database Migration
```bash
# Add ShipmentSettings model to schema.prisma
# Run migration
npx prisma migrate dev --name add_shipment_settings
```

### Step 2: Seed Default Settings
```typescript
// Add to seed.ts
await prisma.shipmentSettings.create({
  data: {
    companyId: company.id,
    requireClientPhone: true,
    autoGenerateQR: true,
    storageRatePerDay: 2.0,
    generateReleaseInvoice: true,
    ...
  }
});
```

### Step 3: Backend API
- Create `backend/src/routes/shipment-settings.ts`
- Add GET, PUT, POST endpoints
- Add authentication & authorization

### Step 4: Frontend Service
- Add `shipmentSettingsAPI` to `services/api.ts`
- Create fetch methods

### Step 5: Settings UI
- Create `ShipmentConfiguration.tsx`
- Add to Settings tabs
- Create 6 section cards with toggles/inputs

### Step 6: Integration
- Update CreateShipmentModal to check settings
- Update ReleaseShipmentModal to enforce settings
- Update charge calculation to use settings

---

## 📊 BENEFITS

### For Admins:
✅ Complete control over workflow  
✅ Flexible pricing configuration  
✅ Customizable approval processes  
✅ Granular notification control

### For Users:
✅ Consistent workflow  
✅ Clear requirements  
✅ Automated processes  
✅ Better tracking

### For Business:
✅ Standardized operations  
✅ Revenue optimization  
✅ Compliance management  
✅ Client satisfaction

---

## 🎨 UI MOCKUP

```
┌─────────────────────────────────────────────────────────┐
│  Settings > Shipment Configuration                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📥 Intake Settings                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ☑ Require Client Email                           │  │
│  │ ☑ Require Client Phone                           │  │
│  │ ☐ Require Estimated Value                        │  │
│  │ ☑ Auto-generate QR Code                          │  │
│  │   QR Prefix: [SHP____]                           │  │
│  │ Default Type: [Personal ▼]                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  🏢 Storage Settings                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Rack Assignment: [Optional ▼]                    │  │
│  │ ☐ Allow Multiple Racks                           │  │
│  │ ☑ Low Capacity Alerts                            │  │
│  │   Threshold: [80%] [████████░░]                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  📤 Release Settings                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ☐ Require Approval                               │  │
│  │   Approver Role: [Manager ▼]                     │  │
│  │ ☑ Require ID Verification                        │  │
│  │ ☑ Generate Invoice                               │  │
│  │ ☐ Auto-send Email                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  💰 Pricing Configuration                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Storage Rate/Day: [2.00] KWD                     │  │
│  │ Storage Rate/Box: [0.00] KWD                     │  │
│  │ Minimum Charge Days: [1]                         │  │
│  │ Release Handling Fee: [5.00] KWD                 │  │
│  │ Release Per-Box Fee: [1.00] KWD                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [ Reset to Defaults ]  [ Save Changes ]                │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ QUICK WINS

### Immediate Benefits:
1. **Standardized Workflow** - Everyone follows same process
2. **Flexible Pricing** - Easy rate adjustments
3. **Better Control** - Admin control over all aspects
4. **Audit Trail** - All settings changes tracked

### Future Enhancements:
1. **Templates** - Pre-configured setting templates
2. **Branch-wise Settings** - Different settings per location
3. **Time-based Pricing** - Peak season rates
4. **Client-specific Rules** - VIP client exceptions

---

*Document Created: October 13, 2025*  
*Ready for Implementation*
