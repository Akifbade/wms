# 🚀 PRODUCTION DEPLOYMENT GUIDE

**Last Updated:** November 22, 2025  
**Production URL:** https://qgocargo.cloud  
**Version Proof:** https://qgocargo.cloud/version.json  
**Backend Health:** https://qgocargo.cloud/api/health

---

## 📋 QUICK DEPLOYMENT (1-Click)

### Option 1: VS Code Task (Recommended)
1. Press `Ctrl+Shift+P`
2. Type: `Tasks: Run Task`
3. Select: `🚀 DEPLOY TO PRODUCTION (Local → VPS → GitHub)`
4. Wait ~3-5 minutes
5. Test: https://qgocargo.cloud

### Option 2: PowerShell Script
```powershell
.\.vscode\DEPLOY-TO-PRODUCTION.ps1
```

---

## 🔄 WHAT THE DEPLOYMENT DOES

### Automatic Steps:
1. **Build Frontend** - Compiles latest React code locally
2. **Backup Database** - Creates full backup on VPS before deployment
3. **Transfer Code** - Syncs frontend + backend to VPS
4. **Deploy Containers** - Updates Docker containers on production
5. **Health Check** - Verifies backend is running correctly
6. **Database Verify** - Confirms data integrity (shipments, racks, users)
7. **GitHub Commit** - Auto-commits and pushes to repository

### Safety Features:
- ✅ **Database Backup** - Before every deployment
- ✅ **Zero Downtime** - Containers hot-reload
- ✅ **Data Preserved** - Only code updates, database untouched
- ✅ **Version Tracked** - All deployments committed to GitHub

---

## 🔄 ROLLBACK (EMERGENCY)

### If Deployment Fails:
The script **automatically rolls back** on any error:
- ✅ Restores database from backup
- ✅ Restarts containers to previous state
- ✅ Shows clear error message

### Manual Rollback (If Needed):
After successful deployment, if you discover issues:

```powershell
# Run the auto-generated rollback script
.\.vscode\ROLLBACK-PRODUCTION.ps1
```

**What it does:**
1. Restores database from latest backup
2. Restarts all containers
3. Returns production to previous working state

### List Available Backups:
```bash
ssh root@148.230.107.155 "ls -lh '/root/NEW START/backups-production/'"
```

### Rollback to Specific Backup:
```bash
# SSH to VPS
ssh root@148.230.107.155

# Restore specific backup
zcat /root/NEW\ START/backups-production/BEFORE_DEPLOY_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i wms-database mysql -uroot -prootpassword123

# Restart containers
cd /root/NEW\ START
docker-compose restart
```

---

## 🔍 VERIFY DEPLOYMENT

### Quick Check:
```powershell
# Run verification script
.\verify-production.ps1
```

### Manual Check:
1. Open: https://qgocargo.cloud
2. Check version proof: https://qgocargo.cloud/version.json
3. Test material edit/delete features
4. Verify billing calculations work

---

## 🧾 VERSION UPDATES (Avoid “Old Version” Confusion)

The frontend build generates a fresh `version.json` on every build, so you can prove what is currently deployed.

- Local: http://localhost/version.json
- Production: https://qgocargo.cloud/version.json
- Backend: https://qgocargo.cloud/api/health

---

## 📊 PRODUCTION VS LOCALHOST

### Check if They Match:
- **Task:** `🔍 VERIFY: Production vs Localhost Match`
- **Script:** `.\verify-production.ps1`

### Expected Output:
```
Localhost Version:   v2.2.32
Production Version:  v2.2.32
Database Tables:     49 (both match)
STATUS: ✓ PRODUCTION MATCHES LOCALHOST!
```

---

## 🗂️ VPS DIRECTORY STRUCTURE

```
/root/NEW START/
├── backend/
│   ├── src/              # Latest backend code
│   ├── prisma/           # Database schema
│   └── uploads/          # User files (NEVER deleted)
├── frontend/
│   └── dist/             # Built frontend files
├── backups-production/
│   └── BEFORE_DEPLOY_*.sql.gz   # Database backups
├── docker-compose.yml    # Production containers config
└── vps-auto-cleanup.sh   # Auto-cleanup cron job
```

⚠️ Note: the VPS path contains a space (`/root/NEW START`). If SCP/SSH deployments are unreliable, create a no-space symlink once and use it in scripts:

```bash
ssh root@148.230.107.155 "ln -s '/root/NEW START' /root/wms"
```

Then prefer `/root/wms` for future deploy commands.

---

## 🔐 DATABASE BACKUPS

