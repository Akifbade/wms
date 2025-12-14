# VPS DEPLOYMENT GUIDE - WMS PROJECT

## 🎯 Quick Start Guide

### Prerequisites
- PuTTY installed (for Windows)
- SSH access to your VPS
- VPS IP address and root password

---

## 📋 Option 1: Using PowerShell Script (RECOMMENDED for Windows)

### Step 1: Update VPS IP
Open `Deploy-VPS.ps1` and update line 7:
```powershell
[string]$VpsIp = "your-actual-vps-ip"
```

### Step 2: Full Backup + Sync
```powershell
.\Deploy-VPS.ps1 -Action full
```

### Step 3: Only Backup (No Sync)
```powershell
.\Deploy-VPS.ps1 -Action backup
```

### Step 4: Only Sync (No Backup - NOT RECOMMENDED)
```powershell
.\Deploy-VPS.ps1 -Action sync
```

---

## 📋 Option 2: Manual Steps Using PuTTY

### Step 1: Connect to VPS
1. Open PuTTY
2. Enter your VPS IP
3. Login as root

### Step 2: Create Backup Script on VPS
```bash
# Create backup directory
mkdir -p /root/wms-backups

# Upload vps-backup.sh using PSCP or manually create it
nano /root/vps-backup.sh
# Paste the content from vps-backup.sh
# Save with Ctrl+X, Y, Enter

# Make it executable
chmod +x /root/vps-backup.sh
```

### Step 3: Update Database Password in Backup Script
```bash
nano /root/vps-backup.sh
# Find line: DB_PASS="your_secure_password_here"
# Replace with actual password from .env or docker-compose.yml
```

### Step 4: Run Full Backup
```bash
cd /root
./vps-backup.sh
```

This will create: `/root/wms-backups/wms_full_backup_YYYYMMDD_HHMMSS.tar.gz`

### Step 5: Download Backup to Local (Optional)
From your Windows machine:
```powershell
pscp root@your-vps-ip:/root/wms-backups/wms_full_backup_*.tar.gz .\vps-backups\
```

### Step 6: Sync New Code to VPS

#### Option A: Using PSCP (Windows)
```powershell
# Stop containers
plink root@your-vps-ip "cd /root/wms && docker-compose down"

# Sync backend
pscp -r backend\src root@your-vps-ip:/root/wms/backend/
pscp -r backend\prisma root@your-vps-ip:/root/wms/backend/

# Sync frontend
pscp -r frontend\src root@your-vps-ip:/root/wms/frontend/
pscp -r frontend\public root@your-vps-ip:/root/wms/frontend/

# Sync configs
pscp docker-compose*.yml root@your-vps-ip:/root/wms/

# Rebuild and start
plink root@your-vps-ip "cd /root/wms && docker-compose build && docker-compose up -d"
```

#### Option B: Using Git (if VPS has git)
```bash
# On VPS
cd /root/wms
git pull origin stable/prisma-mysql-production
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 🔧 Important Configuration Updates

### 1. Update vps-backup.sh
Edit line 16 with your actual database password:
```bash
DB_PASS="your_actual_password"
```

### 2. Update Deploy-VPS.ps1
Edit line 7 with your actual VPS IP:
```powershell
[string]$VpsIp = "123.456.789.012"
```

---

## 📦 What Gets Backed Up

1. **Database**: Complete MySQL dump (compressed)
2. **Uploads**: All uploaded files (logos, documents, materials)
3. **Docker Configs**: docker-compose files, .env
4. **Nginx Configs**: All nginx configuration files
5. **Project Code**: Backend + Frontend source code (excluding node_modules)
6. **Docker Volumes**: List of all volumes

---

## 🚨 Safety Features

- ✅ Full backup created BEFORE any sync
- ✅ Containers stopped gracefully before updates
- ✅ Backup downloaded to local machine
- ✅ Verification after deployment
- ✅ Logs displayed for troubleshooting

---

## 🔍 Troubleshooting

### Connection Failed
```powershell
# Test connection
plink root@your-vps-ip "echo 'Connection OK'"
```

### Backup Failed
```bash
# Check disk space
df -h

# Check database container
docker ps | grep database

# Check database connection
docker exec wms-database mysql -uwms_user -p -e "SHOW DATABASES;"
```

### Deployment Failed
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend

# Restart containers
docker-compose restart

# Full rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Verify Deployment

After deployment, check:

```bash
# Container status
docker-compose ps

# Backend health
curl http://localhost:5000/api/health

# Frontend
curl http://localhost:3000

# Database
docker exec wms-database mysql -uwms_user -p -e "USE wms_db; SHOW TABLES;"
```

---

## 🔄 Rollback (If Something Goes Wrong)

```bash
# Stop current containers
cd /root/wms
docker-compose down

# Find backup
ls -lh /root/wms-backups/

# Extract backup (example)
cd /root
tar -xzf wms-backups/wms_full_backup_20251211_184500.tar.gz

# Restore database
docker-compose up -d database
sleep 10
gunzip backup_20251211_184500/database/*.sql.gz
docker exec -i wms-database mysql -uwms_user -p wms_db < backup_20251211_184500/database/*.sql

# Restore files
cp -r backup_20251211_184500/uploads/* /root/wms/backend/uploads/

# Start containers
docker-compose up -d
```

---

## 📞 Support Commands

```bash
# Real-time logs
docker-compose logs -f

# Container resource usage
docker stats

# Restart specific service
docker-compose restart backend

# Execute command in container
docker exec -it wms-backend sh

# Database shell
docker exec -it wms-database mysql -uwms_user -p wms_db
```

---

## ✅ Recommended Workflow

1. **Backup First** (Always!)
   ```powershell
   .\Deploy-VPS.ps1 -Action backup
   ```

2. **Verify Backup Downloaded**
   ```powershell
   ls .\vps-backups\
   ```

3. **Deploy Updates**
   ```powershell
   .\Deploy-VPS.ps1 -Action sync
   ```

4. **Verify Deployment**
   ```powershell
   plink root@your-vps-ip "cd /root/wms && docker-compose ps"
   ```

5. **Test Application**
   - Open browser: `http://your-vps-ip`
   - Login and test features

---

## 🎯 One-Command Full Operation

```powershell
# This does everything: Backup → Download → Sync → Deploy
.\Deploy-VPS.ps1 -VpsIp "123.456.789.012" -Action full
```

---

**Note**: Always keep multiple backups and test on staging before production!
