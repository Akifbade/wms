# Fleet Management - Phase 6: Driver Mobile PWA

**Status**: 📋 PLANNED  
**Estimated Time**: 2-3 hours  
**Priority**: HIGH (Core functionality for drivers)

---

## Overview

Phase 6 creates a **Progressive Web App (PWA)** for drivers to:
- Start/End trips from mobile
- Track live GPS location
- Log fuel purchases
- View assigned vehicle details
- See trip history
- Receive push notifications

### Why PWA?
- ✅ No app store needed (install via browser)
- ✅ Works offline
- ✅ Auto-updates
- ✅ Push notifications
- ✅ Camera access (for receipts)
- ✅ GPS tracking
- ✅ Works on Android & iOS

---

## Architecture

```
frontend/
├── src/
│   └── pages/
│       └── Fleet/
│           └── Driver/              # New PWA section
│               ├── DriverApp.tsx    # Main PWA container
│               ├── TripScreen.tsx   # Active trip view
│               ├── StartTrip.tsx    # Trip start form
│               ├── FuelLog.tsx      # Fuel entry
│               ├── History.tsx      # Past trips
│               └── Profile.tsx      # Driver info
├── public/
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service Worker
│   └── icons/                       # App icons (192x192, 512x512)
```

---

## Features Breakdown

### 1. Trip Management 🚗
**File**: `TripScreen.tsx`

**Start Trip**:
```typescript
// Driver selects vehicle and enters details
- Vehicle selection (assigned vehicles only)
- Purpose/Job Reference
- Starting odometer reading
- GPS location auto-captured
- Photo of odometer (optional)
```

**Active Trip View**:
```typescript
// Real-time trip tracking
- Trip duration timer
- Distance traveled
- Current location on map
- Speed indicator
- Idle time counter
- "End Trip" button
```

**End Trip**:
```typescript
// Trip completion
- Ending odometer reading
- GPS location auto-captured
- Trip summary (distance, time, avg speed)
- Photo of odometer (optional)
- Notes field
```

### 2. GPS Tracking 📍
**File**: `useGPSTracking.ts` (Custom Hook)

```typescript
// Background GPS logging
const useGPSTracking = (tripId: string) => {
  useEffect(() => {
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Send to API: POST /api/fleet/trips/:id/track
          logGPSPoint({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
          });
        },
        { enableHighAccuracy: true }
      );
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [tripId]);
};
```

**Features**:
- Background tracking (even when app minimized)
- Battery-optimized (30-second intervals)
- Auto-pause when idle
- Offline queue (stores locally, syncs later)

### 3. Fuel Logging ⛽
**File**: `FuelLog.tsx`

**Fuel Entry Form**:
```typescript
// Quick fuel log entry
- Fuel card selection
- Liters/Amount
- Odometer reading
- Receipt photo (camera/gallery)
- Location auto-captured
- Station name (optional)
```

**Recent Fuel Logs**:
- Last 10 entries
- Total fuel this month
- Fuel card balance/limit

### 4. Trip History 📊
**File**: `History.tsx`

**List View**:
```typescript
// Past trips grouped by date
Today
├── Trip #1234 (3.2 hrs, 145 km)
└── Trip #1235 (1.5 hrs, 67 km)

Yesterday
├── Trip #1230 (4.1 hrs, 189 km)

This Week
├── 12 trips
└── 1,234 km total
```

**Trip Details**:
- Route on map (polyline)
- Start/End times & locations
- Distance, duration, speeds
- Fuel logs during trip
- Events (speeding, idle, etc.)

### 5. Driver Profile 👤
**File**: `Profile.tsx`

**Driver Info**:
- Name, photo, employee ID
- License number & expiry
- Contact details
- Assigned vehicles

**Stats**:
- Trips this month
- Total distance driven
- Average trip duration
- Fuel efficiency

### 6. Offline Support 💾
**Service Worker**: `sw.js`

**Cached Resources**:
- App shell (HTML/CSS/JS)
- Static assets (icons, fonts)
- Recent trip data
- Map tiles (basic)

**Offline Actions**:
- Start/End trip (queued)
- Log fuel (queued)
- View cached history
- Auto-sync when online

### 7. Push Notifications 🔔
**File**: `useNotifications.ts`

**Notification Types**:
- Trip reminders ("End your trip?")
- Fuel limit warnings
- Maintenance alerts
- Admin messages

