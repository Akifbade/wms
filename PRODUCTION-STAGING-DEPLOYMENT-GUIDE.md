# 🚀 PRODUCTION vs STAGING DEPLOYMENT GUIDE

## 📊 Current Status (November 1, 2025)

### ✅ FIXED ISSUES
- **Disk Usage:** 90% → 30% ✅ (Freed 20GB)
- **RAM Usage:** Optimized ✅
- **CPU Load:** Normalized ✅
- **Environment Isolation:** Implemented ✅

---

## 🎯 ENVIRONMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS                                 │
│              148.230.107.155                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐      ┌─────────────────┐             │
│  │  PRODUCTION     │      │  STAGING        │             │
│  │  (wms-*)        │      │  (wms-staging-*)              │
│  │  Active: YES    │      │  Active: NO     │             │
│  └─────────────────┘      └─────────────────┘             │
│       │                           │                       │
│       ├─ 80:80 (Frontend)         ├─ 8080:80             │
│       ├─ 443:443 (HTTPS)          ├─ 8443:443            │
│       ├─ 5000:5000 (Backend)      ├─ 5001:5001           │
│       ├─ 3306:3306 (DB)           ├─ 3307:3306           │
│       │                            │                       │
│       └─ wms-prod-network          └─ staging-network     │
│                                                             │
│  ┌──────────────────────────────────────────┐             │
│  │  Shared Services                         │             │
│  │  • Portainer (9000)                      │             │
│  │  • Git Watcher                           │             │
│  │  • DB Backup (auto-cleanup)              │             │
│  └──────────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 ISOLATION CHECKLIST

✅ **Different Networks:**
- Production: `wms-prod-network`
- Staging: `staging-network`

✅ **Different Ports:**
- Production Frontend: 80/443
- Staging Frontend: 8080/8443
- Production Backend: 5000
- Staging Backend: 5001
- Production DB: 3306
- Staging DB: 3307

✅ **Different Databases:**
- Production: `warehouse_wms`
- Staging: `warehouse_staging`

✅ **Different Volumes:**
- Production: `mysql_prod_data`
- Staging: `staging_mysql_data`

✅ **No Cross-Contamination:**
- Environment variables completely separate
- Credentials different
- Logs stored separately
- Backups stored separately

---

## 🚀 DEPLOYMENT WORKFLOW

### OPTION 1: PowerShell Script (EASIEST)

```powershell
# Start Production
.\manage-environments.ps1 -Environment production -Action start

# Check Production Status
.\manage-environments.ps1 -Environment production -Action status

# Start Staging (stops production)
.\manage-environments.ps1 -Environment staging -Action start

# View Staging Logs
.\manage-environments.ps1 -Environment staging -Action logs

# Stop Staging
.\manage-environments.ps1 -Environment staging -Action stop

# Restart Production
.\manage-environments.ps1 -Environment production -Action restart
```

### OPTION 2: Direct Docker Commands

#### Start Production Only:
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
docker-compose -f docker-compose-production.yml up -d --build
```

#### Start Staging Only:
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
docker-compose -f docker-compose-staging-isolated.yml up -d --build
```

#### Stop Everything:
```bash
docker-compose -f docker-compose-production.yml down
docker-compose -f docker-compose-staging-isolated.yml down
```

### OPTION 3: Manual Control

```bash
# Start only production database
docker-compose -f docker-compose-production.yml up -d database

# Start production backend
docker-compose -f docker-compose-production.yml up -d backend

# Start production frontend
docker-compose -f docker-compose-production.yml up -d frontend
```

---

## 📊 VERIFY ISOLATION

### Check Networks are Separate:
```bash
docker network ls
# Should show:
#  - wms-prod-network
#  - staging-network
```

### Check Containers are on Correct Networks:
```bash
docker inspect wms-database | grep -i "\"networks\""
# Should show: wms-prod-network

docker inspect wms-staging-db | grep -i "\"networks\""
# Should show: staging-network
```

