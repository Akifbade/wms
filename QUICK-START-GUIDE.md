# 🚀 QUICK START - Staging vs Production

## Access URLs

| Environment | URL | Purpose | Status |
|-------------|-----|---------|--------|
| **PRODUCTION** | https://qgocargo.cloud | Live users | ✅ Running (ports 80/443) |
| **STAGING** | http://staging.qgocargo.cloud:8080 | Testing features | ✅ Running (port 8080) |

---

## Port Map

```
PRODUCTION (root user)          STAGING (staging user)
├─ Port 80/443  → Frontend      ├─ Port 8080/8443 → Frontend
├─ Port 5000    → Backend       ├─ Port 5001     → Backend
└─ Port 3307    → Database      └─ Port 3308     → Database
```

---

## Database Quick Look

| Database | Location | Size | Shipments | Access |
|----------|----------|------|-----------|--------|
| Production | 148.230.107.155:3307 | Full | 3 | root only |
| Staging | 148.230.107.155:3308 | Fresh | 0 | staging user |

---

## SSH Commands

### Access Production (Root)
```bash
ssh root@148.230.107.155
# Password: Qgocargo@123

# View production containers
cd '/root/NEW START' && docker-compose ps

# View production database
docker exec wms-database mysql -u root -pQgocargo@123 warehouse_wms
```

### Access Staging (Non-root)
```bash
ssh staging@148.230.107.155
# Password: stagingpass123

# View staging containers
cd ~/staging-app && docker-compose ps

# View staging database
docker exec staging-database mysql -u staging_user -pstagingpass123 warehouse_wms_staging
```

---

## What Changed This Session

✅ **CBM Feature Implemented**
- Added 5 dimensions fields (length, width, height, cbm, weight)
- Auto-calculation: CBM = (L×W×H)/1,000,000
- Deployed to production ✅
- Deployed to staging ✅

✅ **Staging Environment Created**
- Non-root `staging` user account
- Separate `/home/staging/staging-app/` directory
- Separate docker-compose with ports 8080/8443, 5001, 3308
- Separate database: `warehouse_wms_staging`
- Separate network: `staging-network`
- DNS: `staging.qgocargo.cloud` → 148.230.107.155

✅ **Architecture Separation**
- 6 layers of isolation
- Production data safe and untouched
- Staging ready for testing
- AI can't accidentally touch production

---

## Testing the CBM Feature

### In Staging (Safe to Experiment)
1. Go to: `http://staging.qgocargo.cloud:8080`
2. Login
3. Create a shipment
4. Fill in dimensions (cm)
5. See CBM auto-calculate
6. Submit

**Result:** Feature works without affecting production ✅

### In Production (After Approval)
1. Go to: `https://qgocargo.cloud`
2. Login
3. Same process
4. Real users see new feature
5. Data stored in production database

---

## Key Decision: Different Ports, Same Server

**Why?** Cost-effective, easy to manage  
**How Separated?**
- Staging: Port 8080 (staging-frontend) → 5001 (staging-backend)
- Production: Port 80 (frontend) → 5000 (backend)
- Nginx routes based on domain name

**Future?** If staging needs to scale, move to different IP and update DNS A record

---

## For the Next Feature

1. **Develop locally**
2. **Deploy to staging** → Test at `staging.qgocargo.cloud:8080`
3. **Get user approval** → User says "looks good"
4. **Deploy to production** → Available at `qgocargo.cloud`

No more accidental production changes! ✅

---

## Current Status Overview

```
┌─── PRODUCTION (LIVE) ───┐         ┌─── STAGING (TEST) ───┐
│                         │         │                      │
│ qgocargo.cloud          │         │ staging.              │
│ (port 80/443)           │         │ qgocargo.cloud        │
│                         │         │ (port 8080)           │
│ Users: LIVE             │         │ Users: TEST ONLY      │
│ Data: 3 shipments ✅    │         │ Data: FRESH (0) ✅    │
│ Backend: 5000 ✅        │         │ Backend: 5001 ✅      │
│ Database: 3307 ✅       │         │ Database: 3308 ✅     │
│ Owner: root             │         │ Owner: staging        │
│                         │         │                      │
└─────────────────────────┘         └──────────────────────┘
  CAREFUL!                              SAFE TO EXPERIMENT!
```

---

## Emergency Reference

**Everything Still Running?**
```bash
ssh root@148.230.107.155
cd '/root/NEW START' && docker-compose ps
```

**Staging Down?**
```bash
ssh staging@148.230.107.155
cd ~/staging-app && docker-compose restart
```

**Check Staging DB Status?**
```bash
ssh root@148.230.107.155
docker exec staging-database mysql -u staging_user -pstagingpass123 -e "SHOW DATABASES;"
```

**View Live Logs?**
```bash
ssh root@148.230.107.155
cd '/root/NEW START' && docker-compose logs -f frontend
```

---

## Safety Checklist ✅

- [x] Production and staging use different ports ✅
- [x] Production and staging use different databases ✅
- [x] Production and staging use different users ✅
- [x] Production and staging on different docker networks ✅
- [x] Staging user cannot access production files ✅
- [x] CBM feature deployed to production ✅
- [x] Production data (3 shipments) preserved ✅
- [x] Staging ready for testing ✅

---

**Status: ✅ ALL SYSTEMS OPERATIONAL**  
**Last Updated: 2025-10-29 09:54 UTC**