---

## Tech Stack

### Frontend
- **React 18** (already installed)
- **React Router** (for navigation)
- **Leaflet/Mapbox** (for maps)
- **IndexedDB** (offline storage)
- **Service Worker** (PWA features)
- **Geolocation API** (GPS tracking)

### New Dependencies
```bash
npm install --legacy-peer-deps \
  react-router-dom \
  leaflet react-leaflet \
  dexie \
  workbox-webpack-plugin
```

### PWA Setup
```json
// public/manifest.json
{
  "name": "Fleet Driver App",
  "short_name": "Fleet",
  "start_url": "/driver",
  "display": "standalone",
  "background_color": "#1e40af",
  "theme_color": "#1e40af",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Implementation Steps

### Step 1: PWA Setup (15 min)
1. Create `public/manifest.json`
2. Generate app icons (192x192, 512x512)
3. Add service worker registration
4. Update `index.html` with meta tags

### Step 2: Driver Layout (20 min)
1. Create `DriverApp.tsx` container
2. Bottom navigation (Trips/Fuel/History/Profile)
3. Responsive design (mobile-first)
4. Dark mode support

### Step 3: Trip Screens (45 min)
1. `StartTrip.tsx` - Form with vehicle selection
2. `TripScreen.tsx` - Active trip view with timer
3. `EndTrip.tsx` - Trip completion form
4. GPS tracking hook

### Step 4: Fuel Logging (30 min)
1. `FuelLog.tsx` - Entry form
2. Camera integration
3. Fuel card selection
4. Recent logs list

### Step 5: History & Profile (30 min)
1. `History.tsx` - Trip list with filters
2. `TripDetails.tsx` - Single trip view with map
3. `Profile.tsx` - Driver info & stats

### Step 6: Offline Support (30 min)
1. Service worker setup
2. IndexedDB for offline storage
3. Queue for pending actions
4. Background sync

### Step 7: Testing (15 min)
1. Install PWA on mobile device
2. Test offline mode
3. Verify GPS tracking
4. Check camera access

---

## API Endpoints (Already Created in Phase 4)

### Trips
- `POST /api/fleet/trips` - Start trip
- `PATCH /api/fleet/trips/:id` - End trip
- `POST /api/fleet/trips/:id/track` - Log GPS point
- `GET /api/fleet/trips` - List trips
- `GET /api/fleet/trips/:id` - Trip details

### Fuel
- `POST /api/fleet/fuel-logs` - Log fuel entry
- `GET /api/fleet/fuel-logs` - List fuel logs
- `GET /api/fleet/fuel-cards` - Get assigned cards

### Driver
- `GET /api/fleet/drivers/me` - Current driver info
- `GET /api/fleet/vehicles/assigned` - Assigned vehicles

**All endpoints already working from Phase 4!** ✅

---

## Mobile Features

### GPS Tracking
```typescript
// Request location permission
if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed } = position.coords;
      // Log to backend
    },
    (error) => console.error('GPS Error:', error),
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );
}
```

### Camera Access
```typescript
// Capture receipt photo
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handlePhotoCapture}
/>
```

### Install Prompt
```typescript
// PWA install banner
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});
```

### Background Sync
```typescript
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    console.log('Service Worker registered');
  });
}
```

---

## UI/UX Design

### Color Scheme
```css
:root {
  --primary: #1e40af;      /* Blue */
  --secondary: #10b981;    /* Green */
  --danger: #ef4444;       /* Red */
  --warning: #f59e0b;      /* Amber */
  --dark: #1f2937;         /* Gray 800 */
}
```

### Bottom Navigation
```
┌─────────────────────────┐
│   Active Trip View      │
│   [Map with route]      │
│   Duration: 2:34:12     │
│   Distance: 145 km      │
│   [End Trip Button]     │
└─────────────────────────┘
┌───┬───┬───┬───┬───────┐
│🚗 │⛽ │📊 │👤 │       │
│Trip Fuel Hist Prof     │
└───┴───┴───┴───┴───────┘
```

### Trip Screen Layout
```
┌─────────────────────────┐
│ ← Trip #1234     🔔     │ Header
├─────────────────────────┤
│  [Live Map View]        │
│                         │
│  📍 Current Location    │
│  ⏱️  2:34:12           │ Trip Stats
│  📏 145.3 km           │
│  🚗 67 km/h            │
│  ⏸️  12 min idle       │
├─────────────────────────┤
│  [End Trip] 🛑         │ Action
└─────────────────────────┘
```

---

## Safety Features

### Driver Protection
- ✅ Can't start trip while another is active
- ✅ GPS required to start/end trip
- ✅ Auto-end after 24 hours (from Phase 5)
- ✅ Location verification (within 500m radius)
- ✅ Odometer validation (can't decrease)

### Data Privacy
- ✅ Only assigned vehicles visible
- ✅ Only own trips visible
- ✅ Location only tracked during active trip
- ✅ Offline data encrypted in IndexedDB

### WMS Protection
- ✅ Completely separate app section
- ✅ Driver role has restricted access
- ✅ No access to warehouse/inventory data
- ✅ JWT token based authentication

---

## File Structure

```
frontend/src/pages/Fleet/Driver/
├── DriverApp.tsx              # Main container (200 lines)
├── components/
│   ├── BottomNav.tsx          # Navigation bar (80 lines)
│   ├── TripCard.tsx           # Trip list item (100 lines)
│   ├── MapView.tsx            # Live map (150 lines)
│   └── FuelCard.tsx           # Fuel card selector (60 lines)
├── screens/
│   ├── StartTrip.tsx          # Trip start form (250 lines)
│   ├── TripScreen.tsx         # Active trip view (300 lines)
│   ├── EndTrip.tsx            # Trip end form (200 lines)
│   ├── FuelLog.tsx            # Fuel entry (250 lines)
│   ├── History.tsx            # Trip history (200 lines)
│   ├── TripDetails.tsx        # Single trip view (250 lines)
│   └── Profile.tsx            # Driver profile (150 lines)
├── hooks/
│   ├── useGPSTracking.ts      # GPS hook (150 lines)
│   ├── useOfflineQueue.ts     # Offline sync (100 lines)
│   └── useNotifications.ts    # Push notifications (80 lines)
└── utils/
    ├── gpsUtils.ts            # GPS calculations (80 lines)
    ├── offlineStorage.ts      # IndexedDB wrapper (100 lines)
    └── tripUtils.ts           # Trip helpers (60 lines)
