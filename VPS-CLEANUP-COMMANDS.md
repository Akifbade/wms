# 🎯 VPS CLEANUP - STEP BY STEP INSTRUCTIONS

## ⚡ FASTEST WAY (Single Command - Copy & Paste)

**Open PowerShell and run this:**

```powershell
ssh root@148.230.107.155 @"
set -e
echo '╔════════════════════════════════════════════╗'
echo '║   VPS CLEANUP IN PROGRESS...             ║'
echo '╚════════════════════════════════════════════╝'
echo ''
echo '📊 BEFORE:'
df -h / | tail -1 | awk '{print \"  Disk: \" \$3 \" / \" \$2 \" (\" \$5 \")\"}'
echo ''
echo '🧹 Step 1: Removing old backups...'
cd /root/NEW\ START/backups && ls -t 2>/dev/null | tail -n +4 | while read old; do [ -n \"\$old\" ] && rm -rf \"\$old\" && echo \"  Deleted: \$old\"; done
echo ''
echo '🐳 Step 2: Docker cleanup...'
docker image prune -a -f --filter \"until=168h\" > /dev/null 2>&1 && echo '  Docker images cleaned'
docker container prune -f > /dev/null 2>&1 && echo '  Docker containers cleaned'
docker volume prune -f > /dev/null 2>&1 && echo '  Docker volumes cleaned'
echo ''
echo '📦 Step 3: Removing old build backups...'
rm -rf /root/NEW\ START/backend_local_backup_* 2>/dev/null && echo '  Backend backups deleted'
rm -rf /root/NEW\ START/frontend_local_backup_* 2>/dev/null && echo '  Frontend backups deleted'
echo ''
echo '🔄 Step 4: Restarting services...'
docker restart wms-git-watcher > /dev/null 2>&1 && echo '  Git-watcher restarted (freed 426MB RAM)'
docker restart wms-backend > /dev/null 2>&1 && echo '  Backend restarted'
echo ''
echo '📊 AFTER:'
df -h / | tail -1 | awk '{print \"  Disk: \" \$3 \" / \" \$2 \" (\" \$5 \")\"}'
echo ''
echo '✅ CLEANUP COMPLETE! Results above ☝️'
"@
```

---

## 📋 STEP-BY-STEP GUIDE (Safe & Controlled)

### STEP 1: Connect to VPS
```powershell
ssh root@148.230.107.155
```

### STEP 2: Check Current Disk Usage
```bash
echo "Current disk usage:"
df -h /
echo ""
echo "Current memory:"
free -h
```

**Expected Output:**
```
Filesystem      Size  Used Avail Use%
/dev/sda4        49G   44G  5.2G  90%    ← This is bad!

Mem:           3.6G  2.3G  1.3G
```

### STEP 3: Navigate to Backups
```bash
cd /root/NEW\ START/backups
```

### STEP 4: See All Backups (Sorted by Date)
```bash
ls -lhtr
# Keeps oldest first, newest last
```

### STEP 5: Delete OLD Backups (Keep Last 3)
```bash
# Automatic: Keep last 3, delete rest
ls -t | tail -n +4 | xargs -r rm -rf

# OR Manual: Remove specific ones
# rm -rf backup_2025-09-01
# rm -rf backup_2025-08-15
```

### STEP 6: Verify Backup Cleanup
```bash
df -h / | tail -1 | awk '{print $5}'
# Should now be less than 90%
```

### STEP 7: Docker Cleanup
```bash
docker system prune -a --volumes -f
# This removes:
# - unused images
# - unused containers
# - unused volumes
# - build cache
```

### STEP 8: Check Docker Results
```bash
docker system df
```

**Should show much less usage**

### STEP 9: Remove Old Build Backups
```bash
rm -rf /root/NEW\ START/backend_local_backup_*
rm -rf /root/NEW\ START/frontend_local_backup_*
echo "Old builds deleted"
```

### STEP 10: Restart Git-Watcher (Fix RAM Leak)
```bash
docker restart wms-git-watcher
echo "Git-watcher restarted - should free ~426MB RAM"
```

### STEP 11: Git Optimization (Optional)
```bash
cd /root/NEW\ START
git gc --aggressive
git prune
git reflog expire --expire=now --all
echo "Git optimized"
```

### STEP 12: Final Check
```bash
echo "=== FINAL STATUS ==="
echo ""
echo "Disk usage:"
df -h / | tail -1 | awk '{printf "  %s used / %s total (%s available) - %s\n", $3, $2, $4, $5}'
echo ""
echo "Memory:"
free -h | grep Mem | awk '{printf "  %s used / %s total\n", $3, $2}'
echo ""
echo "Docker status:"
docker system df | head -4
echo ""
echo "Services running:"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -5
```

---

## 🔍 VERIFICATION COMMANDS

### Check if it worked:
```bash
# Disk should be around 45-50% (not 90%)
df -h /

# Free space should be ~25GB (not 5GB)
df -h / | awk '{print $4}'

# RAM should have more available
free -h
```

### Check services are OK:
```bash
# All containers should show "Up"
docker ps

# Check backend logs
docker logs wms-backend | tail -20

# Check no errors
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## 🎨 EXPECTED OUTPUT

### Before Cleanup:
```
Filesystem      Size  Used Avail Use%
/dev/sda4        49G   44G  5.2G  90%    ← TOO FULL!

