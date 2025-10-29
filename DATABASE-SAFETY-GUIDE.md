# 🛡️ DATABASE SAFETY & BACKUP SYSTEM

## 🚨 DEPLOYMENT RULE #1 - MOST CRITICAL

### **⚠️ NEVER DEPLOY TO VPS WITHOUT USER PERMISSION**

```
MANDATORY WORKFLOW:
1. Make changes locally in Windows
2. Test locally: docker-compose up --build
3. Ask user: "Local me test kar lo, sahi hai to VPS deploy karu?"
4. WAIT for user confirmation ("haan deploy karo" or "deply karo")
5. Create VPS backup BEFORE deployment
6. Only then deploy to VPS (148.230.107.155)

❌ DO NOT auto-deploy to production
❌ DO NOT assume changes are safe
❌ DO NOT skip local testing
✅ ALWAYS get user permission first
```

## ⚠️ CRITICAL PRODUCTION RULES

### **NEVER RUN THESE COMMANDS ON PRODUCTION:**
```bash
# ❌ DANGEROUS - Will delete ALL data:
docker-compose down -v
docker volume rm newstart_mysql-data
npx prisma db push --accept-data-loss

# ❌ DANGEROUS - Will wipe database:
npx prisma migrate reset
```

### **✅ SAFE Commands to Use:**
```bash
# Safe restart (keeps data):
docker-compose restart backend
docker-compose restart frontend

# Safe rebuild (keeps database):
docker-compose up -d --build backend
docker-compose up -d --build frontend

# View logs without changes:
docker logs wms-backend --tail 100
docker logs wms-frontend --tail 100
```

---

## 🔄 AUTOMATIC BACKUP SYSTEM (Every 5 Minutes)

### **Setup Auto-Backup on VPS:**

1. **Create backup script:**
```bash
ssh root@148.230.107.155
cat > /root/backup-wms-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/wms-backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="wms-database"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MySQL database
docker exec $CONTAINER mysqldump -u root -pQgocargo@123 warehouse_wms > "$BACKUP_DIR/wms_backup_$DATE.sql"

# Keep only last 100 backups (auto-delete old ones)
ls -t $BACKUP_DIR/wms_backup_*.sql | tail -n +101 | xargs -r rm

echo "✅ Backup created: wms_backup_$DATE.sql"
EOF

chmod +x /root/backup-wms-db.sh
```

2. **Setup cron job for every 5 minutes:**
```bash
# Edit crontab
crontab -e

# Add this line (backup every 5 minutes):
*/5 * * * * /root/backup-wms-db.sh >> /root/backup.log 2>&1
```

3. **Test backup manually:**
```bash
/root/backup-wms-db.sh
ls -lh /root/wms-backups/
```

---

## 📦 MANUAL BACKUP (Before Changes)

### **Create Backup Before ANY Changes:**
```bash
ssh root@148.230.107.155
docker exec wms-database mysqldump -u root -pQgocargo@123 warehouse_wms > /root/wms_backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Restore from Backup:**
```bash
# List available backups:
ls -lh /root/wms-backups/

# Restore specific backup:
cat /root/wms-backups/wms_backup_YYYYMMDD_HHMMSS.sql | docker exec -i wms-database mysql -u root -pQgocargo@123 warehouse_wms
```

---

## 💾 DOCKER VOLUME BACKUP (Complete Safety)

### **Backup Entire MySQL Volume:**
```bash
# Stop containers safely (keeps volumes):
docker-compose stop

# Backup volume to tar file:
docker run --rm -v newstart_mysql-data:/data -v /root/volume-backups:/backup alpine tar czf /backup/mysql-volume-$(date +%Y%m%d_%H%M%S).tar.gz /data

# Restart containers:
docker-compose start
```

### **Restore Volume:**
```bash
# Stop containers:
docker-compose stop database

# Restore volume:
docker run --rm -v newstart_mysql-data:/data -v /root/volume-backups:/backup alpine tar xzf /backup/mysql-volume-YYYYMMDD_HHMMSS.tar.gz -C /

# Start containers:
docker-compose start database
```

---

## 🔐 DATABASE MIGRATION SAFETY

### **ALWAYS Test Migrations First:**
```bash
# 1. Create backup BEFORE migration:
/root/backup-wms-db.sh

# 2. Test migration in dry-run mode:
docker exec wms-backend npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma

# 3. Apply migration safely:
docker exec wms-backend npx prisma migrate deploy