### Automatic Backups:
- **When:** Before every deployment
- **Location:** `/root/NEW START/backups-production/`
- **Format:** `BEFORE_DEPLOY_YYYYMMDD_HHMMSS.sql.gz`
- **Contains:** All databases (full backup)

### Restore a Backup:
```bash
# SSH to VPS
ssh root@148.230.107.155

# List backups
ls -lh /root/NEW\ START/backups-production/

# Restore (if needed)
zcat /root/NEW\ START/backups-production/BEFORE_DEPLOY_20251122_153418.sql.gz | \
  docker exec -i wms-database mysql -uroot -prootpassword123
```

---

## ⚙️ VPS CONTAINER STATUS

### Production Containers (Always Running):
- `wms-frontend` - Port 80/443 (HTTPS)
- `wms-backend` - Port 5000
- `wms-database` - Port 3307

### Stopped Services (Resource Saving):
- `wms-phpmyadmin` - Stopped (saves 50MB RAM)
- `wms-staging-*` - Auto-stops after 15 minutes

### Check Status:
```bash
ssh root@148.230.107.155 "docker ps"
```

---

## 🛠️ TROUBLESHOOTING

### Deployment Fails?
1. Check VPS disk space:
   ```bash
   ssh root@148.230.107.155 "df -h"
   ```
2. Check VPS memory:
   ```bash
   ssh root@148.230.107.155 "free -h"
   ```
3. Restart containers:
   ```bash
   ssh root@148.230.107.155 "cd '/root/NEW START' && docker-compose restart"
   ```

### Frontend Not Updating?
1. Clear browser cache: `Ctrl+Shift+R`
2. Check version in footer
3. Check nginx logs:
   ```bash
   ssh root@148.230.107.155 "docker logs wms-frontend --tail 50"
   ```

### Backend Errors?
1. Check backend logs:
   ```bash
   ssh root@148.230.107.155 "docker logs wms-backend --tail 50"
   ```
2. Regenerate Prisma client:
   ```bash
   ssh root@148.230.107.155 "docker exec wms-backend npx prisma generate"
   ```
3. Restart backend:
   ```bash
   ssh root@148.230.107.155 "docker restart wms-backend"
   ```

### Database Issues?
1. Check database connection:
   ```bash
   ssh root@148.230.107.155 "docker exec wms-database mysql -uroot -prootpassword123 -e 'SELECT 1;'"
   ```
2. Check tables exist:
   ```bash
   ssh root@148.230.107.155 "docker exec wms-database mysql -uroot -prootpassword123 -e 'SHOW TABLES FROM warehouse_wms;'"
   ```

---

## 📝 DEPLOYMENT CHECKLIST

Before deploying:
- [ ] All features tested on localhost
- [ ] No console errors on localhost
- [ ] Database migrations applied (if any)
- [ ] Version number updated (auto-incremented)

After deploying:
- [ ] Production URL loads correctly
- [ ] Login works
- [ ] Material features work (edit/delete)
- [ ] Billing calculations work
- [ ] No 404 errors in browser console
- [ ] Version number updated on production

---

## 🔄 AUTO-CLEANUP (VPS)

### What It Does:
- Runs every 30 minutes via cron
- Stops staging containers after 15 min
- Cleans Docker cache if memory > 80%
- Kills stuck build processes (>20 min)
- Removes node_modules from VPS (saves 900MB)
- Never touches: database, uploads, running containers

### Check Cleanup Logs:
```bash
ssh root@148.230.107.155 "tail -50 /root/cleanup.log"
```

---

## 📞 QUICK REFERENCE

| Item | Value |
|------|-------|
| Production URL | https://qgocargo.cloud |
| VPS IP | 148.230.107.155 |
| SSH User | root |
| Frontend Port | 80 (HTTP), 443 (HTTPS) |
| Backend Port | 5000 |
| Database Port | 3307 |
| VPS Location | /root/NEW START |
| Backup Location | /root/NEW START/backups-production |
| Current Version | v2.2.32 |
| GitHub Branch | stable/prisma-mysql-production |

---

## 🎯 DEPLOYMENT WORKFLOW

```
Local Development
    ↓
Make Changes
    ↓
Test on Localhost (http://localhost)
    ↓
Run: 🚀 DEPLOY TO PRODUCTION
    ↓
├─→ Build Frontend
├─→ Backup Database (VPS)
├─→ Transfer Code (Local → VPS)
├─→ Update Containers (VPS)
├─→ Health Check (VPS)
└─→ Commit to GitHub
    ↓
Production Live (https://qgocargo.cloud)
    ↓
Verify & Test
```

---

**Created:** November 22, 2025  
**Maintained by:** Auto-deployment system  
**Last Deployment:** Check `git log` for latest commit
