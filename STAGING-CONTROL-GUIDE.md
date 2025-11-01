# 🚀 STAGING ENVIRONMENT CONTROL

## Super Simple Commands

### Method 1: Double-Click Batch Files (EASIEST!)

Located in project root folder:

- **`staging-OFF.bat`** - Stop staging (saves 900MB RAM) 💾
- **`staging-ON.bat`** - Start staging 🟢
- **`staging-STATUS.bat`** - Check status 📊

Just **double-click** the file you need!

---

### Method 2: PowerShell Commands

First, load the commands:
```powershell
cd "C:\Users\USER\Videos\NEW START"
. .\STAGING-COMMANDS.ps1
```

Then use:
```powershell
staging-off       # Stop staging (save 900MB RAM)
staging-on        # Start staging
staging-status    # Check status
staging-restart   # Restart staging
staging-logs      # View backend logs
```

---

### Method 3: Direct SSH (Advanced)

**Stop Staging:**
```powershell
ssh root@148.230.107.155 "docker stop wms-staging-backend wms-staging-frontend wms-staging-db"
```

**Start Staging:**
```powershell
ssh root@148.230.107.155 "docker start wms-staging-backend wms-staging-frontend wms-staging-db"
```

**Check Status:**
```powershell
ssh root@148.230.107.155 "docker ps --filter name=wms-staging"
```

---

## Memory Impact

### With Staging ON:
```
RAM Used:  2.8GB (78%)
RAM Free:  800MB
Containers: 6 running
```

### With Staging OFF:
```
RAM Used:  1.9GB (53%)  ⬇️ 25% improvement
RAM Free:  1.6GB        ⬆️ 2x more free memory
Containers: 3 running
```

**Memory Saved: ~900MB** 💾

---

## When to Use

### Turn OFF staging when:
- ❌ Not actively testing staging features
- ❌ Need more RAM for development
- ❌ Production environment only needed
- ❌ Running heavy local tasks

### Turn ON staging when:
- ✅ Testing new features before production
- ✅ Need separate testing environment
- ✅ Multiple team members testing
- ✅ Want to verify changes safely

---

## Quick Reference

| Action | Command | Time | RAM Impact |
|--------|---------|------|------------|
| Stop | `staging-OFF.bat` | 5 sec | Free 900MB |
| Start | `staging-ON.bat` | 10 sec | Use 900MB |
| Status | `staging-STATUS.bat` | 2 sec | No change |

---

## Troubleshooting

**If staging won't start:**
```powershell
ssh root@148.230.107.155 "docker logs wms-staging-backend --tail 50"
```

**If out of memory:**
```powershell
# Stop staging immediately
.\staging-OFF.bat

# Check memory
ssh root@148.230.107.155 "free -h"
```

**Reset staging completely:**
```powershell
ssh root@148.230.107.155 "docker restart wms-staging-backend wms-staging-frontend wms-staging-db"
```

---

## Access URLs

**Production:**
- Frontend: https://qgocargo.cloud
- Backend: https://qgocargo.cloud/api

**Staging (when ON):**
- Frontend: http://staging.qgocargo.cloud
- Backend: http://staging.qgocargo.cloud/api

---

## Recommendation

**Default Setup:**
- Keep staging **OFF** by default
- Turn **ON** only when needed for testing
- Saves RAM and reduces server load
- Production always remains running

**Current Status:** Can check anytime with `staging-STATUS.bat`

---

**Created:** November 1, 2025  
**Version:** v2.1.12
