# 🧹 Settings Cleanup Complete

**Date:** December 1, 2025
**Status:** ✅ Completed

## What Was Fixed

### Before (Confusing):
```
Settings
├── Company & Branding
├── Company Profiles
├── Users
├── Invoice & Templates     ❌ DUPLICATE - Merged into Billing
├── Billing & Rates
├── Integrations
├── Shipment Configuration  ❌ Had pricing section - DUPLICATE
├── System Configuration
├── Security
└── Notifications
```

### After (Clean):
```
Settings
├── 🏢 Company & Branding   - Company info, logo, branding
├── 👥 Company Profiles     - Customer profiles (DIOR, etc.)
├── 👤 User Management      - Team members & roles
├── 💰 Pricing & Billing    - ALL PRICING IN ONE PLACE ✅
│   ├── Storage Rates (per box / per CBM)
│   ├── Charge Types (handling, release, etc.)
│   ├── Invoice Design (colors, prefix)
│   ├── Bank Details
│   └── Terms & Conditions
├── 🚚 Shipment Workflow    - Intake, storage, release workflow ONLY
├── 📱 Integrations         - WhatsApp, SMS, email
├── 🏭 Warehouse Setup      - Racks, zones, custom fields
├── 🔒 Security & Access    - Authentication, permissions
└── 🔔 Notifications        - Alert preferences
```

## Pricing Flow (Clear Now)

```
┌─────────────────────────────────────────────────────────────┐
│                    PRICING HIERARCHY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CUSTOM RATE (per shipment)                              │
│     └── Set via "⚙️ Custom Charges" button                  │
│         → customRatePerCBMPerDay                            │
│         → customRatePerBoxPerDay                            │
│                   ↓                                         │
│     If enabled, this OVERRIDES company default              │
│                                                             │
│  2. COMPANY DEFAULT (Settings → Pricing & Billing)          │
│     └── storageRatePerBox or storageRatePerCBM             │
│         Used when custom rate is NOT enabled                │
│                                                             │
│  3. CHARGE TYPES (Additional fees)                          │
│     └── Handling Fee, Release Fee, Transport, etc.          │
│         Added on top of storage charges                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `Settings.tsx` | Removed "Invoice & Templates" menu, renamed items |
| `ShipmentConfiguration.tsx` | Removed duplicate pricing section |
| `BillingSettings.tsx` | Added clear header with pricing note |
| `InvoiceSettings.tsx` | Still exists but removed from menu |
| `.OLD` files | Deleted (BrandingSettings.OLD, CompanySettings.OLD) |

## Where To Configure What

| Setting | Location |
|---------|----------|
| **Storage rate per box** | Settings → Pricing & Billing → General |
| **Storage rate per CBM** | Settings → Pricing & Billing → General |
| **Custom shipment rate** | Shipment Details → ⚙️ Set Custom Charges |
| **Handling fees** | Settings → Pricing & Billing → Charge Types |
| **Invoice colors/prefix** | Settings → Pricing & Billing → Invoice Design |
| **Bank details** | Settings → Pricing & Billing → Bank Details |
| **Intake form fields** | Settings → Shipment Workflow |
| **Release workflow** | Settings → Shipment Workflow |
| **Racks/Zones** | Settings → Warehouse Setup |

## Custom Charges (Per-Shipment Override)

When you want to charge a specific shipment differently:

1. Open Shipment Details
2. Click **⚙️ Set Custom Charges**
3. Enable Custom Charges
4. Set rate per CBM or rate per Box
5. Save

This overrides the company default for THAT shipment only.

## Database Models (For Reference)

| Model | Purpose |
|-------|---------|
| `BillingSettings` | Company-wide pricing (✅ USED in calculations) |
| `ShipmentSettings` | Workflow settings only (pricing fields ignored) |
| `ChargeType` | Additional charge definitions |
| `Shipment.customRate*` | Per-shipment overrides |
