# 📦 WMS Version History

## Current Version: **v2.3.1**
- **Released**: Dec 22, 2025 at 09:57:26
- **Author**: akifbade46-del
- **Status**: Production

### Changes in v2.3.0:
- 🧹 Workspace cleanup: Removed 50+ unnecessary files
- 📦 Optimized workspace size to 0.84 GB
- 💾 Added automatic memory persistence for session context
- 🔢 Fixed version sync between version.ts and VERSION.md

### Changes in v2.2.87:
- 🔧 Fix: Job click in Material Report opens job instead of scanner
- 📦 Feature: Individual Rack CBM setting (Ground=40, others=5)
- ✅ Fix: Old returns marked as restocked (before approval system)
- 📊 Fix: LARGE CARTON balance recalculated correctly (36)

### Changes in v2.2.69:
- 📄 **Contract System**: Replaced "Prepaid Balance" with "Contract System"
  - Monthly fixed rate payment (customer pays at month end)
  - Payment due day configuration (1-31)
  - Max CBM allowed limit per contract
  - Max storage days limit per contract
  - Unlimited CBM/Days options
  - Contract start and end dates
- 🔒 **Contract Validation**: Blocking receive/release when contract is expired/suspended
- 📊 **Company Profile**: Updated to show Contract info instead of Prepaid Balance
  - Edit Contract modal with all contract fields
  - Contract status badges (ACTIVE, PENDING, SUSPENDED, EXPIRED, CANCELLED)
  - CBM usage tracking display
- 🚀 **Backend**: New `/api/contracts` routes for contract management
- ❌ **Removed**: Confusing "Prepaid Balance" deduction logic - contracts use monthly billing

---

## Previous Versions

### v2.2.68 (Dec 10, 2025)
- 📝 Edit Prepaid Balance: Added edit modal in Company Profile to modify prepaid balance, monthly rate, expiry date, and status
- 📅 Expiry Date Support: Prepaid accounts can now have an expiry date (validUntil)
- 🔒 Expiry Blocking: When prepaid account expires

### v2.0.21 (Dec 01, 2025)
- Commit: 689c73018

---

## Version History

