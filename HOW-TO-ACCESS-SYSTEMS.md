# 🌐 HOW TO ACCESS WMS & QGO SYSTEMS

**Date:** October 22, 2025  
**Status:** ✅ Both Systems Ready to Access

---

## 📍 QUICK ACCESS SUMMARY

### 🏢 **WMS System (Warehouse Management)**
```
📍 URL: http://148.230.107.155
🔒 HTTPS: https://148.230.107.155

Port: 80 (HTTP) / 443 (HTTPS)
```

### 🚀 **QGO System (Cargo Management)**
```
📍 URL: http://148.230.107.155:3000

Port: 3000
```

### 📊 **Database Access**
```
Host: 148.230.107.155
Port: 3306
User: root
Pass: Qgocargo@123
```

---

## 🏢 WMS SYSTEM - COMPLETE ACCESS GUIDE

### 1️⃣ **Access via IP Address (RIGHT NOW)**

#### Option A: HTTP (No SSL)
```
http://148.230.107.155
```
- ✅ Works immediately
- ⚠️ Not encrypted
- ✅ No certificate warnings

#### Option B: HTTPS (With SSL)
```
https://148.230.107.155
```
- ✅ Encrypted connection
- ⚠️ Browser shows security warning (self-signed cert - this is normal!)
- ✅ Click "Advanced" → "Proceed anyway" to access

### 2️⃣ **QGO Login Credentials**

**Admin Account:**
```
Email:    admin@qgo.com
Password: Admin@123
```
- ✅ Full admin access
- ✅ Can manage all users and settings

**Driver Account:**
```
Email:    acshona143@gmail.com
Password: AAAAAA
```
- ✅ Driver access
- ✅ Can manage jobs and cargo

### 3️⃣ **WMS Features Available**

Once logged in:
- ✅ Dashboard with statistics
- ✅ Inventory management
- ✅ Shipment tracking
- ✅ User management
- ✅ Reports and analytics
- ✅ Settings and configuration
- ✅ File uploads

### 4️⃣ **API Access**

Backend API running on Port 5000:

```bash
# Test API (no auth needed)
curl http://148.230.107.155/api/health

# Get users (with auth)
curl -H "Authorization: Bearer TOKEN" \
  http://148.230.107.155/api/users

# Get inventory
curl http://148.230.107.155/api/inventory
```

---

## 🚀 QGO SYSTEM - COMPLETE ACCESS GUIDE

### 1️⃣ **Access via IP Address (RIGHT NOW)**

```
http://148.230.107.155:3000
```
- ✅ Accessible immediately
- ✅ QGO cargo management system
- ✅ Node.js application running

### 2️⃣ **Access via Domain (After DNS Update)**

```
https://qgocargo.cloud:3000
```
- ✅ Will work after DNS propagation
- ✅ Port 3000 redirects to application
- ✅ Professional access

### 3️⃣ **QGO Features**

The QGO system provides:
- ✅ Cargo tracking
- ✅ Fleet management
- ✅ Route optimization
- ✅ Driver assignments
- ✅ Real-time updates
- ✅ Mobile-friendly interface

---

## 📊 DATABASE ACCESS

### Direct MySQL Connection

#### Via Command Line:
```bash
mysql -h 148.230.107.155 -u root -p'Qgocargo@123'
```

#### Via GUI Client (HeidiSQL, MySQL Workbench):
```
Host:     148.230.107.155
Port:     3306
Username: root
Password: Qgocargo@123
```

### Available Databases

#### 1. **wms_db** (WMS System Database)
```sql
USE wms_db;
SHOW TABLES;

-- Common tables:
-- users, inventory, shipments, invoices, etc.
```

#### 2. **wms_production** (Production Database)
```sql
USE wms_production;
SHOW TABLES;

-- Production data and analytics
```

#### 3. **qgo_db** (QGO Cargo System)
```sql
USE qgo_db;
SHOW TABLES;

-- Cargo tracking, fleet, drivers
```

### Useful Database Commands

```bash
# SSH into server
ssh root@148.230.107.155

# Access MySQL console
mysql -u root -p'Qgocargo@123'

# Show all databases
SHOW DATABASES;

# Show tables in database
USE wms_db;
SHOW TABLES;

# Count records
SELECT COUNT(*) FROM users;

# Backup a database
mysqldump -u root -p'Qgocargo@123' wms_db > wms_backup.sql

# Restore a database
mysql -u root -p'Qgocargo@123' wms_db < wms_backup.sql
```

---

## 🖥️ SSH ACCESS (Server Management)

### Connect to VPS

```bash
ssh root@148.230.107.155
```
Password: `Qgocargo@123`

### Check Services Status

```bash
# All PM2 services
pm2 list

# Check specific service
pm2 status wms-backend
pm2 status qgo-frontend
pm2 status qgo-backend

# View service logs
pm2 logs wms-backend
pm2 logs qgo-frontend
pm2 logs qgo-backend
```

### Check Web Server

