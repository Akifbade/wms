# DOCKER SAFETY GUIDE
# Critical reminders for Docker development

## ⚠️ CRITICAL: Docker Container Rules

### 🔴 **RULE #1: Docker containers are TEMPORARY!**
```
Any changes inside container will be LOST on restart!
Always edit code on your LOCAL machine, not inside container!
```

### 🔴 **RULE #2: Volume mounts are your friends**
```yaml
volumes:
  - ./backend:/app        # ✅ Code changes persist
  - /app/node_modules     # ✅ Dependencies inside container
  - ./uploads:/app/uploads # ✅ Uploaded files persist
```

### 🔴 **RULE #3: Always commit before container operations**
```bash
# WRONG ❌
docker-compose down
# Code lost!

# RIGHT ✅
git add .
git commit -m "Save my work"
docker-compose down
# Code safe!
```

## 🛡️ Safety Checklist Before ANY Docker Operation:

```powershell
# 1. Check what changed
git status

# 2. Commit everything
git add -A
git commit -m "Work in progress"

# 3. Tag for safety
git tag backup-safe-$(Get-Date -Format "yyyyMMdd-HHmmss")

# 4. Now safe to restart Docker
docker-compose down
docker-compose up -d
```

## 🚨 Emergency Recovery:

### If you lost code after Docker restart:
```bash
# 1. Check git history
git log --oneline -10

# 2. Restore from last commit
git reset --hard HEAD

# 3. Or restore from backup tag
git tag -l "backup-*"
git reset --hard backup-YYYYMMDD-HHMMSS
```

## 📦 Auto-Backup System (RECOMMENDED):

```powershell
# Start auto-backup (commits every 5 minutes)
Start-Process powershell -ArgumentList "-File scripts\auto-backup.ps1" -WindowStyle Hidden

# Check backup log
Get-Content auto-backup.log -Tail 20

# Stop auto-backup
.\scripts\auto-backup.ps1 -Stop
```

## 🎯 Best Practices:

### ✅ DO:
- Edit code on local machine (c:\Users\USER\Videos\NEW START\)
- Commit frequently (every feature/fix)
- Use feature branches for experiments
- Keep auto-backup running
- Tag before major changes

### ❌ DON'T:
- Edit files inside container (docker exec -it ...)
- Restart containers without committing
- Delete .git folder
- Work without commits for hours
- Trust container filesystem

## 🔄 Safe Development Workflow:

```bash
# 1. Start safe development mode
bash scripts/safe-dev.sh

# 2. Make changes to code (local files)

# 3. Docker auto-reloads (volume mount)

# 4. Test in browser

# 5. Commit when working
git add .
git commit -m "Feature: XYZ working"

# 6. If broken, restore backup
git reset --hard backup-XXXXXXXX
```

## 📊 Where Your Code Lives:

| Location | Persistent? | Purpose |
|----------|-------------|---------|
| `c:\Users\USER\Videos\NEW START\` | ✅ YES | Your actual code |
| Inside Docker container `/app` | ❌ NO | Running copy (volume mount) |
| `.git` folder | ✅ YES | All your history |
| `node_modules` inside container | ❌ NO | Rebuilt on container create |

## 🎓 Remember:

**Docker is like RAM - temporary and fast**
**Git is like Hard Disk - permanent and safe**

Always keep your work in Git, not in Docker!
