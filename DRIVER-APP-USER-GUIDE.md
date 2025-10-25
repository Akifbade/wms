# Fleet Management - Driver App User Guide

**Date**: October 14, 2025  
**App URL**: http://localhost:3000/driver

---

## 📱 What is the Driver App?

The Driver App is a **Progressive Web App (PWA)** designed for drivers to:
- Start and end trips
- Track GPS location automatically
- Log fuel entries
- View trip history
- Work offline (auto-syncs when back online)

---

## 🚀 Getting Started

### Step 1: Access the App
1. Open browser on your phone (Chrome/Safari)
2. Go to: **http://localhost:3000/driver**
3. Login with your driver credentials

### Step 2: Install as App (Optional)
**On Android (Chrome)**:
1. Tap the 3-dot menu
2. Select "Add to Home Screen"
3. Tap "Install"
4. App icon will appear on your home screen

**On iPhone (Safari)**:
1. Tap the Share button
2. Scroll and tap "Add to Home Screen"
3. Tap "Add"
4. App icon will appear on your home screen

### Step 3: Grant Location Permissions
When prompted:
- ✅ Allow "Location Access" (Required for GPS tracking)
- ✅ Select "Always" or "While Using App"
- ⚠️ Without location, trips cannot be tracked!

---

## 📍 How to Use - Trip Management

### Starting a Trip

1. **Open the App**
   - Tap the Driver app icon
   - Login if needed

2. **Select Vehicle**
   - On the "Trip" tab (default screen)
   - Choose your vehicle from the dropdown
   - You'll see the vehicle's license plate and model

3. **Start Trip**
   - Tap the **"Start Trip"** button
   - GPS will capture your starting location
   - You'll see:
     - Trip duration timer (starts counting)
     - Current GPS coordinates
     - Location accuracy (in meters)
     - Current speed (in km/h)

4. **GPS Auto-Tracking**
   - App automatically logs your location every **30 seconds**
   - Works in background even if screen is locked
   - Shows "GPS Tracking Active" indicator
   - No need to do anything - just drive!

### During the Trip

**What You See**:
- ⏱️ **Duration**: How long the trip has been running (e.g., "2h 15m")
- 📍 **Current Location**: Live GPS coordinates
- 🎯 **Accuracy**: GPS accuracy in meters (lower is better)
- 🚗 **Speed**: Current speed in km/h (updates every 30 sec)
- 📊 **GPS Points**: How many location points logged

**Tips**:
- Keep the app running in background
- Don't force-close the app
- If you lose GPS signal (tunnel), app will resume tracking automatically
- Offline? No problem! GPS points are queued and sent when online

### Ending a Trip

1. **Stop Your Vehicle**
   - Park safely
   - Keep engine running for final GPS reading

2. **Tap "End Trip"**
   - A form will appear

3. **Fill End Details** (All Optional):
   - **End Odometer**: Final reading from dashboard
   - **Notes**: Any comments (e.g., "Delivered to warehouse", "Fuel needed")

4. **Submit**
   - Tap **"End Trip"** button
   - GPS will capture final location
   - Trip is complete!

5. **Confirmation**
   - You'll see a success message
   - Screen resets to start a new trip
   - All data is saved to server

---

## ⛽ Logging Fuel Entries

### How to Log Fuel

1. **Go to Fuel Tab**
   - Tap the "Fuel" icon in bottom navigation

2. **Fill Fuel Form**:
   - **Vehicle**: Select the vehicle (pre-filled if on trip)
   - **Liters**: How much fuel you pumped (e.g., 45.5)
   - **Cost**: Total amount paid (e.g., 2500.00)
   - **Odometer**: Current odometer reading (optional)
   - **Location**: Where you filled fuel (optional, e.g., "Petrol Station ABC")
   - **Receipt Photo**: Upload receipt (optional)
   - **Notes**: Any additional info (optional)

3. **Submit**
   - Tap **"Log Fuel Entry"**
   - Entry is saved
   - Admin can see it in reports

### Card Balance Check

- If your company uses fuel cards:
  - Enter card number
  - Tap "Check Balance"
  - See remaining limit for the month

---

## 📜 Viewing Trip History

1. **Go to History Tab**
   - Tap the "History" icon in bottom navigation

2. **View Past Trips**
   - See all your completed trips
   - Details shown:
     - Trip date & time
     - Vehicle used
     - Duration
     - Distance traveled (if available)
     - Status (Completed/Auto-Ended)

3. **Trip Details**
   - Tap any trip to see full details
   - View GPS route on map (admin feature)

---

## 👤 Profile Tab

1. **Go to Profile Tab**
   - Tap the "Profile" icon in bottom navigation

2. **View Your Info**:
   - Name
   - Employee ID
   - License number
   - Contact details

3. **Logout**
   - Tap **"Logout"** button when done
   - Especially if using shared device

---

## 🔌 Offline Mode

### How It Works

The app works **even without internet**!

**When Offline**:
- ✅ Can start trips
- ✅ GPS points are logged locally
- ✅ Can end trips
- ⚠️ Data stored on phone (not on server yet)

**When Back Online**:
- 🔄 App automatically syncs all offline data
- 📤 GPS points uploaded to server
- ✅ Trips visible to admin
- 🎉 No data lost!

**Tips**:
- Don't clear browser data while offline
- Keep app installed (if using PWA)
- Sync happens automatically - no action needed

---

## ⚠️ Common Issues & Solutions

### Issue 1: GPS Not Working
**Problem**: "Waiting for GPS..." or no coordinates

**Solutions**:
1. Check location permissions:
   - Android: Settings → Apps → Driver App → Permissions → Location → Always Allow
   - iPhone: Settings → Privacy → Location Services → Driver App → Always
