# Live Tracking - Troubleshooting Guide

## Issue: Live Tracking Map Not Displaying

### Problem 1: Map Container Not Showing
**Symptoms**: Blank white area where map should be

**Solution**:
1. Check if Leaflet CSS is loaded:
   - Open browser DevTools (F12)
   - Check Console for CSS errors
   - CSS should be imported in `index.css`

2. Verify container height:
   - Map needs explicit height to display
   - Check if parent container has height set
   - Current: `fixed inset-0 top-16` for full screen

3. Hard refresh:
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Press `Cmd + Shift + R` (Mac)
   - Clears CSS cache

### Problem 2: No Active Trips Showing
**Symptoms**: Map shows but "No Active Trips" message

**Solution**:
1. Start a trip first:
   - Go to http://localhost:3000/driver
   - Login as driver
   - Select vehicle
   - Click "Start Trip"
   - Wait 30 seconds for GPS points

2. Check API endpoint:
   - Open DevTools → Network tab
   - Look for `/api/fleet/trips?status=ONGOING`
   - Should return array of trips
   - If 401: Check authentication
   - If 500: Check backend logs

3. Verify trip status:
   - Trips must have `status: 'ONGOING'`
   - Check database: `SELECT * FROM Trip WHERE status = 'ONGOING'`

### Problem 3: Map Tiles Not Loading
**Symptoms**: Gray grid instead of map

**Solution**:
1. Check internet connection
   - Map tiles load from OpenStreetMap servers
   - Requires active internet

2. Try different tile server:
   Replace in LiveTracking.tsx:
   ```typescript
   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
   ```
   With:
   ```typescript
   url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
   ```

3. Check browser console for CORS errors

### Problem 4: Markers Not Showing
**Symptoms**: Map loads but no vehicle markers

**Solution**:
1. Check GPS points exist:
   - Trips need GPS coordinates logged
   - Driver app logs every 30 seconds
   - Check: `SELECT * FROM TripPoint WHERE tripId = X`

2. Verify data structure:
   - Backend should return trips with GPS points
   - Check `/api/fleet/trips/:id/gps` endpoint

3. Check browser console:
   - Look for JavaScript errors
   - Marker icon path issues
   - Data parsing errors

### Problem 5: Layout/CSS Issues
**Symptoms**: Map too small or overlapping content

**Solution**:
1. Check CSS imports:
   ```css
   /* In index.css */
   @import 'leaflet/dist/leaflet.css';
   ```

2. Verify container styles:
   ```tsx
   <div className="fixed inset-0 top-16 flex">
     <div className="flex-1 relative">
       <MapContainer style={{ height: '100%', width: '100%' }}>
   ```

3. Clear browser cache and reload

---

## Quick Test Steps

### Step 1: Verify Backend
```bash
# Test trips endpoint
curl http://localhost:5000/api/fleet/trips?status=ONGOING \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return:
[
  {
    "id": 1,
    "status": "ONGOING",
    "driverId": 1,
    "vehicleId": 1,
    ...
  }
]
```

### Step 2: Verify GPS Points
```bash
# Test GPS endpoint
curl http://localhost:5000/api/fleet/trips/1/gps \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return:
[
  {
    "id": 1,
    "tripId": 1,
    "lat": 40.7128,
    "lon": -74.0060,
    "speed": 45.5,
    ...
  }
]
```

### Step 3: Check Frontend
1. Open http://localhost:3000/fleet/tracking
2. Open DevTools (F12)
3. Check Console tab for errors
4. Check Network tab for API calls
5. Should see:
   - `/api/fleet/trips?status=ONGOING` (success)
   - `/api/fleet/trips/:id/gps` for each trip (success)

### Step 4: Verify Map Loads
1. Map should show OpenStreetMap tiles
2. Sidebar should list active trips
3. Clicking trip should show marker on map
4. Route polyline should connect GPS points

---

## Common Error Messages

### "Cannot read property 'length' of undefined"
**Cause**: GPS points not loaded properly  
**Fix**: Ensure backend returns `gpsPoints` array

### "Map container not found"
**Cause**: Map component mounted before container ready  
**Fix**: Ensure container has height set before MapContainer renders

### "Invalid LatLng object"
**Cause**: Invalid GPS coordinates  
**Fix**: Check lat/lon values are numbers, not null/undefined

### "Network Error"
**Cause**: Backend not responding  
**Fix**: Verify backend running on port 5000

---

## Testing Checklist

- [ ] Backend server running (port 5000)
- [ ] Frontend server running (port 3000)
- [ ] Driver app accessible at `/driver`
- [ ] Admin dashboard accessible at `/fleet/tracking`
- [ ] At least one driver logged in
- [ ] At least one vehicle available
- [ ] Trip started from driver app
- [ ] GPS points being logged (check every 30 sec)
- [ ] Internet connection active
- [ ] Browser DevTools shows no errors
- [ ] Map tiles loading
- [ ] Markers appearing
- [ ] Sidebar showing active trips

---

## Expected Behavior

### When Working Correctly:
1. ✅ Sidebar lists all active trips
2. ✅ Map shows OpenStreetMap tiles
3. ✅ Blue/gray markers for vehicles
4. ✅ Polylines showing routes
5. ✅ Clicking trip highlights marker
6. ✅ Popup shows trip details
7. ✅ Auto-refreshes every 30 seconds
8. ✅ Last update time shown
9. ✅ GPS point count displayed
10. ✅ Speed shown in sidebar

### Auto-Refresh:
- Fetches new data every 30 seconds
- Can be toggled off via checkbox
- Updates markers and routes
- Doesn't reload entire page
- Maintains selected trip

---

## Manual Testing Steps

### Test 1: Start Trip and Track
1. Open Driver app: http://localhost:3000/driver
2. Login as driver
3. Select vehicle "TEST-123"
4. Click "Start Trip"
5. Wait for GPS lock (<20m accuracy)
6. Drive around (or simulate movement)
7. Open Admin: http://localhost:3000/fleet/tracking
8. Should see trip in sidebar
9. Should see marker on map
10. Click marker to see details

### Test 2: Multiple Trips
1. Start 2-3 trips from different browsers/devices
2. Each with different vehicle
3. Open live tracking
4. Should see all trips in sidebar
5. Should see multiple markers on map
6. Each with different color when selected
7. Polylines for each route

### Test 3: Auto-Refresh
1. Start a trip
2. Open live tracking
3. Note GPS point count
4. Wait 30 seconds
5. Count should increase
6. New GPS point added to route
7. Polyline extends

### Test 4: Offline Handling
1. Start trip
2. Disable internet
3. Move around
4. GPS points queued locally
5. Enable internet
6. Points should sync
7. Map should update with full route

---

## Performance Tips

### For Smooth Operation:
1. Limit active trips to <50 simultaneously
2. Auto-refresh every 30-60 seconds (not faster)
3. Use clustering for many markers
4. Paginate trip list in sidebar
5. Lazy-load GPS points (last 100 points)

### Browser Recommendations:
- ✅ Chrome (best performance)
- ✅ Firefox (good)
- ✅ Edge (good)
- ⚠️ Safari (iOS may have GPS issues)
- ❌ IE11 (not supported)

---

## Need More Help?

Check these files:
- `frontend/src/pages/Fleet/Admin/LiveTracking.tsx` - Main component
- `backend/src/modules/fleet/controllers/trip.controller.ts` - API logic
- `backend/src/modules/fleet/routes.ts` - Route definitions

Check logs:
- Browser Console (F12)
- Backend terminal (npm run dev)
- Network tab for API calls