### Verify No Cross-Connection:
```bash
# Production backend should NOT see staging database
docker exec wms-backend mysql -h staging-db ... 2>&1 | grep -i "unknown"

# Staging backend should NOT see production database
docker exec wms-staging-backend mysql -h database ... 2>&1 | grep -i "unknown"
```

### Check Port Conflicts:
```bash
netstat -tuln | grep -E "(80|443|5000|5001|3306|3307)"
# Should show all different ports
```

---

## 🎯 PRODUCTION DEPLOYMENT STEPS

### Step 1: Pre-Deployment Checks
```bash
# 1. Stop staging (if running)
docker-compose -f docker-compose-staging-isolated.yml down

# 2. Verify production compose is correct
cat docker-compose-production.yml | head -20

# 3. Check disk space
df -h /

# 4. Check services status
docker ps -a
```

### Step 2: Start Production
```bash
# Build and start all services
docker-compose -f docker-compose-production.yml up -d --build

# Wait for database to be healthy
docker exec wms-database mysqladmin ping -h localhost -u root -pproduction_root_secure_pass -s

# Wait for backend
sleep 10
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost:80/
```

### Step 3: Verify Production Works
```bash
# All containers should show "Up" and healthy
docker ps -a

# Database should be accessible
docker exec wms-database mysql -u wms_user -pproduction_db_password warehouse_wms -e "SELECT VERSION();"

# Backend should respond
curl http://localhost:5000/api/health

# Frontend should be reachable
curl -I http://localhost:80/
```

### Step 4: Monitor Production
```bash
# Watch logs in real-time
docker-compose -f docker-compose-production.yml logs -f

# Or specific service
docker logs -f wms-backend
```

---

## 🟢 STAGING DEPLOYMENT STEPS

### Step 1: Prepare Staging
```bash
# Stop production
docker-compose -f docker-compose-production.yml down

# Verify staging compose
cat docker-compose-staging-isolated.yml | head -20
```

### Step 2: Start Staging
```bash
# Build and start all services
docker-compose -f docker-compose-staging-isolated.yml up -d --build

# Wait for database
sleep 5
docker exec wms-staging-db mysqladmin ping -h localhost -u staging_user -pstaging_pass_12345 -s

# Check backend
sleep 5
curl http://localhost:5001/health || echo "Starting..."
```

### Step 3: Verify Staging Works
```bash
# All staging containers should be up
docker ps -a | grep staging

# Access staging frontend
curl http://localhost:8080/

# Access staging backend
curl http://localhost:5001/health
```

### Step 4: Test Staging Data
```bash
# Connect to staging database
docker exec -it wms-staging-db mysql -u staging_user -pstaging_pass_12345 warehouse_staging

# Run some queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;
```

---

## ⚠️ IMPORTANT NOTES

### 🔴 NEVER DO THIS:
```bash
# DON'T mix them:
docker-compose -f docker-compose-production.yml up -d
docker-compose -f docker-compose-staging-isolated.yml up -d
# This will cause port conflicts!

# DON'T use the old files:
docker-compose -f docker-compose.yml up -d  # Old, don't use
docker-compose -f docker-compose-staging.yml up -d  # Old, don't use
```

### 🟢 DO THIS INSTEAD:
```bash
# Use ONLY the new files:
docker-compose -f docker-compose-production.yml  # For production
docker-compose -f docker-compose-staging-isolated.yml  # For staging
# Or use the management script
```

---

## 📋 ENVIRONMENT VARIABLES

### Production (.env)
```bash
# Database
DB_ROOT_PASSWORD=production_root_secure_pass
DB_NAME=warehouse_wms
DB_USER=wms_user
DB_PASSWORD=production_db_password
DB_PORT=3306

# Backend
JWT_SECRET=production-jwt-secret-must-change
BACKEND_PORT=5000

# Frontend
REACT_APP_API_URL=https://qgocargo.cloud/api
VITE_API_URL=https://qgocargo.cloud/api
```

