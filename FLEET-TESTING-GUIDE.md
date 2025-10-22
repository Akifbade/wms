# Fleet Management - Quick Test & Demo Setup

## ⚠️ IMPORTANT: Issues You're Facing

### Problem 1: Authentication Required
**Error**: "Cannot read properties of undefined (reading 'companyId')"

**Root Cause**: Fleet APIs require authentication, but you're not logged in or token expired.

**Solution**: You MUST login first before accessing any fleet features!

---

## 🚀 STEP-BY-STEP TESTING GUIDE

### Step 1: Login First (CRITICAL!)

1. **Open Browser**:
   ```
   http://localhost:3000
   ```

2. **Login with Admin Credentials**:
   - Username: `admin` (or your admin username)
   - Password: your password
   - Click "Login"

3. **Verify Login**:
   - You should see the Dashboard
   - Check browser console (F12) - no errors
   - Token stored in localStorage

---

### Step 2: Create Test Data (If Needed)

#### Create Test Vehicle
1. Go to: http://localhost:3000/fleet/vehicles
2. Click "Add Vehicle"
3. Fill form:
   - Make: `Toyota`
   - Model: `Hilux`
   - License Plate: `TEST-123`
   - VIN: `VIN123456789`
   - Fuel Type: `Diesel`
   - Status: `ACTIVE`
   - Mileage: `50000`
4. Click "Add Vehicle"

#### Create Test Driver
1. Go to: http://localhost:3000/fleet/drivers
2. Click "Add Driver"
3. Fill form:
   - Name: `Ahmad Ali`
   - Email: `ahmad@test.com`
   - Phone: `03001234567`
   - Employee ID: `DRV001`
   - License Number: `ABC123456`
   - License Expiry: (pick future date)
   - Status: `ACTIVE`
4. Click "Add Driver"

---

### Step 3: Test Driver App

1. **Open Driver App**:
   ```
   http://localhost:3000/driver
   ```

2. **Login as Driver**:
   - If you have driver credentials, use them
   - OR login with admin (admin can test driver app too)

3. **Start a Trip**:
   - Select Vehicle: `TEST-123`
   - Wait for GPS lock (allow location permission!)
   - Click "Start Trip"
   - You should see:
     - Timer starting (0h 0m)
     - GPS coordinates
     - Speed: 0 km/h
     - "GPS Tracking Active" message

4. **Wait 30 Seconds**:
   - GPS point should log automatically
   - Check browser console - should see success message
   - GPS Points count should increase

---

### Step 4: Test Live Tracking

1. **Open Live Tracking** (in SAME browser, must be logged in):
   ```
   http://localhost:3000/fleet/tracking
   ```

2. **Should See**:
   - ✅ Map loads (OpenStreetMap)
   - ✅ Trip in sidebar
   - ✅ Marker on map
   - ✅ No errors in console

3. **Click on Trip in Sidebar**:
   - Map should focus on that trip
   - Marker turns blue
   - Route polyline shows

4. **Wait for Auto-Refresh** (30 seconds):
   - GPS points increase
   - Route extends
   - Last update time changes

---

### Step 5: End Trip

1. **Go Back to Driver App**:
   ```
   http://localhost:3000/driver
   ```

2. **Click "End Trip"**:
   - Enter notes: "Test trip completed"
   - Click "End Trip"
   - Success message shows

3. **Verify in Trips List**:
   ```
   http://localhost:3000/fleet/trips
   ```
   - Should see completed trip
   - Status: COMPLETED
   - Duration calculated
   - GPS points recorded

---

## 🔍 Common Issues & Quick Fixes

### Issue 1: "Cannot read properties of undefined"
**Problem**: Not logged in or token expired

**Fix**:
1. Logout: http://localhost:3000
2. Login again
3. Try again

### Issue 2: "No vehicles found" in driver app
**Problem**: No vehicles created yet

**Fix**:
1. Login as admin
2. Go to: http://localhost:3000/fleet/vehicles
3. Add at least one vehicle (see Step 2 above)

### Issue 3: "GPS not working"
**Problem**: Location permission not granted

**Fix**:
1. Browser will ask for location permission - click "Allow"
2. If blocked, click the lock icon in address bar
3. Change location to "Allow"
4. Refresh page

### Issue 4: Map not showing
**Problem**: Browser cache or CSS not loaded

**Fix**:
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache
3. Check console for errors

### Issue 5: API returns 401/403
**Problem**: Not authenticated or wrong role

**Fix**:
1. Logout and login again
2. Make sure using ADMIN or MANAGER account
3. Drivers can only access /driver route

### Issue 6: Backend shows database errors
**Problem**: Database not initialized or migrations not run

**Fix**:
```bash
cd "c:\Users\USER\Videos\NEW START\backend"
npx prisma migrate dev
npx prisma generate
```

---

## 🧪 Quick Test Checklist

Run through this checklist in order:

### Backend
- [ ] Backend running on port 5000
- [ ] No errors in terminal
- [ ] Database connected

