# 🚨 VPS Resource Usage Analysis Report

**Generated:** November 1, 2025  
**VPS IP:** 148.230.107.155  
**Status:** ⚠️ CRITICAL - 90% Disk Usage, High RAM Consumption

---

## 📊 Current Resource Status

### Disk Space
- **Total:** 49GB
- **Used:** 44GB (90%) ⚠️ CRITICAL
- **Available:** 5.2GB (10%)
- **Status:** DANGEROUSLY LOW - VPS will fail when disk reaches 100%

### Memory (RAM)
- **Total:** 3.65GB
- **Used:** 2.32GB (64%)
- **Available:** 1.33GB (36%)
- **Status:** HIGH but manageable

### CPU Load
- **Current Load:** 8.71 (very high)
- **Top Process:** Node.js (git add) using 21.8% CPU
- **Status:** Causing performance issues

---

## 🔍 Root Causes Identified

### 1. **Massive Backups Directory (7GB)** ⚠️ LARGEST PROBLEM
```
/root/NEW START/backups → 7.0GB
```
**What it is:** Old backup files accumulating over time  
**Solution:** Archive old backups or move to external storage

### 2. **Frontend Build Artifacts (646MB)**
```
/root/NEW START/frontend → 646MB
```
**Why:** Compiled frontend code + node_modules

### 3. **Backend Build Artifacts (337MB + 304MB backup)**
```
/root/NEW START/backend → 273MB (current)
/root/NEW START/backend_local_backup_20251029203556 → 304MB (OLD BACKUP)
```

### 4. **Git Repository History (213MB)**
```
/root/NEW START/.git → 213MB
```
**Why:** Large commit history from multiple migrations

### 5. **Unused Docker Images (12.29GB reclaimable)**
```
Docker unused images → 12.29GB (84% reclaimable)
```
**Why:** Old image versions not being cleaned up

### 6. **Database Containers High Memory**
- `wms-staging-db` → 377.4MB (10.33% of RAM)
- `wms-database` → 386.1MB (10.57% of RAM)
- Multiple MySQL processes running

### 7. **Git Watcher Process (426.8MB)**
```
wms-git-watcher → 426.8MB (11.69% of RAM)
19.35% CPU usage
```
**Issue:** This container is consuming excessive resources

---

## 💾 Space Breakdown

| Component | Size | Type | Action |
|-----------|------|------|--------|
| Backups | 7.0GB | Files | 🔴 DELETE OLD |
| Frontend | 646MB | Build | 🟡 OPTIMIZE |
| Backend | 273MB | Build | 🟡 OPTIMIZE |
| Backend Backup | 304MB | OLD | 🔴 DELETE |
| Database Backups | 1.7GB | Archive | 🟡 COMPRESS |
| Git Repo | 213MB | VCS | 🟡 OPTIMIZE |
| Unused Docker Images | 12.29GB | Images | 🔴 CLEANUP |
| **TOTAL SAVINGS POSSIBLE** | **~21GB** | | ✅ FREE UP |

---

## 🎯 Immediate Actions (Priority Order)

### 🔴 CRITICAL - Do These First

#### 1. Remove Old Backups (5-10 minutes)
```bash
# Keep only last 2-3 backups, delete older ones
cd /root/NEW\ START/backups
ls -lhS  # See sizes
# Delete oldest backups manually, keeping recent ones
rm -rf backup_2025-09-* backup_2025-08-*  # Example
```
**Expected Space Freed:** 5-6GB

#### 2. Remove Old Build Backups (2 minutes)
```bash
rm -rf /root/NEW\ START/backend_local_backup_20251029203556
rm -rf /root/NEW\ START/frontend_local_backup_20251029203643
```
**Expected Space Freed:** 640MB

#### 3. Clean Docker System (5 minutes)
```bash
docker system prune -a --volumes -f
# This removes: unused images, containers, volumes, build cache
```
**Expected Space Freed:** 12GB

### 🟡 MEDIUM PRIORITY - Do Next

#### 4. Optimize Docker Logs (2 minutes)
```bash
# Clear Docker container logs
for container in $(docker ps -aq); do
  docker exec $container truncate -s 0 /var/log/app.log 2>/dev/null || true
done
```

#### 5. Restart Git Watcher (1 minute)
```bash
# This process is using too much memory
docker restart wms-git-watcher
```

#### 6. Optimize Frontend & Backend Builds (3 minutes)
```bash
# Remove unnecessary node_modules duplicates
cd /root/NEW\ START/frontend && npm prune --production
cd /root/NEW\ START/backend && npm prune --production
```

---

## 📋 Detailed Fix Steps

### Step 1: Backup Check Before Cleanup
```bash
ssh root@148.230.107.155 "cd /root/NEW\ START/backups && ls -lhS | head -20"
```