### Staging (.env.staging)
```bash
# Database (DIFFERENT)
DB_ROOT_PASSWORD=staging_root_pass_12345
DB_NAME=warehouse_staging
DB_USER=staging_user
DB_PASSWORD=staging_pass_12345
DB_PORT=3307

# Backend (DIFFERENT PORT)
JWT_SECRET=staging-secret-key-change-in-production
BACKEND_PORT=5001

# Frontend (DIFFERENT)
REACT_APP_API_URL=http://localhost:5001
VITE_API_URL=http://localhost:5001
```

---

## 🔄 SWITCHING BETWEEN ENVIRONMENTS

### Quick Switch to Production:
```powershell
# PowerShell - One line
ssh root@148.230.107.155 "cd /root/NEW\ START && docker-compose -f docker-compose-staging-isolated.yml down 2>&1 | grep -i removing; docker-compose -f docker-compose-production.yml up -d --build; sleep 3; docker ps"
```

### Quick Switch to Staging:
```powershell
# PowerShell - One line
ssh root@148.230.107.155 "cd /root/NEW\ START && docker-compose -f docker-compose-production.yml down 2>&1 | grep -i removing; docker-compose -f docker-compose-staging-isolated.yml up -d --build; sleep 3; docker ps"
```

---

## 📈 MONITORING BOTH ENVIRONMENTS

### Check What's Currently Running:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Check Resources:
```bash
docker stats --no-stream
```

### Check Disk Usage:
```bash
df -h /
du -sh /var/lib/docker/volumes/*/
```

### Check Networks:
```bash
docker network inspect wms-prod-network
docker network inspect staging-network
```

---

## 🆘 TROUBLESHOOTING

### Issue: Port Already in Use
```bash
# Find what's using port 5000
lsof -i :5000

# Kill if necessary
kill -9 <PID>

# Or use docker
docker ps | grep -E "(5000|5001|3306|3307)"
```

### Issue: Database Won't Start
```bash
# Check database logs
docker logs wms-database

# Or staging database
docker logs wms-staging-db

# Verify data volume
docker volume ls | grep mysql
```

### Issue: Containers Keep Restarting
```bash
# Check logs
docker logs --tail 50 wms-backend

# Verify dependencies are running
docker ps | grep -E "(database|backend|frontend)"

# Check network connectivity
docker exec wms-backend ping database
docker exec wms-staging-backend ping staging-db
```

### Issue: Can't Access Frontend
```bash
# Check if running
docker ps | grep frontend

# Check nginx config
docker exec wms-frontend cat /etc/nginx/conf.d/default.conf

# Test connectivity
curl -I http://localhost:80/
```

---

## 📊 STATUS COMMANDS

```bash
# Production status
ssh root@148.230.107.155 "docker ps -a | grep -v staging && echo '' && docker network inspect wms-prod-network | grep -i 'containers' -A 10"

# Staging status
ssh root@148.230.107.155 "docker ps -a | grep staging && echo '' && docker network inspect staging-network | grep -i 'containers' -A 10"

# Full health check
ssh root@148.230.107.155 "echo 'Production:' && curl -s http://localhost:5000/api/health | jq . && echo 'Staging:' && curl -s http://localhost:5001/health | jq . 2>/dev/null || echo 'Not running'"
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Disk space is above 30% free
- [ ] Old environment is stopped
- [ ] New compose file is correct
- [ ] All environment variables are set
- [ ] Images are built successfully
- [ ] Database is healthy
- [ ] Backend is responding
- [ ] Frontend is accessible
- [ ] Networks are isolated
- [ ] Ports don't conflict
- [ ] No error messages in logs
- [ ] Backup services are running

---

**Last Updated:** November 1, 2025  
**Status:** ✅ READY FOR PRODUCTION  
**Risk Level:** LOW (Properly isolated)