```bash
# Nginx status
systemctl status nginx

# Restart Nginx
systemctl restart nginx

# View Nginx error log
tail -20 /var/log/nginx/error.log

# Test Nginx config
nginx -t
```

### Check Database

```bash
# MariaDB status
systemctl status mariadb

# Restart MariaDB
systemctl restart mariadb

# Access MySQL
mysql -u root -p'Qgocargo@123'
```

### Monitor Resources

```bash
# Check CPU and Memory
top

# Check disk space
df -h

# Check running processes
ps aux | grep node

# Check open ports
netstat -tlnp
```

---

## 🔍 TROUBLESHOOTING

### Can't Access WMS?

```bash
# 1. Check if Nginx is running
ssh root@148.230.107.155
systemctl status nginx

# 2. Check if backend is running
pm2 status wms-backend

# 3. Check logs
tail -20 /var/log/nginx/error.log
pm2 logs wms-backend
```

### Can't Access QGO?

```bash
# 1. Check if process is running
pm2 status qgo-frontend
pm2 status qgo-backend

# 2. Check if port 3000 is open
netstat -tlnp | grep 3000

# 3. Check logs
pm2 logs qgo-frontend
```

### Database Connection Failed?

```bash
# 1. Check if MariaDB is running
systemctl status mariadb

# 2. Test local connection
mysql -u root -p'Qgocargo@123' -e "SHOW DATABASES;"

# 3. Check database logs
tail -20 /var/log/mariadb/mariadb.log
```

### SSL Certificate Warning?

**This is normal for IP access!** The self-signed certificate is for the domain `qgocargo.cloud`, not the IP address.

Solutions:
- ✅ Access via domain after DNS update: `https://qgocargo.cloud`
- ✅ Or accept the warning and continue (development only)
- ✅ Or replace with Let's Encrypt certificate (see DOMAIN-SETUP-GUIDE.md)

---

## 📋 ACCESS CHECKLIST

After VPS migration, verify:

- [ ] WMS accessible at http://148.230.107.155
- [ ] WMS accessible at https://148.230.107.155 (with SSL warning OK)
- [ ] QGO accessible at http://148.230.107.155:3000
- [ ] Can login with admin@demo.com / admin123
- [ ] Can login with a@gmail.com / aaaaaa
- [ ] Database accessible at 148.230.107.155:3306
- [ ] All 3 databases present (wms_db, wms_production, qgo_db)
- [ ] PM2 shows 3 services online
- [ ] SSH connection works to 148.230.107.155

---

## 🎯 QUICK REFERENCE

### Right Now (Via IP)
```
WMS:  http://148.230.107.155
QGO:  http://148.230.107.155:3000
DB:   mysql -h 148.230.107.155 -u root -p'Qgocargo@123'
SSH:  ssh root@148.230.107.155
```

### After DNS Update (Via Domain)
```
WMS:  https://qgocargo.cloud
QGO:  https://qgocargo.cloud:3000
DB:   Same (148.230.107.155)
SSH:  Same (148.230.107.155)
```

### Demo Credentials
```
WMS Admin:  admin@demo.com / admin123
WMS Worker: a@gmail.com / aaaaaa
Database:   root / Qgocargo@123
SSH:        root / Qgocargo@123
```

---

## 📞 SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│         Internet / Browser Users                    │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────┐
│    New VPS: 148.230.107.155                         │
│    ┌─────────────────────────────────────────────┐  │
│    │ Nginx (Port 80, 443)                        │  │
│    │ ├─ qgocargo.cloud config                    │  │
│    │ ├─ HTTPS redirect                           │  │
│    │ └─ Reverse proxy                            │  │
│    └────────┬─────────────────────────────────────┘  │
│             │                                         │
│    ┌────────┴──────────────────────────────────────┐ │
│    │                                                │ │
│    ▼                                                ▼ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Frontend (React)          QGO System (Node.js)   │ │
│ │ Port: 80/443              Port: 3000             │ │
│ │                                                  │ │
│ ▼                                                  ▼ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ WMS Backend (Node.js) QGO Backend (Node.js)     │ │
│ │ Port: 5000                 Port: 3000            │ │
│ └─────────────┬─────────────────────────────────────┘ │
│               │                                        │
│               ▼                                        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ MariaDB (Port 3306)                              │ │
│ │ ├─ wms_db                                        │ │
│ │ ├─ wms_production                                │ │
│ │ └─ qgo_db                                        │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## ✅ YOU'RE ALL SET!

Both systems are running and ready to use!

- **WMS System:** For warehouse management operations
- **QGO System:** For cargo and fleet management
- **Databases:** All data migrated and accessible
- **Services:** All running via PM2 with auto-restart

**Start using your systems now:**
1. Open http://148.230.107.155
2. Login with admin@demo.com / admin123
3. Explore the warehouse management features!

---

**Questions?** Check the other guides:
- `VPS-MIGRATION-COMPLETE.md` - Migration details
- `DOMAIN-SETUP-GUIDE.md` - Domain and DNS setup
- `SSL-CERTIFICATE-COMPLETE.md` - SSL configuration

Happy managing! 🚀