```

**Total**: ~13 files, ~2,460 lines

---

## Testing Checklist

### Functionality
- [ ] Start trip from mobile
- [ ] GPS tracking works in background
- [ ] End trip saves data
- [ ] Fuel log with camera
- [ ] View trip history
- [ ] Profile shows correct data

### PWA Features
- [ ] Install to home screen
- [ ] Works offline
- [ ] Background sync
- [ ] Push notifications
- [ ] Camera access
- [ ] GPS permission

### Performance
- [ ] Page load < 2 seconds
- [ ] GPS updates smooth
- [ ] Map renders quickly
- [ ] Offline mode responsive

### Security
- [ ] Driver can only see own data
- [ ] JWT auth working
- [ ] Location encrypted
- [ ] No WMS access

---

## Deployment

### Build for Production
```bash
cd frontend
npm run build

# Output: optimized PWA in build/
# - Service worker registered
# - Offline cache configured
# - Icons included
```

### Mobile Testing
```bash
# Serve locally on network
npm start

# Access from mobile:
# http://192.168.x.x:3000/driver

# Install PWA:
# Chrome menu → "Add to Home Screen"
```

### Production URLs
```
Driver PWA: https://your-domain.com/driver
API Base:   https://your-domain.com/api/fleet
```

---

## Success Metrics

After Phase 6 completion:
- ✅ Drivers can start/end trips from mobile
- ✅ Live GPS tracking works
- ✅ Fuel logging with camera
- ✅ Works offline with sync
- ✅ PWA installable on phones
- ✅ Push notifications working

---

## Next Phase Preview

**Phase 7**: Admin Dashboard
- Fleet overview (all trips/vehicles)
- Live tracking on map
- Reports & analytics
- Driver management
- Vehicle management
- Fuel consumption charts

---

## Estimated Timeline

**Total Time**: 2-3 hours

| Task | Time |
|------|------|
| PWA Setup | 15 min |
| Driver Layout | 20 min |
| Trip Screens | 45 min |
| Fuel Logging | 30 min |
| History & Profile | 30 min |
| Offline Support | 30 min |
| Testing | 15 min |

**Start Phase 6 now?** 🚀