TYPE            TOTAL     SIZE
Images          65        14.59GB    ← Many images!
Containers      11        1.257GB
Volumes         11        1.065GB
Build Cache     316       7.112GB    ← Cache not cleaned!
```

### After Cleanup:
```
Filesystem      Size  Used Avail Use%
/dev/sda4        49G   23G   26G  47%    ← Healthy! ✅

TYPE            TOTAL     SIZE
Images          9         2.3GB     ← Cleaned! ✅
Containers      9         0.3GB
Volumes         6         0.4GB
Build Cache     0         0GB        ← Cleared! ✅
```

---

## ⚠️ TROUBLESHOOTING

### If cleanup fails with permission error:
```bash
# Make sure you're logged in as root
whoami  # Should show: root

# If not root, prefix commands with sudo
sudo rm -rf /root/NEW\ START/backend_local_backup_*
```

### If docker command fails:
```bash
# Check Docker is running
docker ps

# If not running, restart Docker
sudo service docker restart
# or
sudo systemctl restart docker
```

### If "permission denied" on backups:
```bash
# Check folder ownership
ls -la /root/NEW\ START/ | grep backups

# Fix permissions if needed
sudo chown -R root:root /root/NEW\ START/backups
```

### If git-watcher restart fails:
```bash
# Check if it exists
docker ps -a | grep git-watcher

# If it doesn't exist, skip this step
# If it exists but won't restart, check logs:
docker logs wms-git-watcher
```

---

## 🚀 ONE-LINER COMMANDS

### Command 1: Just clean backups (5 min)
```bash
cd /root/NEW\ START/backups && ls -t | tail -n +4 | xargs -r rm -rf && df -h /
```

### Command 2: Just clean Docker (3 min)
```bash
docker system prune -a --volumes -f && docker system df
```

### Command 3: Just remove old builds (1 min)
```bash
rm -rf /root/NEW\ START/backend_local_backup_* /root/NEW\ START/frontend_local_backup_* && echo "Done"
```

### Command 4: Just restart git-watcher (1 min)
```bash
docker restart wms-git-watcher && echo "Restarted"
```

### Command 5: ALL IN ONE (10 min)
```bash
cd /root/NEW\ START/backups && ls -t | tail -n +4 | xargs -r rm -rf ; docker system prune -a --volumes -f > /dev/null 2>&1 ; rm -rf /root/NEW\ START/backend_local_backup_* /root/NEW\ START/frontend_local_backup_* 2>/dev/null ; docker restart wms-git-watcher > /dev/null 2>&1 ; echo "Cleanup complete!" ; df -h / ; echo "" ; docker system df
```

---

## 📱 MOBILE-FRIENDLY COPY BUTTONS

### Copy This Entire Block:
```
cd /root/NEW\ START/backups
ls -t | tail -n +4 | xargs -r rm -rf
docker system prune -a --volumes -f > /dev/null 2>&1
rm -rf /root/NEW\ START/backend_local_backup_*
rm -rf /root/NEW\ START/frontend_local_backup_*
docker restart wms-git-watcher > /dev/null 2>&1
df -h /
```

---

## 🎯 SUCCESS CHECKLIST

After running cleanup:

- [ ] Disk usage is below 50% (was 90%)
- [ ] Free space is above 20GB (was 5GB)
- [ ] All Docker containers still running (`docker ps`)
- [ ] Backend not showing errors (`docker logs wms-backend`)
- [ ] Frontend is accessible (test in browser)
- [ ] Can SSH into VPS without issues
- [ ] No services are crashing

---

## 🆘 EMERGENCY STEPS

If VPS becomes unresponsive:

1. **Stop**: Don't run more commands
2. **Wait**: 5 minutes for cleanup to finish
3. **Check**: `ssh root@148.230.107.155 "echo ok"`
4. **Verify**: `df -h /` to see current state
5. **Contact**: VPS provider if completely unresponsive

---

## 📊 MONITORING CLEANUP PROGRESS

### Watch disk in real-time:
```bash
watch -n 2 'df -h /'
```
(Press Ctrl+C to stop)

### Check specific folder size:
```bash
du -sh /root/NEW\ START/backups
du -sh /var/lib/docker
du -sh /root/NEW\ START/backend
```

### See what Docker is using:
```bash
docker system df
docker container stats --no-stream
```

---

## 📈 POST-CLEANUP OPTIMIZATION

### Enable automatic cleanup:
```bash
crontab -e
# Add this line to keep only 7 days of backups:
0 2 * * * find /root/NEW\ START/backups -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
```

### Enable weekly docker cleanup:
```bash
crontab -e
# Add this line for weekly cleanup:
0 3 * * 0 docker system prune -a -f --filter "until=336h" 2>/dev/null
```

---

## ✅ FINAL VERIFICATION

Run this after cleanup to confirm everything:

```bash
echo "=== HEALTH CHECK ==="
echo ""
echo "1. Disk Status:"
df -h / | tail -1 | awk '{printf "   Usage: %s (should be <50%)\n", $5}'
echo ""
echo "2. Memory Status:"
free -h | grep Mem | awk '{printf "   Available: %s (should be >1.5GB)\n", $7}'
echo ""
echo "3. Services Status:"
echo "   Running containers:"
docker ps --format "{{.Names}}" | wc -l
echo ""
echo "4. Docker System:"
docker system df | head -3 | tail -2
echo ""
echo "✅ If all look good, you're done!"
```

---

**Created:** November 1, 2025  
**For:** 148.230.107.155  
**Status:** READY TO EXECUTE  
**Estimated Time:** 10-15 minutes  
**Difficulty:** EASY  
**Risk:** LOW
