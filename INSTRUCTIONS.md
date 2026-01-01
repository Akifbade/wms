# QGO WMS - Warehouse Management System
## Complete Local Development Setup & Deployment Guide

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Recent Optimizations (Jan 1, 2026)](#recent-optimizations)
3. [VPS Details](#vps-details)
4. [Local Development Setup](#local-development-setup)
5. [Deployment to VPS](#deployment-to-vps)
6. [Container Architecture](#container-architecture)
7. [Database Information](#database-information)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**QGO WMS** is a comprehensive Warehouse Management System with:
- **Backend**: Node.js + Express + Prisma ORM + TypeScript
- **Database**: MySQL 8.0
- **Frontend**: React (served via Nginx)
- **File Storage**: Local uploads folder (images, documents, shipments)
- **Deployment**: Docker containers on VPS

**Production URL**: https://qgocargo.cloud

---

## 🚀 Recent Optimizations (Jan 1, 2026)

### Critical Security Fixes
1. **Docker Port 2375 Vulnerability Fixed** ✅
   - **Issue**: Port 2375 was exposed publicly without authentication
   - **Impact**: VPS was compromised with cryptominer malware on Nov 21, 2025
   - **Fix**: Closed port 2375, secured Docker daemon to use `-H fd://` only
   - **Location**: `/etc/systemd/system/docker.service.d/override.conf`

2. **Cockpit Service Disabled** ✅
   - **Issue**: Port 9090 was open unnecessarily
   - **Fix**: `systemctl disable cockpit.socket` and stopped service

3. **Container CPU Limits Applied** ✅
   - All containers limited to 30% CPU (`--cpus=0.3` or `NanoCpus=300000000`)
   - Prevents resource abuse and Hostinger throttling

### Performance Optimizations
1. **ts-node Removed from Production** ✅
   - **Before**: Running `npx ts-node src/index.ts` (194MB memory, 5-8s startup)
   - **After**: Running compiled `node dist/index.js` (125MB memory, 2-3s startup)
   - **Impact**: 
     - 36% memory reduction
     - 50% faster startup
     - Reduced process count from 3 to 2

2. **Database Connection Fixed** ✅
   - **Issue**: DNS resolution problem after container recreation
   - **Fix**: Changed DATABASE_URL to use IP address instead of hostname
   - **Connection**: `mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms`

3. **Upload Files Restored** ✅
   - **Issue**: New container had empty uploads folder
   - **Fix**: Restored 294 files from `/root/NEW START/backend/uploads/`
   - **Total Size**: ~106MB of shipment images, logos, documents

### Hostinger VPS Throttling Resolved
- **CPU Steal**: Reduced from 93-97% to 0%
- **Status**: VPS auto-limitation lifted after 3-hour monitoring period
- **Monitoring**: `/root/check` script created for weekly security audits

---

## 🖥️ VPS Details

### Server Information
- **Provider**: Hostinger
- **Hostname**: srv1078864.hstgr.cloud
- **IP Address**: 148.230.107.155
- **OS**: AlmaLinux / CentOS
- **Resources**: 8 CPU cores, 31GB RAM

### Access Credentials
- **SSH User**: `root`
- **SSH Password**: `Qgocargo@123`
- **SSH Port**: 22 (default)

### How to Access VPS

#### Method 1: PuTTY (Windows)
```powershell
# Via PowerShell with PuTTY plink
$env:Path += ";C:\Program Files\PuTTY"
plink -batch -pw Qgocargo@123 root@148.230.107.155
```

**GUI Method:**
1. Open PuTTY
2. Host Name: `148.230.107.155`
3. Port: `22`
4. Connection Type: SSH
5. Click "Open"
6. Login as: `root`
7. Password: `Qgocargo@123`

#### Method 2: SSH (Linux/Mac)
```bash
ssh root@148.230.107.155
# Password: Qgocargo@123
```

#### File Transfer with PuTTY PSCP
```powershell
# Download from VPS
pscp -pw Qgocargo@123 root@148.230.107.155:/path/to/file .

# Upload to VPS
pscp -pw Qgocargo@123 local-file.txt root@148.230.107.155:/path/to/destination/
```

---

## 💻 Local Development Setup

### Prerequisites
- **Docker Desktop** installed and running
- **Node.js 18+** (for local development without Docker)
- **Git** (optional)

### Step 1: Extract Database
```powershell
cd "C:\Users\USER\Music\QGO WMS\database"
gunzip warehouse_wms.sql.gz
```

### Step 2: Start Docker Containers
```powershell
cd "C:\Users\USER\Music\QGO WMS"
docker-compose up -d
```

This will start:
- **wms-database-local** on port 3307
- **wms-backend-local** on port 5000
- **wms-frontend-local** on port 8080 (Nginx proxy)

### Step 3: View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f wms-backend
```

### Step 4: Access Application
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **Via Nginx**: http://localhost:8080

### Step 5: Database Access
```powershell
# Connect to MySQL
docker exec -it wms-database-local mysql -u wms_user -pwmspassword123 warehouse_wms

# Or use MySQL Workbench
# Host: localhost
# Port: 3307
# User: wms_user
# Password: wmspassword123
# Database: warehouse_wms
```

---

## 🔄 Development Workflow

### Making Code Changes

1. **Edit backend code** in `C:\Users\USER\Music\QGO WMS\backend\src\`
2. Backend will auto-reload (if using `npm run dev`)
3. For Prisma schema changes:
   ```powershell
   cd backend
   npx prisma migrate dev --name your_migration_name
   npx prisma generate
   ```

### Building for Production
```powershell
cd backend
npm run build
# Output will be in dist/ folder
```

### Testing Locally Before VPS Deployment
```powershell
# Stop dev mode
docker-compose down

# Build production image
docker-compose build wms-backend

# Start in production mode
docker-compose up -d
```

---

## 🚢 Deployment to VPS

### Step 1: Build Optimized Backend Image

**On Local PC:**
```powershell
cd "C:\Users\USER\Music\QGO WMS\backend"

# Build TypeScript
npm run build

# Create optimized Docker image
docker build -t wms-backend:compiled .
```

### Step 2: Save and Transfer Image

```powershell
# Save image to tar file
docker save wms-backend:compiled | gzip > wms-backend-compiled.tar.gz

# Transfer to VPS using PSCP
$env:Path += ";C:\Program Files\PuTTY"
pscp -pw Qgocargo@123 wms-backend-compiled.tar.gz root@148.230.107.155:/tmp/
```

### Step 3: Deploy on VPS

**SSH into VPS:**
```bash
ssh root@148.230.107.155

# Load the image
cd /tmp
gunzip wms-backend-compiled.tar.gz
docker load < wms-backend-compiled.tar

# Stop old backend
docker stop wms-backend

# Create backup of old container
docker commit wms-backend wms-backend:backup-$(date +%Y%m%d)

# Remove old container
docker rm wms-backend

# Start new container with optimized settings
docker run -d \
  --name wms-backend \
  --network fleet-network \
  --cpus=0.3 \
  -p 5000:5000 \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms' \
  -e PORT=5000 \
  -e NODE_ENV=production \
  --health-cmd="curl -f http://localhost:5000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  wms-backend:compiled

# Restore uploads if needed
docker cp /root/NEW\ START/backend/uploads/. wms-backend:/app/uploads/

# Restart frontend to refresh DNS
docker restart wms-frontend

# Verify
docker ps
docker logs wms-backend --tail 20
curl http://localhost:5000/health
```

### Step 4: Verify Production

```bash
# Check container health
docker ps | grep wms-backend

# Check logs for errors
docker logs wms-backend --tail 50

# Test API endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test"}'

# Test image upload access
curl -I http://localhost:5000/uploads/shipments/shipment-1767179217367-529193267.jpg
```

---

## 🏗️ Container Architecture

### Current Production Containers (VPS)

| Container Name | Image | Network | Ports | CPU Limit | Purpose |
|----------------|-------|---------|-------|-----------|---------|
| wms-backend | wms-backend:compiled | fleet-network | 5000:5000 | 30% | Node.js API (compiled JS) |
| wms-database | mysql:8.0 | wms-network, fleet-network | 3307:3306 | 30% | MySQL database |
| wms-frontend | nginx:alpine | fleet-network | 80:80, 443:443 | 30% | Nginx reverse proxy |
| parse-server-fleet | parseplatform/parse-server | fleet-network | 1337:1337 | 30% | Parse Server (legacy) |
| mongodb-fleet | mongo:latest | fleet-network | 27017:27017 | 30% | MongoDB (Parse data) |
| parse-dashboard-fleet | parseplatform/parse-dashboard | fleet-network | 4040:4040 | 30% | Parse Dashboard UI |
| remnanode | custom | fleet-network | - | 30% | Custom service |

### Network Configuration
- **fleet-network**: Bridge network (172.20.0.0/16)
  - wms-backend: 172.20.0.6
  - wms-database: 172.20.0.5 (also on wms-network)
  - wms-frontend: 172.20.0.3
  
- **wms-network**: Bridge network (172.18.0.0/16)
  - wms-database: 172.18.0.3

---

## 🗄️ Database Information

### MySQL Credentials
- **Host**: wms-database (Docker) or localhost:3307 (external)
- **Database**: warehouse_wms
- **User**: wms_user
- **Password**: wmspassword123
- **Root Password**: rootpassword123

### Database Backup
```bash
# On VPS - Create backup
docker exec wms-database mysqldump -u wms_user -pwmspassword123 \
  --single-transaction warehouse_wms | gzip > /tmp/wms_backup_$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip < backup.sql.gz | docker exec -i wms-database mysql -u wms_user -pwmspassword123 warehouse_wms
```

### Prisma Database Schema
Located in: `backend/prisma/schema.prisma`

To sync schema:
```bash
cd backend
npx prisma db push  # Push schema changes to database
npx prisma generate # Regenerate Prisma Client
```

---

## 🛠️ Troubleshooting

### Issue 1: 502 Bad Gateway
**Symptom**: Login page shows 502 error

**Causes**:
1. Backend container not running
2. Frontend DNS cache stale after backend restart

**Fix**:
```bash
# Restart frontend to refresh DNS
docker restart wms-frontend

# Check backend is healthy
docker ps | grep wms-backend
curl http://localhost:5000/health
```

---

### Issue 2: Internal Server Error (Database Connection)
**Symptom**: API returns 500 error, logs show "Can't reach database server"

**Cause**: DNS resolution issue (hostname pointing to ::1 instead of container IP)

**Fix**:
```bash
# Update DATABASE_URL to use IP address
docker stop wms-backend
docker run -d \
  --name wms-backend \
  --network fleet-network \
  --cpus=0.3 \
  -p 5000:5000 \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms' \
  -e NODE_ENV=production \
  wms-backend:compiled
```

**Verify**:
```bash
# Check database IP on fleet-network
docker inspect wms-database --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

# Test connection from backend
docker exec wms-backend sh -c 'getent hosts wms-database'
```

---

### Issue 3: Images Not Loading (404 Errors)
**Symptom**: Shipment images return 404

**Cause**: Uploads folder empty in new container

**Fix**:
```bash
# Restore uploads from backup
docker cp /root/NEW\ START/backend/uploads/. wms-backend:/app/uploads/

# Or from backups directory
docker cp /root/backups/pre_deploy_20251225_131843/uploads/. wms-backend:/app/uploads/

# Verify
docker exec wms-backend find /app/uploads -type f | wc -l
# Should show 294 files

# Test image access
curl -I http://localhost:5000/uploads/shipments/shipment-1767179217367-529193267.jpg
# Should return HTTP 200
```

---

### Issue 4: High CPU Usage / VPS Throttled
**Symptom**: CPU steal at 93-97%, containers slow

**Cause**: Hostinger throttling due to resource overuse

**Check**:
```bash
# View CPU steal percentage
top -b -n 1 | head -5

# Check container CPU usage
docker stats --no-stream

# Verify CPU limits
docker inspect wms-backend --format '{{.HostConfig.NanoCpus}}'
# Should show: 300000000 (30%)
```

**Fix**:
```bash
# Apply CPU limits to all containers
docker update --cpus=0.3 wms-backend
docker update --cpus=0.3 wms-database
docker update --cpus=0.3 wms-frontend

# Restart containers
docker restart wms-backend wms-database wms-frontend
```

---

### Issue 5: Port 2375 Security Check
**Symptom**: Need to verify Docker daemon is secure

**Check**:
```bash
# Run security check script
bash /root/check

# Or manual check
ss -tuln | grep 2375  # Should return empty

# Check Docker daemon config
ps aux | grep dockerd | grep 2375  # Should NOT appear

# Verify override config exists
cat /etc/systemd/system/docker.service.d/override.conf
```

**Expected Output**:
```
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
```

---

### Common Docker Commands

```bash
# View all containers
docker ps -a

# View container logs
docker logs wms-backend --tail 50 -f

# Execute command in container
docker exec -it wms-backend sh

# Restart container
docker restart wms-backend

# Stop all containers
docker stop $(docker ps -q)

# Remove stopped containers
docker container prune

# View container resource usage
docker stats

# Inspect container config
docker inspect wms-backend

# View container networks
docker network ls
docker network inspect fleet-network
```

---

## 📂 Project Structure

```
QGO WMS/
├── backend/               # Node.js backend source code
│   ├── src/              # TypeScript source files
│   ├── dist/             # Compiled JavaScript (after npm run build)
│   ├── prisma/           # Prisma ORM schema & migrations
│   ├── package.json      # Dependencies
│   ├── tsconfig.json     # TypeScript config
│   └── Dockerfile        # Backend Docker image
├── frontend/             # Nginx configuration
│   └── nginx.conf        # Reverse proxy config
├── database/             # Database dumps
│   └── warehouse_wms.sql.gz  # MySQL dump
├── uploads/              # User uploaded files
│   ├── shipments/        # Shipment images (294 files)
│   ├── logos/            # Company logos
│   ├── documents/        # Document uploads
│   ├── damages/          # Damage reports
│   └── physical-reports/ # Physical inventory reports
├── docker-compose.yml    # Local development stack
├── INSTRUCTIONS.md       # This file
├── VPS_ACCESS.md         # VPS access details
└── OPTIMIZATION_LOG.md   # Recent changes log
```

---

## 🔐 Security Best Practices

1. **Never expose Docker port 2375** without TLS authentication
2. **Use CPU limits** on all production containers (30% max)
3. **Regular security audits**: Run `/root/check` weekly
4. **Keep backups**: Database dumps + container images before changes
5. **Monitor logs**: `docker logs` and `journalctl -u docker`
6. **Use environment variables** for sensitive data (never hardcode)

---

## 📞 Support & Resources

### Documentation Files on VPS
- `/root/SECURITY_README.md` - Security incident documentation
- `/root/check` - Security audit script
- `/root/fix-docker-port` - Auto-fix for port 2375 issue

### Backup Locations on VPS
- `/root/NEW START/backend/` - Latest backend source with uploads
- `/root/backups/` - Pre-deployment backups
- `/root/wms-backups/` - Automated database backups

### Container Images (VPS)
- `wms-backend:compiled` - Current production (optimized, Jan 1 2026)
- `wms-backend-backup-jan01` - Backup before optimization
- `ghcr.io/akifbade/wms-backend:latest` - Original unoptimized version

---

## ✅ Pre-Deployment Checklist

Before deploying to VPS:

- [ ] Test locally with `docker-compose up`
- [ ] Run `npm run build` to compile TypeScript
- [ ] Check database migrations are applied
- [ ] Verify environment variables are correct
- [ ] Create backup of current VPS container
- [ ] Test API endpoints locally
- [ ] Verify upload files are included
- [ ] Check Docker image size (should be ~1.5GB)
- [ ] Document any new environment variables
- [ ] Update this INSTRUCTIONS.md if architecture changed

---

**Last Updated**: January 1, 2026  
**Optimized By**: AI Assistant  
**Production Status**: ✅ Running & Optimized  
**VPS Status**: ✅ Throttling Resolved, CPU Steal 0%
