# 🚨 Production Backend Troubleshooting Guide

## Issue: Internal Fetch Error - Shipments Not Moving to Racks

**Symptoms:**
- ✅ Local: Working perfectly
- ✅ Staging: Working perfectly  
- ❌ Production: "Internal fetch error" when moving shipments from pending to rack

---

## 🔍 Step 1: Check Backend Logs

### SSH into Production Server:
```powershell
ssh root@148.230.107.155
```

### Check Backend Container Logs:
```bash
# Real-time logs
docker logs -f wms-backend

# Last 100 lines
docker logs --tail 100 wms-backend

# Search for errors
docker logs wms-backend 2>&1 | grep -i error

# Search for specific endpoint
docker logs wms-backend 2>&1 | grep -i "shipment"
```

### Check Container Status:
```bash
docker ps -a | grep wms
```

**Look for:**
- Container status (Up vs Exited)
- Restart count (high = crashing)
- Health status

---

## 🔍 Step 2: Check Database Connection

### Test Database from Backend Container:
```bash
# Enter backend container
docker exec -it wms-backend sh

# Test MySQL connection (inside container)
mysql -h wms-database -u root -p'your_mysql_root_password' wms_db

# Check tables exist
SHOW TABLES;

# Check shipments data
SELECT id, status FROM shipments LIMIT 5;

# Exit MySQL
exit

# Exit container
exit
```

### Common Database Issues:
1. **Wrong password** in production `.env`
2. **Database not initialized** 
3. **Missing tables/migrations**
4. **Network connectivity** between containers

---

## 🔍 Step 3: Check Environment Variables

### View Production Backend .env:
```bash
ssh root@148.230.107.155
cd "/root/NEW START"
cat backend/.env
```

### Critical Variables to Check:
```env
# Database
DB_HOST=wms-database          ← Should match docker-compose service name
DB_PORT=3306
DB_NAME=wms_db
DB_USER=root
DB_PASSWORD=your_password     ← Must match docker-compose MySQL password

# Backend
PORT=5000
NODE_ENV=production           ← Must be "production"

# CORS
FRONTEND_URL=http://qgocargo.cloud  ← Check this!
```

### Compare with Staging:
```bash
# Staging env (working)
cd "/root/NEW START"
cat backend/.env

# Check differences
diff backend/.env staging-backend/.env
```

---

## 🔍 Step 4: Check API Endpoint Accessibility

### From Your Local Machine:
```powershell
# Test backend health
curl http://qgocargo.cloud/api/health

# Test specific shipment endpoint (replace with actual ID)
curl http://qgocargo.cloud/api/shipments

# Check CORS
curl -H "Origin: http://qgocargo.cloud" `
     -H "Access-Control-Request-Method: POST" `
     -H "Access-Control-Request-Headers: Content-Type" `
     -X OPTIONS http://qgocargo.cloud/api/shipments/assign-rack
```

### From Production Server:
```bash
ssh root@148.230.107.155

# Test from host
curl http://localhost/api/health

# Test from backend container
docker exec wms-backend curl http://localhost:5000/health
```

---

## 🔧 Quick Fixes

### Fix 1: Restart Backend Container
```bash
ssh root@148.230.107.155
docker restart wms-backend

# Wait 10 seconds
sleep 10

# Check logs
docker logs --tail 50 wms-backend
```

### Fix 2: Rebuild Backend Container
```bash
ssh root@148.230.107.155
cd "/root/NEW START"

# Stop backend
docker-compose stop wms-backend

# Rebuild with no cache
docker-compose build --no-cache wms-backend

# Start backend
docker-compose up -d wms-backend

# Check logs
docker logs -f wms-backend
```

### Fix 3: Reset Database (⚠️ CAUTION - Data Loss!)
```bash
ssh root@148.230.107.155
cd "/root/NEW START"

