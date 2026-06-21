# QGO VPS System Guide (148.230.107.155)
Last Updated: 2026-02-26

---

## 🖥️ VPS Info
- **IP:** 148.230.107.155
- **OS:** Ubuntu (Hostinger)
- **Panel:** Coolify → http://148.230.107.155:8000

---

## 🐳 All Running Containers

### ✅ Fleet (Appwrite) — track.qgocargo.cloud
| Container | Image | Notes |
|---|---|---|
| appwrite-ek88... | appwrite/appwrite:1.7.4 | Main backend |
| appwrite-mariadb-ek88... | mariadb:10.11 | Fleet DB |
| appwrite-redis-ek88... | redis:7.2.4 | Cache |
| appwrite-realtime-ek88... | appwrite | Realtime |
| appwrite-console-ek88... | appwrite/console | Admin panel |
| + 15 more workers/tasks | appwrite | Various |

**Managed by:** Coolify  
**Compose dir:** `/data/coolify/services/ek88ogowoo0k4o880skcwgs8/`  
**Deploy:** Via Coolify dashboard ONLY — never run docker-compose manually here

---

### ✅ WMS — qgocargo.cloud
| Container | Image | Port | Restart |
|---|---|---|---|
| wms-frontend | ghcr.io/akifbade/wms-frontend | 3080 | always |
| wms-backend | ghcr.io/akifbade/wms-backend | 5000 | always |
| wms-database | mysql:8.0 | 3307 | always |
| wms-phpmyadmin | phpmyadmin | 8081 | always |

**⚠️ CRITICAL — Database Volume:**  
Real data is on: `mysql_prod_data`  
NEVER run `docker-compose up` from `/root/NEW START/` — it creates wrong `newstart_mysql_data` volume  

**Deploy method:** `/root/NEW START/vps-deploy.sh` ONLY

**WMS App folder:** `/root/NEW START/`  
**Uploads folder:** `/root/NEW START/backend/uploads/`

---

### ✅ QGO Core (Fleet Tracking API)
| Container | Port | Restart |
|---|---|---|
| qgo-core | - | always |

**App folder:** `/opt/qgo-fleet-docker/` or `/var/www/fleet-api/`

---

### ✅ Fleet Frontend (Static)
**Location:** `/var/www/fleet/`  
**Served by:** Nginx

---

## 🌐 Nginx Configuration
**Config files:** `/etc/nginx/sites-enabled/`

| Domain | Proxies to |
|---|---|
| track.qgocargo.cloud | Appwrite (internal Docker IP) |
| qgocargo.cloud | WMS Frontend (localhost:3080) |
| qgocargo.cloud/api | WMS Backend (localhost:5000) |

**Reload:** `nginx -t && systemctl reload nginx`

---

## 💾 Backup System

### Daily Automatic Backup (Cron)
```
Schedule: Every day at 2:00 AM UTC
Script:   /root/wms-daily-backup.sh
Backups:  /root/wms-backups/ (max 10 kept)
Log:      /root/wms-backups/backup.log
Email:    akifbade46@gmail.com (on success/fail)
```

**Each backup contains:**
- WMS database (`warehouse_wms`) SQL dump
- WMS uploads folder

### Manual Backup
```bash
/root/wms-daily-backup.sh
```

### Restore from Backup
```bash
# Extract backup
tar -xzf /root/wms-backups/wms_backup_YYYYMMDD_HHMMSS.tar.gz -C /tmp/restore/

# Import database
gunzip -c /tmp/restore/wms_TIMESTAMP/database.sql.gz | \
  docker exec -i wms-database mysql -u root -prootpassword123 warehouse_wms

# Restore uploads
tar -xzf /tmp/restore/wms_TIMESTAMP/uploads.tar.gz -C "/root/NEW START/backend/"
```

---

## 🐳 Docker Volumes (Important)

| Volume | Used by | Contents |
|---|---|---|
| `mysql_prod_data` ⭐ | wms-database | **REAL WMS data — 60 tables** |
| `newstart_mysql_data` ❌ | NOTHING (orphan) | Empty, ignore |
| `ek88..._appwrite-mariadb` | appwrite-mariadb | Fleet/Appwrite data |
| `ek88..._appwrite-uploads` | appwrite | Driver photos, files |
| `wms-uploads` | (orphan) | Old uploads, ignore |

---

## 🔄 After VPS Reboot

All containers auto-start (restart=always).  
**No manual action needed** if everything was running correctly before reboot.

If WMS is down after reboot → check: `docker ps | grep wms`  
If missing → run: `/root/NEW START/vps-deploy.sh`

---

## 🛠️ Common Commands

```bash
# Check all containers
docker ps

# Check WMS logs
docker logs --tail 50 wms-backend

# Check Nginx
nginx -t && systemctl status nginx

# Check cron jobs
crontab -l

# Run backup now
/root/wms-daily-backup.sh

# WMS deploy (if needed)
/root/NEW START/vps-deploy.sh
```

---

## ⚠️ Warning: DO NOT Run These

```bash
# DANGER — creates wrong volume for WMS
cd '/root/NEW START' && docker-compose up -d

# DANGER — may break Appwrite
cd /data/coolify/services/ek88... && docker compose down
```

---

## 📧 Email & SMTP
- **Provider:** Gmail
- **User:** akifbade46@gmail.com
- **Host:** smtp.gmail.com:587
- **Configured in:** WMS database (email_settings table)
