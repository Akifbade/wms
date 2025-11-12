# 🔒 WMS Integrated Backup System

## ✅ Backup System is Now Built Into Your WMS!

You can now manage backups directly from your WMS web interface - no need to run PowerShell scripts manually!

---

## 🎯 Quick Access

**Admin users can access the backup system at:**
- **URL:** http://localhost/backups (or https://qgocargo.cloud/backups on production)
- **Menu:** Click "Backups" in the left sidebar navigation

---

## 📋 Features

### From the Web Interface

✅ **Create Backup** - One-click backup creation
- Click "Create Backup Now" button
- Backs up: Database, uploaded files, configurations
- Automatic compression to ZIP format
- Takes 10-60 seconds depending on data size

✅ **View All Backups** - See all your backup files
- Shows backup name, date, and size
- Sorted by newest first
- Visual cards with all info

✅ **Download Backup** - Download any backup to your computer
- Click "Download" button on any backup
- Save to your local computer
- Keep for safety or transfer to another location

✅ **Delete Old Backups** - Remove backups you don't need
- Click "Delete" button (with confirmation)
- Free up space
- System automatically keeps last 7 backups

### Automatic Features
- Last 7 backups kept automatically
- Older backups deleted automatically
- Compressed storage (saves 60-80% space)
- Backup location: `C:\WMS_BACKUPS\`

---

## 🚀 How to Use

### Create a Backup

1. Login as **ADMIN** user
2. Click "**Backups**" in left menu
3. Click "**Create Backup Now**" button
4. Wait 10-60 seconds
5. ✅ Done! Your backup is created

### Download a Backup

1. Go to **Backups** page
2. Find the backup you want
3. Click "**Download**" button
4. File saves to your Downloads folder
5. ✅ Keep it safe!

### Delete a Backup

1. Go to **Backups** page
2. Find backup to delete
3. Click "**Delete**" button
4. Confirm deletion
5. ✅ Backup removed

---

## 📦 What Gets Backed Up

Every backup includes:

1. **Complete Database**
   - All shipments
   - All racks
   - All users
   - All company data
   - Everything!

2. **All Uploaded Files**
   - Shipment photos
   - Company logos
   - QR code images
   - All images

3. **Configuration Files**
   - Docker settings
   - Environment configs
   - App settings

---

## 🆘 Emergency: Restore from Backup

If something goes wrong and you need to restore:

### Option 1: Use PowerShell Script (Recommended)
```powershell
.\restore-backup.ps1 -BackupFile "C:\WMS_BACKUPS\WMS_BACKUP_2025-11-12_14-00-00.zip"
```

### Option 2: Manual Restore
1. Download backup from web interface
2. Extract the ZIP file
3. Copy `uploads` folder to `backend/uploads`
4. Import SQL file to database:
   ```powershell
   docker exec wms-database mysql -u root -prootpassword warehouse_wms < database_warehouse_wms.sql
   ```
5. Restart containers:
   ```powershell
   docker-compose restart
   ```

---

## ⏰ Schedule Automatic Backups (Optional)

Want backups to run automatically every day? Use the PowerShell script:

```powershell
.\setup-auto-backup-schedule.ps1
```

This will:
- Run backup automatically at 2:00 AM daily
- Keep last 7 backups
- Delete old backups automatically
- You don't have to do anything!

---

## 💡 Best Practices

1. **Create backups before major changes**
   - Before deploying updates
   - Before deleting data
   - Before system maintenance

2. **Download important backups**
   - Download monthly backups to external drive
   - Keep 3-6 months of monthly backups
   - Store in safe location

3. **Test restore occasionally**
   - Every 3 months, test restoring a backup
   - Make sure it works
   - Be ready for emergencies

4. **Monitor backup size**
   - If backups get very large (>500MB)
   - Consider archiving old data
   - Or increase storage space

---

## 🔐 Security Notes

⚠️ **Backup files contain sensitive data:**
- User information
- Business data
- All images and documents

**Protect your backups:**
- Don't share publicly
- Store in secure location
- Limit access to admins only
- Delete when no longer needed

---

## 📊 Backup Storage

**Default Location:** `C:\WMS_BACKUPS\`

**File Format:** `WMS_BACKUP_YYYY-MM-DD_HH-MM-SS.zip`

**Example:**
- `WMS_BACKUP_2025-11-12_14-30-00.zip`
- `WMS_BACKUP_2025-11-13_02-00-00.zip`

**Retention:** Last 7 backups kept automatically

---

## ❓ Troubleshooting

### "Failed to create backup"
- Check disk space (need at least 1GB free)
- Make sure Docker containers are running
- Try again in a few minutes

### "Download failed"
- Check your internet connection
- Try different browser
- Contact admin if problem persists

### Backup is very large
- Normal for lots of data
- May take longer to download
- Consider breaking into smaller periods

---

## 🎉 Summary

You now have a **complete integrated backup system** in your WMS!

✅ Create backups with one click  
✅ Download backups anytime  
✅ Automatic retention policy  
✅ Easy to use web interface  
✅ No PowerShell needed  

**Stay safe! Always keep backups! 🔒**

---

**Last Updated:** November 12, 2025  
**Version:** v2.1.171  
**Feature:** Integrated Backup Management System