### Step 2: Remove Old Backups Safely
```bash
ssh root@148.230.107.155 << 'EOF'
cd /root/NEW\ START/backups

# Keep only the 3 most recent backups
ls -t | tail -n +4 | xargs -r rm -rf

echo "Cleanup complete!"
df -h /
EOF
```

### Step 3: Clean Docker
```bash
ssh root@148.230.107.155 "docker system prune -a --volumes -f && docker system df"
```

### Step 4: Check Results
```bash
ssh root@148.230.107.155 "df -h && echo '---' && docker system df"
```

---

## 🚀 Long-Term Solutions

### 1. **Implement Backup Rotation Policy**
Create automated cleanup script:
```bash
# Keep backups only for last 7 days
find /root/NEW\ START/backups -type d -mtime +7 -exec rm -rf {} \;
```
Add to crontab: `0 2 * * * find /root/NEW\ START/backups -type d -mtime +7 -exec rm -rf {} \;`

### 2. **Implement Docker Image Cleanup**
```bash
# Add to crontab: Clean unused images weekly
0 3 * * 0 docker image prune -a -f
```

### 3. **Monitor Disk Space**
Set up disk usage alerts:
```bash
# Alert if disk usage > 80%
df / | awk 'NR==2 {print $5}' | sed 's/%//' | awk '{if ($1 > 80) print "ALERT: Disk "  $1 "%"}'
```

### 4. **Reduce Database Size**
Archive old transactions:
```sql
-- Move old records to archive table
INSERT INTO transactions_archive 
SELECT * FROM transactions WHERE date < DATE_SUB(NOW(), INTERVAL 6 MONTH);

DELETE FROM transactions WHERE date < DATE_SUB(NOW(), INTERVAL 6 MONTH);
```

### 5. **Git Repository Cleanup**
```bash
cd /root/NEW\ START
git gc --aggressive
git prune
git clean -fd
```

---

## ⚠️ What's Consuming High RAM?

| Process | RAM | % | Issue |
|---------|-----|---|-------|
| MySQL (wms-database) | 386MB | 10.5% | Normal for DB |
| MySQL (wms-staging-db) | 377MB | 10.3% | Normal for DB |
| Git Watcher | 426MB | 11.7% | 🔴 TOO HIGH |
| dockerd | 102MB | 2.7% | Normal |
| Node processes | 178MB | 4.7% | Normal |
| Portainer | 84MB | 2.3% | Normal |

**Recommendation:** Restart `wms-git-watcher` to free up 426MB

---

## ✅ Expected Results After Cleanup

| Item | Before | After | Freed |
|------|--------|-------|-------|
| Disk Used | 44GB (90%) | 23GB (47%) | 21GB ✅ |
| Disk Free | 5.2GB | 26GB | +20.8GB |
| RAM (if git-watcher restarted) | 3.65GB | 3.65GB | 426MB freed |
| Docker Overhead | 1.2GB active | 300MB active | 900MB |

---

## 🛠️ Quick Fix Commands (Copy & Paste)

```bash
#!/bin/bash
# RUN THIS TO FIX EVERYTHING
ssh root@148.230.107.155 << 'EOFSCRIPT'

echo "🔧 Starting VPS Cleanup..."
echo ""

# Step 1: Remove old backups
echo "📦 Cleaning old backups..."
cd /root/NEW\ START/backups
ls -t | tail -n +4 | xargs -r rm -rf 2>/dev/null
echo "✅ Backups cleaned"

# Step 2: Remove old build backups
echo "📦 Removing old build backups..."
rm -rf /root/NEW\ START/backend_local_backup_* 2>/dev/null
rm -rf /root/NEW\ START/frontend_local_backup_* 2>/dev/null
echo "✅ Old backups removed"

# Step 3: Docker cleanup
echo "🐳 Cleaning Docker..."
docker system prune -a --volumes -f > /dev/null 2>&1
docker container prune -f > /dev/null 2>&1
docker image prune -a -f > /dev/null 2>&1
echo "✅ Docker cleaned"

# Step 4: Restart git watcher
echo "🔄 Restarting git watcher..."
docker restart wms-git-watcher > /dev/null 2>&1
echo "✅ Git watcher restarted"

# Show results
echo ""
echo "📊 RESULTS:"
echo "Disk usage:"
df -h / | tail -1
echo ""
echo "Docker system:"
docker system df | tail -3

EOFSCRIPT
```

---

## 🎯 Prevention Going Forward

1. **Monthly disk check:** Monitor with `df -h`
2. **Weekly Docker cleanup:** Add to crontab
3. **Quarterly git optimization:** `git gc --aggressive`
4. **Archive old backups:** Move to S3 or external storage
5. **Set disk quota alerts:** Alert at 75%

---

## 📞 Support

For questions or issues during cleanup:
1. Run commands one at a time
2. Check disk space after each step: `df -h /`
3. If issues arise, restore from backup

---

**Last Updated:** November 1, 2025  
**Estimated Time to Fix:** 15-20 minutes  
**Risk Level:** LOW (Cleanup is safe)
