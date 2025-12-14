# 📦 WMS Version History

## Current Version: **v2.2.83**
- **Released**: Dec 14, 2025 at 12:53:40
- **Author**: akifbade46-del
- **Status**: Development

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
