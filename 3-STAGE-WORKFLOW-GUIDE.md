# 🚀 3-Stage Deployment Workflow Guide

## Overview

**Proper Flow**: Local → Staging → Production (NO shortcuts!)

```
┌─────────────┐       ┌──────────────┐       ┌───────────────┐
│   LOCAL     │──────▶│   STAGING    │──────▶│  PRODUCTION   │
│ Development │ AUTO  │   Testing    │MANUAL │     Live      │
└─────────────┘       └──────────────┘       └───────────────┘
```

---

## Stage 1: Local Development

### What You Do:
1. Make changes to frontend/backend/migrations
2. Test locally on `http://localhost:3000`
3. Commit using **auto-commit** or manual commit

### Commands:
```powershell
# Option A: Let auto-commit watcher do it (already running)
# Just save your files, it auto-commits every 5 seconds

# Option B: Manual quick commit
.\quick-commit.ps1

# Option C: Traditional git
git add .
git commit -m "Your message"
git push origin stable/prisma-mysql-production
```

---

## Stage 2: Staging Deployment (AUTOMATIC)

### What Happens:
✅ **Automatically triggered** when you push to `stable/prisma-mysql-production`

GitHub Actions will:
1. ✅ Build frontend (React + Vite)
2. ✅ Copy frontend to staging: `wms-staging-frontend` (port 8080)
3. ✅ Copy backend to staging: `wms-staging-backend` (port 5001)
4. ✅ Install dependencies in staging
5. ✅ Generate Prisma client
6. ✅ Clean failed migrations (safety)
7. ✅ Deploy migrations to staging DB (port 3308)
8. ✅ Start staging backend
9. ✅ Health check

### Test Staging:
```
🌐 Frontend: http://148.230.107.155:8080
🔌 Backend: http://148.230.107.155:5001/api/health
🗄️  Database: MySQL on port 3308 (separate from production)
```

### How to Monitor:
1. Go to: https://github.com/Akifbade/wms/actions
2. Click on latest workflow run
3. Watch "Deploy to Staging VPS (Full Stack)" job
4. Check logs for any errors

### Testing Checklist:
- [ ] Frontend loads properly
- [ ] Login works
- [ ] Shipment operations work
- [ ] Rack assignment works (the fix we just did!)
- [ ] No console errors
- [ ] Backend `/api/health` returns OK

---

## Stage 3: Production Deployment (MANUAL APPROVAL REQUIRED)

### When to Deploy to Production:
✅ **ONLY** after staging is fully tested and working!

### How to Deploy:

#### Option A: GitHub UI (Easiest)
1. Go to: https://github.com/Akifbade/wms/actions
2. Click **"Three-Stage Deployment Pipeline"** workflow
3. Click **"Run workflow"** button (top right)
4. Select:
   - **Branch**: `stable/prisma-mysql-production`
   - **Environment**: `production`
5. Click **"Run workflow"**
6. Approve the deployment when prompted

#### Option B: GitHub CLI
```bash
gh workflow run three-stage-deployment.yml \
  --ref stable/prisma-mysql-production \
  --field environment=production
```

### What Happens in Production Deployment:

1. ✅ **Creates backups** of current production:
   - Frontend HTML/JS/CSS
   - Backend code
   - Database dump

2. ✅ **Promotes Staging → Production**:
   - `wms-staging-frontend` → `wms-frontend`
   - `wms-staging-backend` → `wms-backend`
   - Migrations already tested in staging

3. ✅ **Cleans failed migrations** (safety)

4. ✅ **Starts production backend** with tested code

5. ✅ **Health checks**:
   - Backend health endpoint
   - Frontend accessibility
   - Domain check

### Production URLs:
```
🌐 Domain: http://qgocargo.cloud
🌐 Direct IP: http://148.230.107.155
🔌 Backend API: http://qgocargo.cloud/api
🐳 Portainer: https://148.230.107.155:9443
```

---

## Migration Safety Features

### Automatic Protection:
✅ Failed migrations cleaned before deployment  
✅ Staging tests migrations first (separate DB)  
✅ Production only gets pre-tested code  
✅ No direct local → production deployments  

