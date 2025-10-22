# 🚗 Fleet Management Module - Implementation Guide

## Project: Driver Tracking & Fuel Management System

**Status:** 🟢 In Progress  
**Started:** October 14, 2025  
**Module:** Fleet Management (GPS Tracking + Fuel Cards)

---

## 📋 Implementation Checklist

### Phase 1: Database Setup ✅
- [x] Document Prisma schema
- [ ] Update schema.prisma with fleet models
- [ ] Run migration
- [ ] Generate Prisma client
- [ ] Create seed file

### Phase 2: Backend Structure 🔄
- [ ] Create module folder structure
- [ ] Implement geo utils
- [ ] Create repositories
- [ ] Implement services
- [ ] Create controllers
- [ ] Set up routes

### Phase 3: API Endpoints ⏳
- [ ] Driver management routes
- [ ] Vehicle management routes
- [ ] Trip management routes
- [ ] Fuel management routes
- [ ] Geofence routes
- [ ] Reports routes

### Phase 4: Frontend (PWA) ⏳
- [ ] Driver mobile app
- [ ] Admin dashboard
- [ ] Live tracking map

### Phase 5: Testing & Deployment ⏳
- [ ] Unit tests
- [ ] Integration tests
- [ ] Production deployment

---

## 🗄️ Database Models

### Core Tables:
1. **Driver** - Driver information
2. **Vehicle** - Vehicle fleet
3. **Trip** - Trip tracking with GPS
4. **TripPoint** - GPS coordinates
5. **FuelLog** - Fuel consumption
6. **CardLimit** - Monthly fuel limits
7. **Geofence** - Geographic boundaries
8. **TripEvent** - Alerts & notifications

---

## 🔧 Environment Variables

```bash
FLEET_ENABLED=true
FLEET_GPS_SAMPLE_MS=30000
FLEET_IDLE_SPEED_KMPH=5
FLEET_IDLE_MIN=5
FLEET_SPEED_MAX_KMPH=120
FLEET_MAX_JUMP_METERS=500
FLEET_CARD_LIMIT_DEFAULT=25.000
FLEET_CARD_ALERT_PERCENT=80
FLEET_AUTO_END_MINS=20
GOOGLE_MAPS_KEY=
```

---

## 📂 Folder Structure

```
backend/src/modules/fleet/
├── controllers/
├── services/
├── repositories/
├── utils/
├── middleware/
├── types/
├── jobs/
├── routes.ts
└── index.ts
```

---

## 🎯 Key Features

1. **Real-time GPS Tracking**
   - 30-second intervals
   - Offline queue support
   - Battery-optimized

2. **Trip Management**
   - Start/Pause/Resume/End
   - Automatic metrics calculation
   - Route replay

3. **Fuel Management**
   - Card limits (monthly)
   - 80% usage alerts
   - Receipt uploads

4. **Smart Alerts**
   - Overspeeding
   - Idle detection
   - Geofence violations
   - Fuel limit alerts

5. **Reports**
   - Daily summaries
   - Monthly reports
   - CSV exports
   - Driver/Vehicle analytics

---

## 📱 Mobile PWA Features

- Offline GPS logging
- Auto-sync on reconnect
- Wake lock (prevent sleep)
- Battery monitoring
- Network status
- Large touch-friendly buttons

---

## 🗺️ Admin Dashboard Features

- Live fleet map
- Real-time vehicle locations
- Trip history & replay
- Fuel consumption charts
- Alert management
- Export reports

---

## 🔒 Security & Performance

- JWT authentication
- Role-based access (DRIVER, ADMIN, ACCOUNTANT)
- Rate limiting on GPS endpoints (10/min)
- Indexed database queries
- Efficient polyline encoding
- WebSocket for live updates

---

## 📊 Metrics Calculated

- **Distance:** Haversine formula with sanity checks
- **Idle Time:** Speed < 5 km/h for > 5 minutes
- **Average Speed:** Calculated from GPS points
- **Max Speed:** Highest recorded speed
- **Duration:** Total trip time (excluding pauses)

---

## 🚀 Quick Start Commands

```bash
# 1. Update schema
cd backend
code prisma/schema.prisma
# (Add fleet models from plan)

# 2. Run migration
npx prisma migrate dev --name add_fleet_module

# 3. Generate client
npx prisma generate

# 4. Seed test data
npx ts-node prisma/seeds/fleet.seed.ts

# 5. Start server
npm run dev
```

---

## 📞 API Endpoints Overview

```
POST   /api/fleet/trips/start
POST   /api/fleet/trips/:id/point
POST   /api/fleet/trips/:id/end
GET    /api/fleet/trips/active
POST   /api/fleet/fuel
GET    /api/fleet/card/:driverId/:yyyymm
GET    /api/fleet/reports/daily
GET    /api/fleet/reports/monthly
```

---

## 🧪 Testing Strategy

1. **Unit Tests:**
   - Geo calculations (haversine, distance sum)
   - Idle detection
   - Speed calculations

2. **Integration Tests:**
   - Complete trip flow
   - Fuel wallet limits
   - Geofence detection

3. **Load Tests:**
   - GPS point ingestion (100+ points/sec)
   - Concurrent drivers
   - Report generation

---

## 📝 Notes

- Uses existing WMS authentication
- No breaking changes to current code
- Feature flag: `FLEET_ENABLED`
- All new code under `src/modules/fleet/`

---

## 🎯 Success Criteria

✅ Trip distance accuracy: ±3%  
✅ Idle detection: < 5 km/h for ≥ 5 min  
✅ Wallet alerts: 80% usage triggers alert  
✅ Wallet block: > 100% requires override  
✅ Auto-end: Trips end after 20 min no GPS  
✅ Offline: PWA queues GPS when offline  
✅ Reports: Daily/monthly with CSV export  

---

**Last Updated:** October 14, 2025  
**Next Step:** Update Prisma schema
