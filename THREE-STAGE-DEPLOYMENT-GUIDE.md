# 🚀 Three-Stage Safe Deployment Guide

## 📋 Overview

This project uses a **three-stage deployment pipeline** with comprehensive safety features:

1. **Local Development** - Test on your machine
2. **Staging VPS** - Auto-deploy for testing (http://148.230.107.155:8080)
3. **Production VPS** - Manual approval required (https://qgocargo.cloud)

## 🔒 Safety Features

✅ **Automatic Database Backups** - Before every deployment  
✅ **Health Checks** - At every stage, automatic rollback on failure  
✅ **Backup Limit** - Only 2 backups kept (storage safety)  
✅ **Isolated Staging** - Completely separate from production  
✅ **Prisma Migration Safety** - Tested in staging first  
✅ **No Direct Local→Production** - Must go through staging  
✅ **Automatic Rollback** - If production deployment fails  

---

## 📝 Complete Workflow

### **Step 1: Local Development**

1. Make code changes (frontend/backend)
2. Test on localhost:
   ```powershell
   # Run task: ⚡ QUICK: Rebuild Localhost After Changes
   # OR manually:
   cd frontend
   npm run build
   cd ..
   docker-compose restart wms-backend wms-frontend
   ```
3. Verify changes work on http://localhost

### **Step 2: Commit & Push**

```powershell
# Auto-commit (recommended)
.\quick-commit.ps1

# OR manual commit
git add .
git commit -m "Your commit message"
git push origin stable/prisma-mysql-production
```

### **Step 3: Automatic Staging Deployment**

✨ **Automatic** - Triggers on push to `stable/prisma-mysql-production`

GitHub Actions will:
1. 📦 Build frontend
2. 💾 Backup staging database
3. 📡 Pull latest code to VPS
4. 🗄️ Apply Prisma migrations
5. 🚀 Deploy staging containers
6. 🏥 Run health checks

**Wait 3-5 minutes**, then check:
- Frontend: http://148.230.107.155:8080
- Backend API: http://148.230.107.155:5001/api/health

**Login Credentials:**
- Email: `admin@demo.com`
- Password: `demo123`

### **Step 4: Test on Staging**

Thoroughly test all features on staging:
- ✅ Login works
- ✅ Create/edit/delete operations
- ✅ Photo uploads
- ✅ QR scanning
- ✅ All pages load correctly

### **Step 5: Deploy to Production** (Manual Approval)

**⚠️ Only after staging is fully tested!**

1. Go to: https://github.com/Akifbade/wms/actions
2. Click: **"🚀 Three-Stage Safe Deployment"** workflow
3. Click: **"Run workflow"** dropdown
4. Select environment: **`production`**
5. Click: **"Run workflow"** button
6. GitHub will ask for **manual approval** - Click **"Review deployments"**
7. Check the box: **production**
8. Click: **"Approve and deploy"**

GitHub Actions will:
1. 🔒 Verify staging is healthy
2. 💾 Backup production database
3. 📸 Snapshot current production state
4. 📡 Pull latest code
5. 🗄️ Apply Prisma migrations
6. 🚀 Deploy production containers
7. 🏥 Run health checks
8. 🔄 **Auto-rollback if anything fails!**

**Production URL:** https://qgocargo.cloud

---

## 🗄️ Database Migration Safety

### How Migrations Work:

1. **Local**: Create migration with `npx prisma migrate dev`
2. **Staging**: Auto-applied on deployment, tested first
3. **Production**: Only applies pre-tested migrations from staging

### Migration Commands:

```bash
# Staging (automatic in workflow)
docker exec wms-staging-backend npx prisma migrate deploy

# Production (automatic in workflow)
docker exec wms-backend npx prisma migrate deploy

# If migration fails, fallback:
docker exec wms-backend npx prisma db push --accept-data-loss
```

### Safety Features:

- ✅ Migrations tested in isolated staging database first
- ✅ Automatic database backup before migration
- ✅ Fallback to `prisma db push` if migration fails
- ✅ Production rollback if migration breaks anything

---

## 💾 Backup Management

### Automatic Backups:

- **Before staging deployment** → `backups-staging/staging_backup_YYYYMMDD_HHMMSS.sql`
- **Before production deployment** → `backups-production/prod_backup_YYYYMMDD_HHMMSS.sql`
- **Retention**: Only **2 most recent backups** kept (automatic cleanup)

### Manual Backup:

```bash
# SSH to VPS
ssh root@148.230.107.155

# Backup staging
cd /root/NEW\ START
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
docker exec wms-staging-db mysqldump -ustaging_user -pstaging_pass_12345 warehouse_staging > "backups-staging/manual_backup_${TIMESTAMP}.sql"

# Backup production
docker exec wms-database mysqldump -uroot -prootpassword123 warehouse_wms > "backups-production/manual_backup_${TIMESTAMP}.sql"
```

### Manual Restore:

```bash
# SSH to VPS
ssh root@148.230.107.155
cd /root/NEW\ START

# Restore staging
docker exec -i wms-staging-db mysql -ustaging_user -pstaging_pass_12345 warehouse_staging < backups-staging/staging_backup_20250103_120000.sql

# Restore production (⚠️ CAREFUL!)
docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms < backups-production/prod_backup_20250103_120000.sql
```

---

## 🔄 Rollback Procedures

### Automatic Rollback:

The workflow **automatically rolls back production** if:
- Health checks fail after deployment
- Backend doesn't respond within 2.5 minutes
- Frontend is not accessible

Rollback includes:
1. Restore database from latest backup
2. Restart containers to previous state

### Manual Rollback:

```bash
# SSH to VPS
ssh root@148.230.107.155
cd /root/NEW\ START

# Find latest backup
ls -lt backups-production/

# Restore database
docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms < backups-production/prod_backup_LATEST.sql

# Restart containers
docker-compose -f docker-compose.yml -f docker-compose.production.yml restart

# Verify health
curl https://qgocargo.cloud/api/health
```

---

## 🏥 Health Checks

### Staging Health Check:

```powershell
# Backend
Invoke-WebRequest -Uri 'http://148.230.107.155:5001/api/health'

# Frontend
Invoke-WebRequest -Uri 'http://148.230.107.155:8080'
```

### Production Health Check:

```powershell
# Backend
Invoke-WebRequest -Uri 'https://qgocargo.cloud/api/health'

# Frontend
Invoke-WebRequest -Uri 'https://qgocargo.cloud'
```

### Expected Response:

```json
{
  "status": "ok",
  "version": "v2.1.122",
  "environment": "production"
}
```

---

## 🐳 Container Management

### Staging Containers:

```bash
# View staging containers
docker ps --filter "name=staging"

# Logs
docker logs wms-staging-backend --tail 50
docker logs wms-staging-frontend --tail 50
docker logs wms-staging-db --tail 50

# Restart
docker-compose -f docker-compose-staging-isolated.yml restart

# Rebuild
docker-compose -f docker-compose-staging-isolated.yml up -d --build
```

### Production Containers:

```bash
# View production containers
docker ps --filter "name=wms"

# Logs
docker logs wms-backend --tail 50
docker logs wms-frontend --tail 50
docker logs wms-database --tail 50

# Restart
docker-compose -f docker-compose.yml -f docker-compose.production.yml restart

# Rebuild (⚠️ Use workflow instead!)
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

---

## 🔍 Troubleshooting

### Staging Login Issues:

```bash
# SSH to VPS
ssh root@148.230.107.155

# Check if demo users exist
docker exec wms-staging-db mysql -ustaging_user -pstaging_pass_12345 warehouse_staging -e "SELECT email, name, role FROM users;"

# Recreate demo users if needed
cd /root/NEW\ START
docker exec -i wms-staging-db mysql -ustaging_user -pstaging_pass_12345 warehouse_staging < create-staging-demo-users.sql
```

### Staging Not Accessible:

```bash
# Check containers
docker ps --filter "name=staging"

# Check logs
docker logs wms-staging-backend --tail 100

# Restart staging
cd /root/NEW\ START
docker-compose -f docker-compose-staging-isolated.yml restart
```

### Production Not Accessible:

```bash
# Check containers
docker ps --filter "name=wms"

# Check logs
docker logs wms-backend --tail 100

# Check nginx config
docker exec wms-frontend cat /etc/nginx/conf.d/default.conf

# Restart production
cd /root/NEW\ START
docker-compose -f docker-compose.yml -f docker-compose.production.yml restart
```

### Prisma Migration Failed:

```bash
# Staging
docker exec wms-staging-backend npx prisma db push --accept-data-loss

# Production (⚠️ CAREFUL!)
docker exec wms-backend npx prisma db push --accept-data-loss
```

---

## 📊 Environment Comparison

| Feature | Staging | Production |
|---------|---------|------------|
| **URL** | http://148.230.107.155:8080 | https://qgocargo.cloud |
| **Database** | `warehouse_staging` (isolated) | `warehouse_wms` |
| **DB Port** | 3308 | 3307 |
| **Backend Port** | 5001 | 5000 |
| **Frontend Port** | 8080 | 80/443 |
| **SSL** | ❌ No | ✅ Yes (Let's Encrypt) |
| **Deployment** | Auto on push | Manual approval |
| **Container Names** | `wms-staging-*` | `wms-*` |
| **Network** | `staging-network` | `wms-network` |
| **Backups** | `backups-staging/` | `backups-production/` |

---

## 🔑 Credentials

### Staging Demo Users:

- **Admin**: `admin@demo.com` / `demo123`
- **Manager**: `manager@demo.com` / `demo123`

### Database Access:

**Staging:**
```
Host: 148.230.107.155:3308
Database: warehouse_staging
User: staging_user
Password: staging_pass_12345
```

**Production:**
```
Host: 148.230.107.155:3307
Database: warehouse_wms
User: root
Password: rootpassword123
```

---

## ⚠️ Important Rules

1. **Never directly deploy to production** - Always go through staging first
2. **Always test on staging** - Thoroughly before promoting to production
3. **Never skip backups** - They're automatic for a reason
4. **Don't delete SSH keys** - They're already configured and working
5. **Keep only 2 backups** - Automatic cleanup preserves disk space
6. **Monitor GitHub Actions** - Check workflow status for any errors
7. **Use rollback if needed** - Don't panic, there's always a backup

---

## 📞 Support

If something goes wrong:

1. Check GitHub Actions logs: https://github.com/Akifbade/wms/actions
2. Check container logs: `docker logs <container-name>`
3. Check health endpoints: `/api/health`
4. Review this guide's troubleshooting section
5. Use rollback if production is broken

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Staging deployed successfully
- [ ] All features tested on staging
- [ ] Login works on staging
- [ ] No errors in staging logs
- [ ] Staging health check passes
- [ ] Database backup exists
- [ ] Ready to approve production deployment

---

**Last Updated:** November 3, 2025  
**Version:** v2.1.122  
**Workflow:** `three-stage-safe-deployment.yml`
