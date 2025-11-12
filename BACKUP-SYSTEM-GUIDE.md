# 🔒 WMS AUTOMATED BACKUP SYSTEM - COMPLETE GUIDE

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [What Gets Backed Up](#what-gets-backed-up)
3. [Manual Backup](#manual-backup)
4. [Automated Daily Backups](#automated-daily-backups)
5. [Restore from Backup](#restore-from-backup)
6. [Cloud Backup (Optional)](#cloud-backup-optional)
7. [Emergency VPS Recovery](#emergency-vps-recovery)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### First Time Setup (5 minutes)

1. **Run your first backup:**
   ```powershell
   .\auto-backup-system.ps1
   ```

2. **Set up automatic daily backups:**
   ```powershell
   .\setup-auto-backup-schedule.ps1
   ```

3. **Done!** Your system is now protected 🎉

---

## 📦 What Gets Backed Up

Every backup includes:

✅ **Database (warehouse_wms)**
   - All tables (users, shipments, racks, etc.)
   - Stored procedures
   - Triggers
   - Events

✅ **User Files**
   - All uploaded images
   - Shipment photos
   - Company logos
   - QR code images

✅ **Configuration Files**
   - docker-compose.yml
   - .env files
   - Dockerfile configurations
   - package.json files

✅ **System Information**
   - Backup date/time
   - App version
   - Docker container states
   - System metadata

### Backup Location
- **Default:** `C:\WMS_BACKUPS\`
- **Format:** `WMS_BACKUP_YYYY-MM-DD_HH-MM-SS.zip`
- **Retention:** Last 7 backups kept automatically
- **Compression:** Yes (saves 60-80% space)

---

## 💾 Manual Backup

### Run a backup anytime:

```powershell
.\auto-backup-system.ps1
```

### What happens:
1. ✅ Backs up MySQL database (full SQL dump)
2. ✅ Copies uploads folder
3. ✅ Saves Docker configs
4. ✅ Creates metadata file
5. ✅ Compresses everything to ZIP
6. ✅ Deletes old backups (keeps last 7)

### Typical backup size:
- Small database: 5-20 MB
- Medium database: 50-100 MB
- Large database: 200+ MB

### Backup time:
- Usually: 10-30 seconds
- Large databases: 1-2 minutes

---

## ⏰ Automated Daily Backups

### Setup once, forget forever!

1. **Run the setup script:**
   ```powershell
   .\setup-auto-backup-schedule.ps1
   ```

2. **Choose backup time** (default: 2:00 AM)
   ```powershell
   .\setup-auto-backup-schedule.ps1 -BackupTime "03:00"
   ```

3. **Verify it's scheduled:**
   ```powershell
   Get-ScheduledTask -TaskName "WMS_Daily_Backup"
   ```

### Useful Commands

**Run backup now (test):**
```powershell
Start-ScheduledTask -TaskName "WMS_Daily_Backup"
```

**Disable automatic backups:**
```powershell
Disable-ScheduledTask -TaskName "WMS_Daily_Backup"
```

**Enable automatic backups:**
```powershell
Enable-ScheduledTask -TaskName "WMS_Daily_Backup"
```

**Remove scheduled task:**
```powershell
Unregister-ScheduledTask -TaskName "WMS_Daily_Backup"
```

### Check Logs
```powershell
Get-Content .\backup-logs\backup-scheduler-*.log -Tail 50
```

---

## 🔄 Restore from Backup

### Full Restoration (Database + Files)

```powershell
.\restore-backup.ps1 -BackupFile "C:\WMS_BACKUPS\WMS_BACKUP_2025-11-12_02-00-00.zip"
```

### Restore Only Database
```powershell
.\restore-backup.ps1 -BackupFile "path\to\backup.zip" -SkipFiles
```

### Restore Only Files
```powershell
.\restore-backup.ps1 -BackupFile "path\to\backup.zip" -SkipDatabase
```

### What happens during restore:
1. ⚠️  **WARNING** - You confirm restoration
2. 📦 Backup is extracted
3. 🗄️  Database is restored (drops and recreates)
4. 📁 Files are restored (old files backed up)
5. ⚙️  Optional: Config files restored
6. ✅ Verification checks run
7. 🎉 System is ready!

### Safety Features:
- Requires typing "YES" to confirm
- Old uploads backed up before restore
- Metadata verification
- Post-restore health checks

---

## ☁️ Cloud Backup (Optional)

### Setup Cloud Storage

1. **Install rclone:**
   ```powershell
   winget install Rclone.Rclone
   ```

2. **Configure your cloud provider:**
   ```powershell
   rclone config
   ```
   
   Choose from:
   - Google Drive
   - OneDrive
   - Dropbox
   - And 40+ more providers!

3. **Upload backups to cloud:**
   ```powershell
   # Upload latest backup
   .\upload-to-cloud.ps1 -CloudProvider gdrive
   
   # Upload specific backup
   .\upload-to-cloud.ps1 -BackupFile "C:\WMS_BACKUPS\backup.zip" -CloudProvider onedrive
   ```

### Automate Cloud Upload

Add to scheduled task:
```powershell
# After backup runs, upload to cloud
.\auto-backup-system.ps1
.\upload-to-cloud.ps1 -CloudProvider gdrive
```

---

## 🆘 Emergency VPS Recovery

### Scenario: Your VPS crashed or data was corrupted

#### Option 1: Restore on Same VPS

1. **Copy backup to VPS:**
   ```bash
   scp C:\WMS_BACKUPS\backup.zip root@148.230.107.155:/root/
   ```

2. **SSH into VPS:**
   ```bash
   ssh root@148.230.107.155
   ```

3. **Extract and restore:**
   ```bash
   unzip backup.zip
   cd WMS_BACKUP_*
   
   # Restore database
   docker exec wms-database mysql -u root -prootpassword < database_warehouse_wms.sql
   
   # Restore files
   cp -r uploads/* /path/to/backend/uploads/
   
   # Restart containers
   docker-compose restart
   ```

#### Option 2: Restore to New VPS

1. **Set up new VPS** with Docker
2. **Copy your backup** to new VPS
3. **Copy docker-compose files** from backup
4. **Run restore script** (adapted for Linux)
5. **Start containers**
6. **Update DNS** to new IP

#### Option 3: Switch to Localhost

1. **Run restore script:**
   ```powershell
   .\restore-backup.ps1 -BackupFile "C:\WMS_BACKUPS\latest.zip"
   ```

2. **Start local containers:**
   ```powershell
   docker-compose up -d
   ```

3. **Access at:** http://localhost

---

## 🛠️ Troubleshooting

### Backup Issues

**Problem:** "Database backup failed"
```powershell
# Check if container is running
docker ps | findstr wms-database

# Restart database
docker-compose restart database

# Try backup again
.\auto-backup-system.ps1
```

**Problem:** "Access denied" or "Permission denied"
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → Run as Administrator
```

**Problem:** Backup is too large
- Old backups are auto-deleted (last 7 kept)
- Manually delete: `C:\WMS_BACKUPS\`
- Backups are already compressed

### Restore Issues

**Problem:** "Database restore failed"
```powershell
# Manual restore
docker exec wms-database mysql -u root -prootpassword -e "DROP DATABASE warehouse_wms; CREATE DATABASE warehouse_wms;"

# Then restore from SQL file
docker cp backup\database_warehouse_wms.sql wms-database:/tmp/restore.sql
docker exec wms-database mysql -u root -prootpassword warehouse_wms -e "source /tmp/restore.sql"
```

**Problem:** Backend not starting after restore
```powershell
# Restart all containers
docker-compose restart

# Check logs
docker-compose logs backend

# Full rebuild if needed
docker-compose down
docker-compose up -d --build
```

### Scheduled Task Issues

**Problem:** Backups not running automatically
```powershell
# Check task status
Get-ScheduledTask -TaskName "WMS_Daily_Backup"

# Check last run
Get-ScheduledTaskInfo -TaskName "WMS_Daily_Backup"

# Run manually to test
Start-ScheduledTask -TaskName "WMS_Daily_Backup"

# Check logs
Get-Content .\backup-logs\backup-scheduler-*.log
```

**Problem:** "Task not found"
```powershell
# Re-create the scheduled task
.\setup-auto-backup-schedule.ps1
```

---

## 📊 Backup Strategy Recommendations

### For Development (Local)
- **Frequency:** Daily at night (2:00 AM)
- **Retention:** 7 days
- **Cloud:** Optional

### For Production (VPS)
- **Frequency:** Daily + before major changes
- **Retention:** 14-30 days
- **Cloud:** **STRONGLY RECOMMENDED**
- **Extra:** Weekly download to local storage

### Critical Operations
**Always backup before:**
- Database schema changes
- Major updates/deployments
- Data migrations
- Bulk deletions
- Version upgrades

---

## ✅ Best Practices

1. **Test your backups regularly**
   - Monthly: Restore a backup to localhost
   - Verify all data is intact
   
2. **Keep backups in multiple locations**
   - Local: C:\WMS_BACKUPS
   - Cloud: Google Drive/OneDrive
   - External: USB drive or network storage

3. **Monitor backup logs**
   ```powershell
   Get-Content .\backup-logs\backup-scheduler-*.log -Tail 20
   ```

4. **Verify backups after critical changes**
   ```powershell
   .\auto-backup-system.ps1
   ```

5. **Document your backup schedule**
   - Who is responsible?
   - Where are backups stored?
   - How to restore?

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Run backup now | `.\auto-backup-system.ps1` |
| Setup daily backups | `.\setup-auto-backup-schedule.ps1` |
| Restore backup | `.\restore-backup.ps1 -BackupFile "path\to\backup.zip"` |
| Upload to cloud | `.\upload-to-cloud.ps1 -CloudProvider gdrive` |
| Check backups | `Get-ChildItem C:\WMS_BACKUPS\` |
| View logs | `Get-Content .\backup-logs\backup-scheduler-*.log -Tail 50` |

---

## 🔐 Security Notes

1. **Backup files contain sensitive data:**
   - User passwords (hashed)
   - Business data
   - Images and documents

2. **Protect your backups:**
   - Store in secure location
   - Encrypt cloud backups
   - Limit access permissions
   - Don't share publicly

3. **Database credentials are in:**
   - docker-compose.yml
   - .env files
   - These are included in backups

---

## 📞 Support

If you encounter issues:

1. Check logs in `backup-logs/`
2. Review this guide
3. Check Docker container status: `docker ps`
4. Verify disk space: `Get-PSDrive C`

---

**Last Updated:** November 12, 2025
**Version:** 1.0.0
**Backup System Version:** v2.1.170