# Backup first!
docker exec wms-database mysqldump -u root -p'password' wms_db > backup-$(date +%Y%m%d).sql

# Reset database
docker-compose down
docker volume rm "new start_mysql-data" # Note the space!

# Restart
docker-compose up -d

# Run migrations
docker exec -it wms-backend npm run migrate
```

### Fix 4: Copy Working Staging Config to Production
```bash
ssh root@148.230.107.155
cd "/root/NEW START"

# Backup production env
cp backend/.env backend/.env.backup

# Copy from staging (if staging is working)
cp staging-backend/.env backend/.env

# Update production-specific values
nano backend/.env
# Change:
# - FRONTEND_URL to production URL
# - DB_HOST if different
# - Any production-specific secrets

# Restart backend
docker restart wms-backend
```

---

## 🔍 Step 5: Check Frontend-Backend Communication

### Check Frontend Environment:
```bash
ssh root@148.230.107.155

# Check frontend build config
cat "/root/NEW START/frontend/dist/index.html" | grep -i api

# Check nginx config
docker exec wms-frontend cat /etc/nginx/conf.d/default.conf
```

### Verify API Proxy in Nginx:
```nginx
# Should have this block:
location /api {
    proxy_pass http://wms-backend:5000;  ← Backend container name
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### Test Nginx Proxy:
```bash
# From production server
ssh root@148.230.107.155

# Test direct backend
curl http://wms-backend:5000/health

# Test through nginx
curl http://localhost/api/health
```

---

## 🔍 Step 6: Network Inspection

### Check Docker Network:
```bash
ssh root@148.230.107.155

# List networks
docker network ls

# Inspect network
docker network inspect "new start_default"

# Check if all containers are on same network
docker inspect wms-frontend | grep NetworkMode
docker inspect wms-backend | grep NetworkMode
docker inspect wms-database | grep NetworkMode
```

### Test Container-to-Container Communication:
```bash
# From frontend to backend
docker exec wms-frontend ping -c 3 wms-backend

# From backend to database
docker exec wms-backend ping -c 3 wms-database

# Test actual connection
docker exec wms-backend curl http://wms-backend:5000/health
```

---

## 📋 Common Production Issues & Solutions

### Issue 1: CORS Error
**Symptom:** "CORS policy blocked" in browser console

**Fix:**
```bash
# Update backend CORS config
ssh root@148.230.107.155
cd "/root/NEW START/backend"

# Edit .env
nano .env
# Set: FRONTEND_URL=http://qgocargo.cloud

# Restart
docker restart wms-backend
```

### Issue 2: Database Connection Refused
**Symptom:** "ECONNREFUSED" or "Can't connect to MySQL"

**Fix:**
```bash
# Check database is running
docker ps | grep wms-database

# Check database logs
docker logs wms-database

# Test connection
docker exec wms-backend nc -zv wms-database 3306
```

### Issue 3: Wrong API Base URL
**Symptom:** Frontend calling wrong backend URL

**Fix:**
```bash
# Rebuild frontend with correct API URL
cd frontend
# Update .env.production
echo "VITE_API_URL=http://qgocargo.cloud/api" > .env.production

# Rebuild
npm run build

# Deploy
docker cp dist/. wms-frontend:/usr/share/nginx/html/
docker exec wms-frontend nginx -s reload
```

### Issue 4: Missing Migrations
**Symptom:** "Table doesn't exist" errors

**Fix:**
```bash
ssh root@148.230.107.155

# Run migrations
docker exec -it wms-backend npm run migrate

# Or manually
docker exec -it wms-backend sh
cd backend
npx prisma migrate deploy
exit
```

### Issue 5: Port Conflicts
**Symptom:** Backend won't start, port already in use

**Fix:**
```bash
# Check what's using port 5000
netstat -tulpn | grep 5000

# Kill process or change backend port
docker-compose down
# Edit docker-compose.yml backend port
docker-compose up -d
```

---

## 🎯 Systematic Debugging Steps

### 1. **Verify Backend is Running:**
```bash
docker ps | grep wms-backend
```
**Expected:** Status "Up", not "Restarting"

### 2. **Check Backend Logs for Startup Errors:**
```bash
docker logs wms-backend 2>&1 | head -50
```
**Look for:** Database connection, port binding, initialization errors

### 3. **Test Backend Health Endpoint:**
```bash
curl http://qgocargo.cloud/api/health
```
**Expected:** `{"status": "ok"}` or similar

### 4. **Test Specific Failing Endpoint:**
```bash
# Replace with actual failing endpoint
curl -X POST http://qgocargo.cloud/api/shipments/assign-rack \
  -H "Content-Type: application/json" \
  -d '{"shipmentId": "test123", "rackId": "A1"}'
```
**Look for:** Error messages, stack traces

### 5. **Check Browser Console:**
- Open http://qgocargo.cloud
- Press F12 → Console tab
- Try the failing action
- **Look for:** Network errors, 404s, 500s, CORS errors

### 6. **Check Browser Network Tab:**
- F12 → Network tab
- Try the failing action
- Click failed request
- **Check:** Request URL, Status Code, Response

---

## 🚀 Emergency Rollback

### If Nothing Works - Rollback:
```bash
ssh root@148.230.107.155
cd "/root/NEW START"

# Stop production
docker-compose stop wms-backend wms-frontend

# Copy from staging (known working)
docker cp wms-staging-backend:/app/. backup-backend/
docker cp wms-staging-frontend:/usr/share/nginx/html/. backup-frontend/

# Deploy backup to production
docker cp backup-frontend/. wms-frontend:/usr/share/nginx/html/
docker exec wms-frontend nginx -s reload

# For backend - rebuild from staging code
# (This is more complex, better to fix the issue)

# Start production
docker-compose start wms-backend wms-frontend
```

---

## 📞 Quick Commands Cheat Sheet

```bash
# 1. SSH into server
ssh root@148.230.107.155

# 2. Check all containers
docker ps -a

# 3. Backend logs (real-time)
docker logs -f wms-backend

# 4. Backend logs (last 100 lines)
docker logs --tail 100 wms-backend

# 5. Restart backend
docker restart wms-backend

# 6. Enter backend container
docker exec -it wms-backend sh

# 7. Check backend env
docker exec wms-backend env | grep -i db

# 8. Test database connection
docker exec wms-backend nc -zv wms-database 3306

# 9. Backend health check
curl http://qgocargo.cloud/api/health

# 10. Rebuild backend
cd "/root/NEW START" && docker-compose build --no-cache wms-backend && docker-compose up -d wms-backend
```

---

## 🎯 Most Likely Causes (In Order of Probability)

1. **Environment Variable Mismatch** (70%)
   - Wrong DB_HOST, DB_PASSWORD
   - Wrong FRONTEND_URL for CORS
   - NODE_ENV not set to "production"

2. **Database Connection Issue** (15%)
   - Database container not running
   - Network connectivity problem
   - Migrations not run

3. **CORS Configuration** (10%)
   - Backend not allowing production frontend URL
   - Missing or wrong CORS headers

4. **Code Difference** (5%)
   - Production has old code
   - Build failed silently
   - Missing dependencies

---

## ✅ Success Checklist

After fixing, verify:

- [ ] Backend container is running: `docker ps | grep wms-backend`
- [ ] No errors in logs: `docker logs wms-backend`
- [ ] Health endpoint works: `curl http://qgocargo.cloud/api/health`
- [ ] Database is accessible from backend
- [ ] Frontend can reach backend through nginx
- [ ] CORS is configured correctly
- [ ] Can move shipment from pending to rack
- [ ] No errors in browser console
- [ ] All other features still work

---

**Created:** 2025-10-31  
**Purpose:** Debug production-specific backend issues when local and staging work fine
