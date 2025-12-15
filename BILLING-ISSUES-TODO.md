# 📋 BILLING SYSTEM - Issues to Fix Later

## ⚠️ CONFUSION 1: Duplicate CBM Rate Fields

| Location | Purpose | Fields |
|----------|---------|--------|
| `billing_settings` | Company-wide default rate | `storageRatePerCBM`, `storageRatePerBox`, `gracePeriodDays`, `minimumCharge` |
| `company_profiles` | Profile-specific rate (NEW) | `cbmRatePerDay`, `freeStorageDays`, `minimumCharge` |

**Problem:** Kaunsa use hoga unclear hai

---

## ⚠️ CONFUSION 2: Contract Status Not Used

- `company_profiles.contractStatus` = "ACTIVE" exists
- **But:** No logic for Contract customers with fixed monthly charge

**Fix Needed:**
- Add `contractType`: PER_CBM / FIXED_MONTHLY
- Add `monthlyContractAmount` for fixed monthly customers

---

## ⚠️ CONFUSION 3: Advance Payment - No Balance Tracking

- Advance payment creates `invoiceType: 'ADVANCE'`
- `shipment_charges.totalPaid` increments
- **But:** No field tracks remaining advance balance
- Future storage charges don't deduct from advance

**Fix Needed:**
- Track `advanceBalance` per company/profile
- Auto-deduct from advance when storage charges applied

---

## ✅ What Works Currently

1. Per shipment custom rate ✅ (`shipment.customRatePerCBMPerDay`)
2. Advance payment record ✅ (creates invoice)
3. Storage days calculation ✅
4. Grace period ✅

---

## 📅 To Fix Later

1. Consolidate CBM rates to one location
2. Implement Contract Type with Fixed Monthly option
3. Add Advance Balance tracking
4. Auto-deduct storage from advance balance
