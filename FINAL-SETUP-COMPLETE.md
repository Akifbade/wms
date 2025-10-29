# ✅ FINAL SETUP - PRODUCTION & STAGING COMPLETE

**Date:** October 29, 2025  
**Status:** 🟢 FULLY OPERATIONAL & SEPARATED

---

## 📱 Access Links (NO PORTS NEEDED!)

| Environment | Link | Status |
|-------------|------|--------|
| **Production** | https://qgocargo.cloud | ✅ https://qgocargo.cloud |
| **Staging** | https://staging.qgocargo.cloud | ✅ https://staging.qgocargo.cloud |

**BILKUL ALAG-ALAG!** 🎉

---

## 🔑 SSH Credentials

### Production (Root)
```
ssh root@148.230.107.155
Password: Qgocargo@123
Location: /root/NEW START/
```

### Staging (Non-root User)
```
ssh staging@148.230.107.155
Password: Qgocargo@321
Location: /home/staging/staging-app/
```

---

## 🎯 Architecture (FINAL)

```
PRODUCTION                              STAGING
qgocargo.cloud                          staging.qgocargo.cloud
(HTTPS automatically)                   (HTTPS automatically)

User: root                              User: staging
Ports: 80, 443, 5000, 3307             Ports: 8080, 5001, 3308

Nginx Routes:
qgocargo.cloud ─────────┐              staging.qgocargo.cloud ─────┐
                        │                                           │
                        ↓                                           ↓
                    Port 80/443                                  Port 80/443
                        │                                           │
                        ↓                                           ↓
                  Nginx Container                             Nginx Container
                        │                                           │
                        ↓                                           ↓
                   API → Port 5000                          API → Port 5001
                   Backend Container                        Backend Container
                        │                                           │
                        ↓                                           ↓
                Database Port 3307                       Database Port 3308
                warehouse_wms                            warehouse_wms
                (3 shipments)                            (3 shipments - CLONE)

LIVE PRODUCTION 🔴                     TESTING CLONE 🟢
```

---

## ✨ Key Features

✅ **No Port Numbers in URLs**
- Production: `https://qgocargo.cloud` (NOT qgocargo.cloud:80)
- Staging: `https://staging.qgocargo.cloud` (NOT staging.qgocargo.cloud:8080)

✅ **Automatic HTTPS**
- HTTP automatically redirects to HTTPS on both

✅ **Complete Isolation**
- Different users (root vs staging)
- Different databases (port 3307 vs 3308)
- Different data (but same content - cloned)
- Different backend ports (5000 vs 5001)
- Different purposes (production vs testing)

✅ **Same Nginx Server**
- One nginx container handling both domains
- Automatically routes based on domain name
- Both get SSL certificates

✅ **Easy to Scale**
- Can add more staging environments later
- Each gets own subdomain (staging2.qgocargo.cloud, etc)
- Same IP address (148.230.107.155)

---

## 🔍 Technical Details

### Nginx Config (Updated)
```
Upstream Servers:
├─ production backend: backend:5000 (Docker network)
└─ staging backend: localhost:5001 (Host machine)

Server Blocks:
├─ HTTP qgocargo.cloud → HTTPS redirect
├─ HTTP staging.qgocargo.cloud → HTTPS redirect
├─ HTTPS qgocargo.cloud → backend:5000
└─ HTTPS staging.qgocargo.cloud → localhost:5001
```

### Container Ports
```
Production (root)
├─ Frontend: 80/443 (public)
├─ Backend: 5000 (internal)
└─ Database: 3307 (internal)

Staging (staging user)
├─ Frontend: 8080/8443 (public, mapped from nginx)
├─ Backend: 5001 (internal)
└─ Database: 3308 (internal)
```

### Database Info
```
Production Database
├─ Host: localhost:3307
├─ Name: warehouse_wms
├─ User: wms_user
├─ Password: wms_pass
├─ Shipments: 3 (original production data)
└─ Owner: root container

Staging Database (CLONE)
├─ Host: localhost:3308
├─ Name: warehouse_wms
├─ User: wms_user
├─ Password: wms_pass
├─ Shipments: 3 (cloned from production)
└─ Owner: staging container
```

