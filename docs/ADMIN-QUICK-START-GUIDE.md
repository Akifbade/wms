# Fleet Management System - Quick Start Guide for Administrators

**Version**: 1.0.0  
**Last Updated**: October 14, 2025  
**Audience**: Admin Users, Fleet Managers

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Vehicles](#managing-vehicles)
4. [Managing Drivers](#managing-drivers)
5. [Viewing Trips](#viewing-trips)
6. [Live Tracking](#live-tracking)
7. [Fuel Reports](#fuel-reports)
8. [Tips & Best Practices](#tips--best-practices)

---

## 🚀 Getting Started

### Accessing the System

1. **Login**:
   - Open your web browser
   - Navigate to: `http://your-domain.com`
   - Enter your username and password
   - Click "Login"

2. **Navigate to Fleet Section**:
   - After login, look for the navigation menu
   - Click on "Fleet Management" or "Fleet" icon
   - You'll see the Fleet Dashboard

### System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)
- **Internet**: Stable internet connection
- **Screen**: Works on desktop, tablet, and mobile devices

---

## 📊 Dashboard Overview

### What You See

The **Fleet Dashboard** is your command center with real-time statistics:

#### 1. **Statistics Cards** (Top Row)

| Card | Description |
|------|-------------|
| **Total Drivers** | Number of active drivers in your fleet |
| **Active Trips** | Trips currently in progress |
| **Total Distance** | Total kilometers traveled (monthly) |
| **Idle Time** | Total idle time across all trips |
| **Fuel Cost** | Total fuel expenses (monthly) |
| **Avg Speed** | Average speed across all trips |

#### 2. **Recent Trips** (Center Section)

- Shows last 5 trips
- Each row displays:
  - Vehicle plate number
  - Driver name
  - Distance traveled
  - Trip status
  - Start time

#### 3. **Quick Actions** (Bottom Buttons)

| Button | Action |
|--------|--------|
| **View All Trips** | See complete trip history with filters |
| **Live Tracking** | Monitor active trips on map |
| **Add Vehicle** | Register new vehicle to fleet |
| **Add Driver** | Register new driver |

### Refreshing Data

- Dashboard auto-refreshes every 30 seconds
- Manual refresh: Click the refresh icon or press F5

---

## 🚗 Managing Vehicles

### Viewing Vehicles

1. From Dashboard, click **"Add Vehicle"** or navigate to **"Vehicles"** tab
2. You'll see a grid of all vehicles with:
   - Plate number
   - Make and model
   - Year
   - Status (Active/Inactive/Maintenance)
   - Actions (View, Edit, Delete)

### Adding a New Vehicle

1. Click **"Add Vehicle"** button (top right)
2. Fill in the form:
   - **Plate Number**: e.g., "DXB-T-1234" (required, unique)
   - **Make**: e.g., "Toyota" (required)
   - **Model**: e.g., "Hilux" (required)
   - **Year**: e.g., "2023" (required)
   - **VIN**: Vehicle Identification Number
   - **IMEI**: GPS device IMEI number
   - **Fuel Type**: Diesel, Petrol, Electric, Hybrid
   - **Capacity**: Load capacity in kg
   - **Status**: Active (default)
3. Click **"Save Vehicle"**
4. Vehicle will appear in the list immediately

### Editing a Vehicle

1. Find the vehicle in the list
2. Click the **"Edit"** button (pencil icon)
3. Update the information
4. Click **"Save Changes"**

### Deleting a Vehicle

⚠️ **Warning**: This cannot be undone!

1. Find the vehicle in the list
2. Click the **"Delete"** button (trash icon)
3. Confirm deletion in the popup
4. Vehicle will be removed from the system

**Note**: You cannot delete a vehicle that has active trips

### Vehicle Status

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 **Active** | Vehicle is operational | Can be assigned to trips |
| 🔴 **Inactive** | Vehicle not in use | Cannot be assigned to trips |
| 🟡 **Maintenance** | Vehicle under repair | Cannot be assigned to trips |

---

## 👨‍✈️ Managing Drivers

### Viewing Drivers

1. Navigate to **"Drivers"** tab
2. You'll see all drivers with:
   - Name and photo
   - Phone number and email
   - Card number (for fuel)
   - License number
   - License expiry (⚠️ shows warning if expiring soon)
   - Status

### Adding a New Driver

1. Click **"Add Driver"** button
2. Fill in the form:
   - **Name**: Full name (required)
   - **Phone**: Contact number (required)
   - **Email**: Email address (required, unique)
   - **License Number**: Driver's license (required)
   - **License Expiry**: Expiration date (required)
   - **Card Number**: Fuel card number (required, unique)
   - **Status**: Active (default)
3. Click **"Save Driver"**

### License Expiry Warnings

- ⚠️ **Yellow badge**: License expires within 30 days
- 🔴 **Red badge**: License has expired
- Action: Update driver's license before allowing trips

### Editing a Driver

1. Find the driver in the list
2. Click **"Edit"** button
3. Update information
4. Click **"Save Changes"**

### Deactivating a Driver

1. Edit the driver
2. Change status to **"Inactive"**
3. Save changes
4. Driver cannot start new trips (existing trips unaffected)

---

## 🛣️ Viewing Trips

### Trip List View

1. Navigate to **"Trips"** tab
2. See all trips with:
   - Vehicle and driver info
   - Start and end time
   - Distance and duration
   - Status
   - Actions (View details)

### Trip Status

| Status | Color | Meaning |
|--------|-------|---------|
| **Active** | 🟢 Green | Trip in progress |
| **Completed** | 🔵 Blue | Trip ended normally |
| **Paused** | 🟡 Yellow | Trip temporarily stopped |
| **Cancelled** | 🔴 Red | Trip was cancelled |

### Filtering Trips

Use the filter bar at the top:

1. **Status Filter**:
   - Select: All, Active, Completed, Paused, or Cancelled
   
2. **Driver Filter**:
   - Select specific driver or "All Drivers"
   
3. **Vehicle Filter**:
   - Select specific vehicle or "All Vehicles"
   
4. **Date Range**:
   - Pick start and end date
   - Click "Apply"

5. **Search**:
   - Type plate number, driver name, or notes
   - Results filter automatically

### Viewing Trip Details

1. Click on a trip row
2. A modal popup shows:
   - **Trip Info**: Start/end time, duration, distance
   - **Route**: Map showing GPS path
   - **Stats**: Average speed, max speed, idle time
   - **Events**: Speeding alerts, geofence events
   - **Notes**: Driver's notes at trip end

### Calculating Metrics

The system automatically calculates:

- **Distance**: Total kilometers traveled
- **Duration**: Time from start to end
- **Idle Time**: Minutes spent not moving (speed < 5 km/h)
- **Avg Speed**: Average speed during trip
- **Max Speed**: Highest speed recorded

---

## 🗺️ Live Tracking

### Accessing Live Tracking

1. Click **"Live Tracking"** from Dashboard
2. Or navigate to **"Tracking"** tab

### Map View

**Main Features**:

1. **Map Display**: 
   - Shows real-time locations of all active trips
   - Uses OpenStreetMap by default
   - Zoom in/out with mouse wheel
   - Pan by dragging

2. **Vehicle Markers**:
   - 📍 Each active trip shows as a colored marker
   - Color indicates trip status
   - Click marker to see trip details

3. **Route Lines**:
   - Blue line shows path traveled
   - Connects all GPS points in trip

4. **Auto-Refresh**:
   - Updates every 30 seconds automatically
   - Manual refresh: Click refresh button

### Sidebar - Trip List

**Left sidebar shows all active trips**:

- Vehicle plate number
- Driver name
- Distance traveled
- Current speed
- Duration
- Last GPS update time

**Click on a trip** to:
- Center map on that vehicle
- Highlight the route
- Show trip details popup

### Understanding Markers

| Marker Color | Meaning |
|--------------|---------|
| 🔵 Blue | Normal trip (selected) |
| ⚫ Gray | Normal trip (not selected) |
| 🔴 Red | Alert (speeding or other issue) |

### Trip Details Popup

Click a marker to see:
- Vehicle info
- Driver info
- Current speed
- Distance so far
- Trip duration
- Last GPS update
- **"View Full Details"** button for more

### Map Controls

| Control | Action |
|---------|--------|
| **+ / -** | Zoom in/out |
| **Drag** | Move map |
| **Click Marker** | Show trip details |
| **Refresh Icon** | Update GPS data |

### No Active Trips

If no trips are active, you'll see:
- Empty map message
- "No active trips to display"
- Suggestion to check trip list

---

## ⛽ Fuel Reports

### Accessing Reports

1. Navigate to **"Reports"** or **"Fuel"** tab
2. See analytics dashboard

### Analytics Cards

**Top row shows**:

1. **Total Fuel**: Liters consumed (monthly)
2. **Total Cost**: Money spent on fuel (monthly)
3. **Avg Cost/Liter**: Average fuel price
4. **Top Consumer**: Driver/vehicle using most fuel

### Fuel Logs Table

**Shows all fuel entries with**:

- Date and time
- Driver name
- Vehicle plate
- Fuel liters
- Cost per liter
- Total cost
- Station name
- Receipt number
- Odometer reading

### Filtering Fuel Logs

1. **Date Range**:
   - Select start date
   - Select end date
   - Click "Apply"

2. **Driver Filter**:
   - Choose specific driver
   - See only their fuel logs

3. **Vehicle Filter**:
   - Choose specific vehicle
   - See only its fuel logs

4. **Search**:
   - Search by station name
   - Search by receipt number

### Exporting to Excel

1. Click **"Export to CSV"** button (top right)
2. File downloads automatically
3. Open in Excel/Google Sheets
4. Contains all filtered data

**CSV includes**:
- Date
- Driver
- Vehicle
- Liters
- Cost per liter
- Total cost
- Station
- Receipt
- Card used

### Understanding Fuel Analytics

**Cost per Liter**:
- Shows price trend
- Helps identify expensive stations
- Compare across drivers

**Top Consumers**:
- Identifies high-usage drivers
- Can indicate:
  - Long routes (normal)
  - Inefficient driving (investigate)
  - Vehicle issues (check maintenance)

**Monthly Trends**:
- Compare current month to previous
- Budget planning
- Cost control

---

## 💡 Tips & Best Practices

### Daily Operations

1. **Start of Day**:
   - Check dashboard for overnight alerts
   - Review active trips
   - Check driver license expiries

2. **During Day**:
   - Monitor live tracking for active trips
   - Check for speeding alerts
   - Respond to driver issues

3. **End of Day**:
   - Review completed trips
   - Check fuel logs match receipts
   - Verify all trips ended properly

### Driver Management

✅ **Do**:
- Keep license info up to date
- Deactivate drivers on leave
- Regular training on GPS app usage
- Monitor driver performance metrics

❌ **Don't**:
- Assign inactive drivers to trips
- Ignore license expiry warnings
- Delete drivers with trip history

### Vehicle Management

✅ **Do**:
- Regular maintenance scheduling
- Update vehicle status promptly
- Keep IMEI numbers accurate
- Track mileage vs. GPS distance

❌ **Don't**:
- Assign maintenance vehicles to trips
- Delete vehicles with trip history
- Leave inactive vehicles as "Active"

### Trip Monitoring

✅ **Do**:
- Check live tracking during trips
- Investigate unusual idle times
- Review speeding alerts
- Compare planned vs. actual routes

❌ **Don't**:
- Ignore geofence exit alerts
- Overlook long idle periods
- Skip daily trip reviews

### Fuel Management

✅ **Do**:
- Match fuel logs with receipts
- Monitor cost per liter trends
- Set card limits per driver
- Review monthly fuel reports

❌ **Don't**:
- Ignore high fuel consumption
- Skip receipt verification
- Overlook duplicate entries

### Data Accuracy

✅ **Do**:
- Update vehicle odometer readings
- Verify GPS accuracy with drivers
- Cross-check distances with routes
- Regular data quality audits

❌ **Don't**:
- Trust GPS blindly (occasional errors)
- Ignore driver feedback
- Skip data validation

---

## 🆘 Common Issues & Solutions

### Issue: Trip Not Showing on Map

**Possible Causes**:
- Trip is not active
- GPS not enabled on driver's device
- Network connectivity issues

**Solution**:
1. Check trip status (must be "Active")
2. Contact driver to enable GPS
3. Wait 30 seconds for auto-refresh
4. Check driver app troubleshooting guide

### Issue: Incorrect Distance

**Possible Causes**:
- GPS signal loss
- Tunnels or urban canyons
- Device errors

**Solution**:
- System filters jumps > 500m automatically
- Manual verification with odometer
- Notes field for corrections

### Issue: Driver Can't Start Trip

**Possible Causes**:
- Driver inactive
- Vehicle inactive
- License expired
- Network issues

**Solution**:
1. Check driver status (must be Active)
2. Check vehicle status (must be Active)
3. Verify license not expired
4. Test network connection

### Issue: Fuel Log Not Appearing

**Possible Causes**:
- Not submitted by driver
- Network sync pending
- Incorrect date filter

**Solution**:
1. Check driver app for pending logs
2. Wait for offline sync
3. Adjust date filter to include today

---

## 📱 Mobile Access

### Admin Dashboard on Mobile

The admin dashboard works on mobile devices:

1. **Responsive Design**:
   - Automatically adjusts to screen size
   - Touch-friendly buttons
   - Swipe gestures on tables

2. **Best Practices**:
   - Use landscape for tables
   - Portrait for live tracking
   - Bookmark for quick access

3. **Limitations**:
   - Some features better on desktop
   - Large data exports slow on mobile
   - Complex filters easier on desktop

---

## 🔐 Security Best Practices

1. **Password Management**:
   - Use strong passwords
   - Change regularly
   - Don't share credentials

2. **User Access**:
   - Give minimum required permissions
   - Audit user actions regularly
   - Deactivate unused accounts

3. **Data Protection**:
   - Regular backups
   - Secure access (HTTPS)
   - Monitor for unusual activity

---

## 📞 Getting Help

### Support Resources

1. **Documentation**:
   - This guide
   - Driver app user guide
   - Deployment guide
   - Troubleshooting guide

2. **System Admin**:
   - Contact your IT department
   - Submit support ticket
   - Email: support@your-company.com

3. **Training**:
   - Schedule training sessions
   - Watch video tutorials
   - Practice in test environment

---

## ✅ Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| Add vehicle | Vehicles → Add Vehicle → Fill form → Save |
| Add driver | Drivers → Add Driver → Fill form → Save |
| View trip details | Trips → Click trip row → View modal |
| Track live trip | Live Tracking → Click marker → View details |
| Export fuel report | Reports → Set filters → Export to CSV |
| Check driver license | Drivers → Look for ⚠️ badge → Update |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F5 | Refresh page |
| Ctrl+F | Search on page |
| Esc | Close modal |
| Tab | Navigate fields |

---

**Guide Version**: 1.0.0  
**Last Updated**: October 14, 2025  
**Need Help?**: Contact your system administrator

---

## 🎉 You're Ready!

You now know how to:
- ✅ Navigate the dashboard
- ✅ Manage vehicles and drivers
- ✅ Monitor trips and live tracking
- ✅ Generate fuel reports
- ✅ Handle common issues

**Start using the Fleet Management System with confidence!** 🚀
