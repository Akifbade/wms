# URGENT LOCAL FIXES - Nov 1, 2025

## Issues Reported:
1. ❌ **Release button not showing** on staging/production
2. ❌ **Camera scan not working** (QR + ASIN to rack assignment)
3. ❌ **Material usage history not showing**

---

## Root Cause Analysis:

### 1. Release Button Missing
**Status**: Check if shipment has correct status
- Release button only shows for: `IN_STORAGE`, `PARTIAL`, `STORED`, `ACTIVE`
- Must have `currentBoxCount > 0`

**Check Required**:
- Does shipment have proper status?
- Are boxes counted correctly?

---

### 2. Camera/Scanner Not Working
**Status**: Working locally, HTTPS issue on production
- Camera REQUIRES HTTPS or localhost
- Current production: http://qgocargo.cloud (no HTTPS)
- Staging: http://148.230.107.155:8080 (no HTTPS)

**Solution**:
- Enable HTTPS on production domain
- Test scanner on https://qgocargo.cloud

---

### 3. Material Usage History Not Showing
**Status**: Need to check API endpoint and component rendering

**Possible causes**:
- API route not returning data
- Frontend component not loading
- Database query issue

---

## Quick Testing Steps:

### Test 1: Release Button
```bash
# Check shipment status in database
docker exec wms-database mysql -uwms_user -pwmspassword warehouse_wms -e "
  SELECT id, referenceId, status, currentBoxCount, originalBoxCount 
  FROM Shipment 
  WHERE status IN ('IN_STORAGE', 'STORED', 'PARTIAL', 'ACTIVE') 
  LIMIT 5;
"
```

### Test 2: Scanner (Local HTTP should work)
- Open: http://localhost/scanner
- Click "Start Scanning"
- Should work on localhost (HTTPS not required)

### Test 3: Material Usage
```bash
# Check if material returns exist
docker exec wms-database mysql -uwms_user -pwmspassword warehouse_wms -e "
  SELECT COUNT(*) as material_returns FROM MaterialReturn;
  SELECT COUNT(*) as material_issues FROM MaterialIssue;
"
```

---

## Priority Fixes:

1. **Verify release button logic** - Check status conditions
2. **Test scanner locally** - Should work on localhost
3. **Check material usage API** - Verify data exists and API returns it
4. **Enable HTTPS for production** - Required for camera on prod/staging

---

Status: Ready for testing
Date: Nov 1, 2025