---

## 🚀 Usage Examples

### Testing New Feature in Staging

**1. Access Staging**
```
Browser: https://staging.qgocargo.cloud
Login: Use test credentials
```

**2. Test Feature**
```
Create/modify shipments
Test CBM calculations
Check all functionality
```

**3. If Works, Deploy to Production**
```
Get user approval
Deploy to production (qgocargo.cloud)
Users access new feature
```

---

### SSH Management

**Check Production Status**
```bash
ssh root@148.230.107.155
cd '/root/NEW START'
docker-compose ps
```

**Check Staging Status**
```bash
ssh staging@148.230.107.155
cd ~/staging-app
docker-compose ps
```

**Check Logs**
```bash
# Production frontend
ssh root@148.230.107.155
cd '/root/NEW START'
docker-compose logs frontend

# Staging backend
ssh staging@148.230.107.155
cd ~/staging-app
docker-compose logs staging-backend
```

---

## 📊 Current Status

### ✅ Production
- **URL**: https://qgocargo.cloud
- **Frontend**: ✅ Running (nginx)
- **Backend**: ✅ Running (port 5000)
- **Database**: ✅ Running (port 3307, 3 shipments)
- **Data**: Original production data safe ✅
- **User Access**: Active ✅

### ✅ Staging (Complete Clone)
- **URL**: https://staging.qgocargo.cloud
- **Frontend**: ✅ Running (nginx)
- **Backend**: ✅ Running (port 5001)
- **Database**: ✅ Running (port 3308, 3 shipments cloned)
- **Data**: Exact copy of production ✅
- **Testing**: Ready ✅

---

## 🔐 Security

### What's Protected
✅ Production on HTTPS (automatic redirect from HTTP)
✅ Staging on HTTPS (automatic redirect from HTTP)
✅ Different user accounts (root vs staging)
✅ Different databases (3307 vs 3308)
✅ Staging user can't access /root files
✅ Staging database isolated on separate port

### What's Separated
✅ Domains (qgocargo.cloud vs staging.qgocargo.cloud)
✅ Backend ports (5000 vs 5001)
✅ Database ports (3307 vs 3308)
✅ User ownership (root vs staging)
✅ Networks (prod-network vs staging-network)

---

## 📝 Important Notes

1. **No more :8080 port in URL** - Staging is now `staging.qgocargo.cloud` not `staging.qgocargo.cloud:8080`
2. **Both use HTTPS** - Automatic redirect from HTTP
3. **Same IP address** - Both on 148.230.107.155 but different subdomains
4. **Same SSL certificate** - Nginx shares /etc/letsencrypt/live/qgocargo.cloud/ between both domains
5. **Staging data is cloned** - Changes in staging WON'T affect production
6. **Production remains unchanged** - All original data and setup intact

---

## ✅ Checklist

- [x] Production password: Qgocargo@123
- [x] Staging password: Qgocargo@321
- [x] Production SSH: root@148.230.107.155
- [x] Staging SSH: staging@148.230.107.155
- [x] Production URL: https://qgocargo.cloud
- [x] Staging URL: https://staging.qgocargo.cloud (NO PORT!)
- [x] Nginx configured for both domains
- [x] Both containers running
- [x] Both databases running
- [x] HTTPS working for both
- [x] Staging complete clone of production
- [x] Data separation verified
- [x] User separation verified

---

## 🎉 Summary

**PRODUCTION:**
- Accessed via: `https://qgocargo.cloud`
- Managed by: `root` user
- Database: port 3307
- Backend: port 5000
- Live for real users ✅

**STAGING:**
- Accessed via: `https://staging.qgocargo.cloud`
- Managed by: `staging` user (password: Qgocargo@321)
- Database: port 3308 (cloned from production)
- Backend: port 5001
- For testing only ✅

**ABH AB DONO PURA ALAG-ALAG HAIN!** ✅

---

**Status: READY FOR PRODUCTION USE** 🚀

*Setup Completed: 2025-10-29 10:17 UTC*