2. Ensure GPS is enabled on phone
3. Move to open area (GPS doesn't work well indoors)
4. Restart the app

### Issue 2: Trip Not Starting
**Problem**: Button doesn't work or shows error

**Solutions**:
1. Check if you selected a vehicle
2. Ensure location permissions granted
3. Check internet connection (for first request)
4. Try refreshing the page
5. Logout and login again

### Issue 3: GPS Points Not Uploading
**Problem**: "GPS points queued" message

**Solutions**:
1. This is normal when offline
2. Will auto-upload when back online
3. Check internet connection
4. Open the app to trigger sync
5. Don't clear browser data

### Issue 4: App Not Tracking in Background
**Problem**: GPS stops when screen locked

**Solutions**:
1. Keep app open while driving
2. Use phone mount and keep screen on
3. Disable battery optimization for browser:
   - Android: Settings → Battery → Battery Optimization → Browser → Don't Optimize
4. On iPhone: Ensure "Background App Refresh" is enabled

### Issue 5: Speed Shows 0 km/h
**Problem**: Speed not updating

**Solutions**:
1. This is normal when stationary
2. Speed updates every 30 seconds
3. GPS needs movement to calculate speed
4. Wait a minute after starting to drive

---

## 📊 What Admin Can See

Your manager/admin can view:
- ✅ All your trips with start/end times
- ✅ GPS route on map
- ✅ Total distance traveled
- ✅ Trip duration
- ✅ Fuel consumption
- ✅ Speed during trip
- ✅ Any notes you added

**Privacy Note**: Location is only tracked during active trips, not 24/7.

---

## 💡 Best Practices

### Before Starting Trip
1. ✅ Check phone battery (charge if low)
2. ✅ Ensure GPS enabled
3. ✅ Wait for GPS accuracy <20 meters
4. ✅ Select correct vehicle
5. ✅ Start trip before leaving parking

### During Trip
1. ✅ Keep app running (can be in background)
2. ✅ Don't force-close the app
3. ✅ Keep phone charged (use car charger)
4. ✅ If app crashes, reopen immediately
5. ✅ Drive safely (don't use phone while driving!)

### After Trip
1. ✅ End trip immediately upon arrival
2. ✅ Add relevant notes (delivery status, issues, etc.)
3. ✅ Note final odometer reading
4. ✅ Log fuel if you filled up during trip
5. ✅ Logout if using shared device

### Fuel Logging
1. ✅ Log fuel immediately at pump
2. ✅ Take photo of receipt (keep original)
3. ✅ Enter accurate liters and cost
4. ✅ Note the odometer reading
5. ✅ Mention pump location

---

## 📱 App Features Summary

### ✅ What You Can Do
- Start/End trips with GPS
- Auto-track location every 30 seconds
- View live trip duration
- See current speed and location
- Log fuel entries with photos
- Check fuel card balance
- View trip history
- Work offline (auto-syncs later)
- Install as standalone app

### ❌ What You Cannot Do
- View other drivers' trips
- Edit past trips
- Delete trips
- View admin reports
- Manage vehicles/drivers
- View live map of all vehicles

---

## 🆘 Need Help?

**Contact**:
- Your Fleet Manager
- IT Support: [Your IT Contact]
- Email: [Support Email]

**Before Contacting Support**:
1. Try restarting the app
2. Check internet connection
3. Verify location permissions
4. Note any error messages (screenshot)
5. Remember last action before issue

---

## 🔐 Security Tips

1. **Password Protection**
   - Don't share your login credentials
   - Use a strong password
   - Change password if compromised

2. **Phone Security**
   - Lock your phone with PIN/fingerprint
   - Don't leave phone unattended while logged in
   - Enable "Find My Phone" feature

3. **Logout**
   - Always logout on shared devices
   - Logout at end of shift
   - Logout if phone lost/stolen

4. **Data Safety**
   - Don't clear browser data during active trips
   - Don't uninstall app with pending uploads
   - Report lost phone immediately

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────┐
│   DRIVER APP QUICK GUIDE            │
├─────────────────────────────────────┤
│ 1. LOGIN                            │
│    → Open browser                   │
│    → Go to /driver                  │
│    → Enter credentials              │
│                                     │
│ 2. START TRIP                       │
│    → Select vehicle                 │
│    → Wait for GPS lock              │
│    → Tap "Start Trip"               │
│    → Drive safely!                  │
│                                     │
│ 3. DURING TRIP                      │
│    → Keep app running               │
│    → GPS logs every 30 sec          │
│    → Works offline                  │
│                                     │
│ 4. END TRIP                         │
│    → Park safely                    │
│    → Tap "End Trip"                 │
│    → Add notes (optional)           │
│    → Submit                         │
│                                     │
│ 5. LOG FUEL                         │
│    → Go to Fuel tab                 │
│    → Fill form                      │
│    → Upload receipt                 │
│    → Submit                         │
│                                     │
│ 6. LOGOUT                           │
│    → Profile tab                    │
│    → Tap "Logout"                   │
└─────────────────────────────────────┘
```

---

## 🎯 Success Indicators

**Trip is Working Correctly When You See**:
- ✅ Green "Trip Active" indicator
- ✅ Timer counting up (e.g., "0h 5m")
- ✅ GPS coordinates updating
- ✅ Accuracy under 20 meters
- ✅ Speed showing when moving
- ✅ GPS points count increasing

**Offline Sync is Working When**:
- ✅ "Offline Mode" indicator shows
- ✅ "X GPS points queued" message
- ✅ Data syncs automatically when online
- ✅ No error messages on reconnection

---

**Happy Tracking! Drive Safe! 🚗💨**