### If Migration Fails:

#### In Staging:
- Check logs: `ssh root@148.230.107.155 "docker logs wms-staging-backend"`
- Fix migration locally
- Push again (auto-deploys to staging)
- Test again

#### In Production (Rare):
- Automatic rollback available in workflow logs
- Manual rollback steps provided in failure message
- Backups are in: `/root/NEW START/backups/production-TIMESTAMP/`

---

## Troubleshooting

### Staging Deployment Failed
```bash
# SSH to server
ssh root@148.230.107.155

# Check container status
docker ps -a | grep staging

# Check logs
docker logs wms-staging-backend --tail 100
docker logs wms-staging-frontend --tail 100

# Restart manually
cd '/root/NEW START'
docker-compose restart staging-backend staging-frontend
```

### Production Deployment Failed
```bash
# Check logs
ssh root@148.230.107.155
docker logs wms-backend --tail 100

# Rollback to backup
cd '/root/NEW START'
ls -lht backups/production-*/

# Restore from backup
BACKUP_DIR="backups/production-YYYYMMDD-HHMMSS"
docker cp $BACKUP_DIR/frontend/. wms-frontend:/usr/share/nginx/html/
docker cp $BACKUP_DIR/backend/. wms-backend:/app/
docker-compose restart frontend backend
```

### Backend Health Check Fails
```bash
# Check if backend is running
docker ps | grep wms-backend

# Check detailed logs
docker logs wms-backend --tail 200

# Check if database is accessible
docker exec wms-backend npx prisma db pull

# Check migrations
docker exec wms-backend npx prisma migrate status
```

---

## Quick Reference

### Container Names:
| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| **Staging** | `wms-staging-frontend` | `wms-staging-backend` | `wms-staging-db` |
| **Production** | `wms-frontend` | `wms-backend` | `wms-database` |

### Ports:
| Service | Staging | Production |
|---------|---------|------------|
| Frontend | 8080 | 80/443 |
| Backend | 5001 | 5000 |
| Database | 3308 (ext) | 3307 (ext) |

**Note**: External ports show MySQL internal port 3306 mapped to external ports (3308 staging, 3307 production)

### Useful Commands:
```bash
# Check all containers
ssh root@148.230.107.155 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Check staging health
curl http://148.230.107.155:8080
curl http://148.230.107.155:5001/api/health

# Check production health
curl http://qgocargo.cloud
curl http://148.230.107.155:5000/api/health

# View GitHub Actions logs
gh run list --workflow=three-stage-deployment.yml
gh run view <run-id> --log
```

---

## Best Practices

✅ **DO:**
- Always test in staging first
- Wait for staging health checks to pass
- Review staging logs before production
- Use manual approval for production
- Test migrations in staging first

❌ **DON'T:**
- Deploy directly to production from local
- Skip staging testing
- Deploy without health checks
- Ignore staging errors
- Rush production deployments

---

## Current Fix Applied

### Problem Fixed:
❌ **Before**: Local → Production (direct, risky)  
✅ **After**: Local → Staging → Production (safe, tested)

### Specific Issues Resolved:
1. ✅ **Migration crash loop** - Auto-cleaned before deployment
2. ✅ **CORS errors** - FRONTEND_URL configured
3. ✅ **404 on assign-rack** - Backend rebuilt with latest code
4. ✅ **Backend promotes from staging** - Tested code only
5. ✅ **Full stack deployment** - Frontend + Backend + Migrations

---

## Need Help?

### Check Status:
- GitHub Actions: https://github.com/Akifbade/wms/actions
- Staging: http://148.230.107.155:8080
- Production: http://qgocargo.cloud

### Get Logs:
```bash
# Staging logs
ssh root@148.230.107.155 "docker logs wms-staging-backend --tail 100"

# Production logs  
ssh root@148.230.107.155 "docker logs wms-backend --tail 100"

# GitHub Actions logs
gh run list --workflow=three-stage-deployment.yml --limit 5
```

---

**Last Updated**: October 31, 2025  
**Workflow File**: `.github/workflows/three-stage-deployment.yml`  
**Status**: ✅ Active and Working