### Authentication
- [ ] Can login at http://localhost:3000
- [ ] No "companyId" errors
- [ ] Token in localStorage (check DevTools → Application → Local Storage)

### Fleet Dashboard
- [ ] http://localhost:3000/fleet loads
- [ ] Stats show (even if 0)
- [ ] No console errors

### Vehicle Management
- [ ] http://localhost:3000/fleet/vehicles loads
- [ ] Can add vehicle
- [ ] Can edit vehicle
- [ ] Can delete vehicle

### Driver Management
- [ ] http://localhost:3000/fleet/drivers loads
- [ ] Can add driver
- [ ] Can edit driver

### Driver App
- [ ] http://localhost:3000/driver loads
- [ ] Can select vehicle
- [ ] Can start trip
- [ ] GPS coordinates show
- [ ] Timer runs

### Live Tracking
- [ ] http://localhost:3000/fleet/tracking loads
- [ ] Map shows
- [ ] Active trips in sidebar
- [ ] Markers on map
- [ ] Can click to focus

### Trips List
- [ ] http://localhost:3000/fleet/trips loads
- [ ] Shows trips
- [ ] Filters work
- [ ] Can view trip details

---

## 📞 If Still Not Working

### Check Browser Console (F12)
Look for these specific errors:

**Good (No errors)**:
```
✅ No red errors
✅ API calls return 200/201
✅ "Trip started successfully"
✅ "GPS point logged"
```

**Bad (Errors to fix)**:
```
❌ 401 Unauthorized → Not logged in
❌ 403 Forbidden → Wrong role
❌ 500 Internal Server Error → Backend issue
❌ Cannot read 'companyId' → Auth middleware issue
❌ Network Error → Backend not running
```

### Check Backend Terminal
Look for:
```
✅ Server is running on http://localhost:5000
✅ Environment: development
✅ Fleet enabled: true
✅ Jobs running

❌ Database connection error → Run migrations
❌ Port already in use → Kill process and restart
❌ Module not found → Run npm install
```

### Nuclear Option (If Nothing Works)

1. **Stop Everything**:
   ```powershell
   Get-Process node | Stop-Process -Force
   ```

2. **Clear Everything**:
   ```powershell
   cd "c:\Users\USER\Videos\NEW START\backend"
   Remove-Item node_modules -Recurse -Force
   npm install
   npx prisma generate
   
   cd "c:\Users\USER\Videos\NEW START\frontend"
   Remove-Item node_modules -Recurse -Force
   npm install
   ```

3. **Restart Servers**:
   ```powershell
   # Terminal 1 - Backend
   cd "c:\Users\USER\Videos\NEW START\backend"
   npm run dev
   
   # Terminal 2 - Frontend
   cd "c:\Users\USER\Videos\NEW START\frontend"
   npm run dev
   ```

4. **Start Fresh**:
   - Clear browser cache: `Ctrl + Shift + Delete`
   - Close all browser tabs
   - Open new tab: http://localhost:3000
   - Login
   - Test each feature one by one

---

## 🎯 Expected Working Flow

### Correct Order:
1. ✅ Login to admin
2. ✅ Create vehicle
3. ✅ Create driver
4. ✅ Open driver app (new tab/window)
5. ✅ Login as driver (or admin)
6. ✅ Select vehicle
7. ✅ Start trip
8. ✅ Wait 30 seconds (GPS logs)
9. ✅ Open live tracking (another tab, stay logged in)
10. ✅ See trip on map
11. ✅ End trip from driver app
12. ✅ Check trips list

### Wrong Order (Will Fail):
1. ❌ Open driver app without login
2. ❌ Try to start trip without vehicle
3. ❌ Open live tracking without login
4. ❌ Expect map to show without active trips

---

## 📝 Quick Commands

### Check if servers running:
```powershell
netstat -ano | Select-String ":3000"  # Frontend
netstat -ano | Select-String ":5000"  # Backend
```

### Kill all node processes:
```powershell
Get-Process node | Stop-Process -Force
```

### Restart backend:
```powershell
cd "c:\Users\USER\Videos\NEW START\backend"
npm run dev
```

### Restart frontend:
```powershell
cd "c:\Users\USER\Videos\NEW START\frontend"
npm run dev
```

### Check database:
```powershell
cd "c:\Users\USER\Videos\NEW START\backend"
npx prisma studio  # Opens database viewer in browser
```

---

## ✅ Success Indicators

### You Know It's Working When:
1. ✅ Login works - redirects to dashboard
2. ✅ Fleet menu item appears in sidebar
3. ✅ All fleet screens load without errors
4. ✅ Can create vehicle successfully
5. ✅ Can create driver successfully
6. ✅ Driver app loads and shows vehicle dropdown
7. ✅ Can start trip - timer starts
8. ✅ GPS coordinates update
9. ✅ Live tracking shows map with markers
10. ✅ Trip appears in trips list after ending

### Still Having Issues?
**Tell me specifically**:
- Which step fails?
- What error message you see?
- What's in browser console (F12)?
- What's in backend terminal?

I'll help you fix it step by step!