# 4. Verify data still exists:
docker exec wms-database mysql -u root -pQgocargo@123 -e "SELECT COUNT(*) FROM warehouse_wms.User;"
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

**Before ANY deployment, run these checks:**

- [ ] ✅ Create manual backup: `/root/backup-wms-db.sh`
- [ ] ✅ Verify backup created: `ls -lh /root/wms-backups/`
- [ ] ✅ Check current data count: `docker exec wms-database mysql -u root -pQgocargo@123 -e "SELECT COUNT(*) FROM warehouse_wms.User;"`
- [ ] ✅ Use safe commands only (NO `-v` flag)
- [ ] ✅ Test changes on local first

---

## 🚨 EMERGENCY RECOVERY

### **If Data Gets Deleted:**

1. **Stop all containers immediately:**
```bash
docker-compose stop
```

2. **Restore latest backup:**
```bash
# Find latest backup:
LATEST_BACKUP=$(ls -t /root/wms-backups/wms_backup_*.sql | head -1)

# Restore it:
cat $LATEST_BACKUP | docker exec -i wms-database mysql -u root -pQgocargo@123 warehouse_wms
```

3. **Restart containers:**
```bash
docker-compose start
```

---

## 📊 MONITORING BACKUP STATUS

### **Check Backup Health:**
```bash
# View backup log:
tail -f /root/backup.log

# Count backups:
ls -1 /root/wms-backups/ | wc -l

# Check latest backup size:
ls -lh /root/wms-backups/ | head -5

# Verify database is accessible:
docker exec wms-database mysql -u root -pQgocargo@123 -e "SHOW DATABASES;"
```

---

## 🔄 AI CONTEXT CONTINUITY

### **For New AI Chat Sessions:**

**Always share these files with new AI:**

1. `AI-CONTEXT.md` - Full system context
2. `DATABASE-SAFETY-GUIDE.md` - This file
3. `DEPLOYMENT-GUIDE.md` - Deployment procedures
4. Current database backup location: `/root/wms-backups/`

### **Template for New Chat:**
```
"Load context from AI-CONTEXT.md file. Production WMS is live at 148.230.107.155. 
Database backups are in /root/wms-backups/. 
NEVER use 'docker-compose down -v' or any data-loss commands. 
Continue work on [describe current task]."
```

---

## 📱 BACKUP DOWNLOAD (To Local Machine)

### **Download Backups to Windows:**
```powershell
# Download latest backup:
scp root@148.230.107.155:/root/wms-backups/wms_backup_*.sql "C:\Users\USER\Videos\NEW START\backups\"

# Download all backups:
scp -r root@148.230.107.155:/root/wms-backups/ "C:\Users\USER\Videos\NEW START\backups\"
```

---

## 🎯 PRODUCTION MAINTENANCE WORKFLOW

### **Weekly Maintenance:**
1. Download backups to local machine
2. Verify backup integrity: `mysql -u root -p < backup.sql` (test locally)
3. Clean old backups: Keep last 7 days only
4. Update AI-CONTEXT.md with any changes

### **Before Any Code Push:**
1. Create manual backup
2. Test locally first
3. Deploy to production with safe commands
4. Verify data still exists after deployment

---

## 🔗 IMPORTANT FILES TO KEEP UPDATED

1. **AI-CONTEXT.md** - System architecture, credentials, deployed state
2. **AI-SESSION-CONTEXT.md** - Current session work
3. **DATABASE-SAFETY-GUIDE.md** - This file (backup procedures)
4. **.env.production** - Production environment variables

**Always commit these files after changes!**

---

## ✅ CURRENT PRODUCTION STATUS

- **Database Volume:** `newstart_mysql-data` (NEVER DELETE)
- **Backup Location:** `/root/wms-backups/`
- **Backup Frequency:** Every 5 minutes (cron job)
- **Retention:** Last 100 backups
- **Database:** MySQL 8.0 on port 3307
- **Root Password:** `Qgocargo@123`

---

## 🆘 QUICK REFERENCE

```bash
# Create backup NOW:
/root/backup-wms-db.sh

# List backups:
ls -lh /root/wms-backups/

# Restore backup:
cat /root/wms-backups/wms_backup_YYYYMMDD_HHMMSS.sql | docker exec -i wms-database mysql -u root -pQgocargo@123 warehouse_wms

# Check data count:
docker exec wms-database mysql -u root -pQgocargo@123 -e "SELECT COUNT(*) FROM warehouse_wms.User;"
```

**🚨 GOLDEN RULE: When in doubt, BACKUP FIRST!** 🚨
