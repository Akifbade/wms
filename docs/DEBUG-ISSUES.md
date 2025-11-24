# Debug Guide for 3 Issues

## Issue 1: View Details Not Working
**What happens when you click "View Details"?**
- [ ] Nothing happens (button doesn't respond)
- [ ] Modal opens but shows error
- [ ] Browser freezes
- [ ] Console error (check F12 Developer Tools → Console tab)

**To test:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "View Details" button on any shipment
4. Copy any error messages that appear

## Issue 2: Pictures Not Showing
**Current photos uploaded:**
- shipment-1762938778978-764127035.png
- shipment-1762938880262-435303682.png

**To verify:**
1. Open: http://localhost:5000/uploads/shipments/shipment-1762938778978-764127035.png
2. Does the image load directly?
3. Check browser console for 404 errors when viewing shipments

**Expected photo path format:**
- Backend serves: `/uploads/shipments/filename.png`
- Frontend requests: `/api/uploads/shipments/filename.png`
- Nginx proxies: `/api/*` → `http://backend:5000/*`

## Issue 3: Pallet QR Not Working in Scanner
**Pallet QR Format:** `PALLET_SHIPMENTID_NUMBER`
Example: `PALLET_cmhhm6gq1000132e5vadvqil_1`

**When scanning pallet QR:**
- What error message shows?
- Does it say "Shipment not found"?
- Does it scan at all?

**To debug:**
1. Scan a loose box QR (does this work?)
2. Scan a pallet QR
3. Copy the exact error message
4. Check what the QR code value is (print it and verify the format)

## Testing Checklist

### Test View Details:
```
1. Go to Shipments page
2. Find a shipment
3. Click "View Details" button
4. Expected: Modal opens with full shipment info
5. Actual: _______________
```

### Test Photos:
```
1. Create new shipment with 2-3 boxes
2. Upload photos during creation
3. View shipment in list
4. Expected: Photos show in grid below shipment info
5. Actual: _______________
```

### Test Pallet Scanner:
```
1. Create shipment with 2 pallets
2. Print pallet QR codes
3. Scan Pallet #1 QR in Scanner
4. Expected: Shows shipment with pallet selection
5. Actual: _______________
```

## Quick Backend Check
```powershell
# Check backend logs for errors
docker logs wms-backend --tail 100

# Check if photos are in folder
docker exec wms-backend ls -la /app/uploads/shipments/

# Test API directly
Invoke-WebRequest http://localhost:5000/uploads/shipments/shipment-1762938778978-764127035.png
```

## Quick Frontend Check
```powershell
# Check frontend build hash
Get-Content frontend/dist/index.html | Select-String "index-"

# Should show: index-CvVOorGP.js (latest build)
```

## Need to Provide:
Please copy and paste:
1. ❌ Exact error message from console when clicking "View Details"
2. ❌ Screenshot of shipment list (showing missing photos)
3. ❌ Error message when scanning pallet QR
4. ❌ The actual QR code value you're scanning (text format)
