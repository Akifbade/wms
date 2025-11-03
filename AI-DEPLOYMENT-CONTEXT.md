# 🤖 AI ASSISTANT - PROJECT CONTEXT & DEPLOYMENT INSTRUCTIONS

## 📋 READ THIS FIRST

This document contains **complete context** for AI assistants working on this project. If you're a new AI session, read this file to understand the entire system, deployment process, and VPS configuration.

---

## 🚀 PROJECT OVERVIEW

**Project Name:** Warehouse Management System (WMS) - QGO Cargo  
**Version:** v2.1.125  
**Branch:** `stable/prisma-mysql-production`  
**GitHub:** https://github.com/Akifbade/wms  

**Tech Stack:**
- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Node.js + Express + Prisma ORM
- Database: MySQL 8.0
- Container: Docker + Docker Compose
- CI/CD: GitHub Actions
- Server: Rocky Linux 9.x (RHEL-based)

---

## 🌐 VPS SERVER DETAILS

### Server Information:
- **IP Address:** 148.230.107.155
- **Operating System:** Rocky Linux 9.x (RHEL-based)
- **User:** root
- **Project Path:** `/root/NEW START` (has space in path!)
- **Container Engine:** Docker + Docker Compose v3.8

### SSH Access:
```bash
ssh root@148.230.107.155
# Password: (stored securely, ask user if needed)
```

**⚠️ IMPORTANT:** SSH keys are already configured in GitHub Secrets:
- `STAGING_VPS_SSH_KEY` - For staging deployments
- `PRODUCTION_VPS_SSH_KEY` - For production deployments
- **NEVER delete or modify these keys!**

---

## 🔗 ENVIRONMENTS

### 1. **LOCALHOST** (Development)
- **Frontend:** http://localhost:80
- **Backend:** http://localhost:5000/api/health
- **Database:** localhost:3306 → `warehouse_wms`
- **Containers:** `wms-frontend`, `wms-backend`, `wms-database`
- **Docker Compose:** `docker-compose.yml` + `docker-compose.override.yml`

**Quick Rebuild:**
```powershell
# Run VS Code Task: ⚡ QUICK: Rebuild Localhost After Changes
# OR manually:
cd frontend
npm run build
cd ..
docker cp frontend/dist/. wms-frontend:/usr/share/nginx/html/
docker exec wms-frontend nginx -s reload
docker-compose restart wms-backend
```

### 2. **STAGING** (Testing Environment - ISOLATED)
- **Frontend:** http://148.230.107.155:8080
- **Backend:** http://148.230.107.155:5001/api/health
- **Database:** 148.230.107.155:3308 → `warehouse_staging`
- **Containers:** `wms-staging-frontend`, `wms-staging-backend`, `wms-staging-db`, `wms-staging-db-backup`
- **Docker Compose:** `docker-compose-staging-isolated.yml`
- **Network:** `staging-network` (completely isolated from production)
- **Volumes:** `staging_mysql_data`

**Database Credentials:**
```
Host: 148.230.107.155:3308
Database: warehouse_staging
User: staging_user
Password: staging_pass_12345
```

**Login Credentials:**
```
Email: admin@demo.com
Password: demo123
(Bcrypt hash: $2b$10$xd1IcGh7LvXjcQBNEnb8zuRwWekVq9VYGxQBQ9JnI.2tmCBYWzIzS)
```

**Deployment:** Automatic on push to `stable/prisma-mysql-production`

**SSH Commands:**
```bash
# View logs
ssh root@148.230.107.155 "docker logs wms-staging-backend --tail 50"

# Restart staging
ssh root@148.230.107.155 "cd /root/NEW\ START && docker-compose -f docker-compose-staging-isolated.yml restart"

# Check status
ssh root@148.230.107.155 "docker ps --filter name=staging"

# Access database
ssh root@148.230.107.155 "docker exec -i wms-staging-db mysql -ustaging_user -pstaging_pass_12345 warehouse_staging"
```

### 3. **PRODUCTION** (Live Environment)
- **Frontend:** https://qgocargo.cloud (ports 80, 443)
- **Backend:** https://qgocargo.cloud/api/health (port 5000)
- **Database:** 148.230.107.155:3307 → `warehouse_wms`
- **Containers:** `wms-frontend`, `wms-backend`, `wms-database`
- **Docker Compose:** `docker-compose.yml` + `docker-compose.production.yml`
- **Network:** `wms-network`
- **SSL:** Let's Encrypt (auto-renew)
- **Certificates:** `/etc/letsencrypt/live/qgocargo.cloud/`

**Database Credentials:**
```
Host: 148.230.107.155:3307
Database: warehouse_wms
Root User: root
Root Password: rootpassword123
App User: wms_user
App Password: wmspassword123
```

**Deployment:** Manual approval required via GitHub Actions

**SSH Commands:**
```bash
# View logs
ssh root@148.230.107.155 "docker logs wms-backend --tail 50"

# Restart production (⚠️ CAREFUL!)
ssh root@148.230.107.155 "cd /root/NEW\ START && docker-compose -f docker-compose.yml -f docker-compose.production.yml restart"

# Check status
ssh root@148.230.107.155 "docker ps --filter name=wms"

# Access database
ssh root@148.230.107.155 "docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms"
```

---

## 🚀 COMPLETE DEPLOYMENT WORKFLOW

### **Three-Stage Deployment Pipeline:**

```
LOCAL → STAGING (auto) → PRODUCTION (manual approval)
```

### **Step-by-Step Process:**

#### **STEP 1: Local Development**
1. Make code changes in `frontend/` or `backend/`
2. Test on localhost (http://localhost)
3. Verify everything works

**Rebuild localhost:**
```powershell
# Run VS Code Task: ⚡ QUICK: Rebuild Localhost After Changes
```

#### **STEP 2: Commit & Push**
```powershell
# Option A: Quick commit (recommended)
.\quick-commit.ps1

# Option B: Manual commit
git add .
git commit -m "Your message"
git push origin stable/prisma-mysql-production
```

#### **STEP 3: Automatic Staging Deployment**
- **Trigger:** Automatic on push
- **Duration:** 3-5 minutes
- **Workflow:** `.github/workflows/three-stage-safe-deployment.yml`
- **Monitor:** https://github.com/Akifbade/wms/actions

**What happens automatically:**
1. ✅ Build frontend
2. ✅ Backup staging database
3. ✅ Pull latest code to VPS
4. ✅ Apply Prisma migrations
5. ✅ Build and deploy containers
6. ✅ Run health checks

**After deployment, test staging:**
- Frontend: http://148.230.107.155:8080
- Backend: http://148.230.107.155:5001/api/health
- Login: admin@demo.com / demo123

#### **STEP 4: Test Staging Thoroughly**
Test all features:
- ✅ Login works
- ✅ Create/edit/delete operations
- ✅ Photo uploads
- ✅ QR scanning
- ✅ All pages load correctly
- ✅ No errors in browser console
- ✅ Backend logs clean

#### **STEP 5: Deploy to Production** (Manual Approval)
**⚠️ Only after staging is fully tested!**

1. Go to: https://github.com/Akifbade/wms/actions
2. Click: "🚀 Three-Stage Safe Deployment" workflow
3. Click: "Run workflow" dropdown
4. Select environment: **production**
5. Click: "Run workflow" button
6. GitHub asks for approval → Click "Review deployments"
7. Check box: **production**
8. Click: "Approve and deploy"

**What happens automatically:**
1. ✅ Verify staging is healthy
2. ✅ Backup production database
3. ✅ Snapshot current state (for rollback)
4. ✅ Pull latest code
5. ✅ Apply Prisma migrations
6. ✅ Build and deploy containers
7. ✅ Run health checks
8. ✅ **Auto-rollback if anything fails!**

**Production URL:** https://qgocargo.cloud

---

## 🔒 SAFETY FEATURES

### Automatic Protections:

1. **Database Backups** - Before every deployment
   - Staging: `backups-staging/staging_backup_YYYYMMDD_HHMMSS.sql`
   - Production: `backups-production/prod_backup_YYYYMMDD_HHMMSS.sql`
   - **Only 2 backups kept** (automatic cleanup)

2. **Health Checks** - At every stage
   - Backend must respond within 2.5 minutes
   - Frontend must be accessible
   - If fails: deployment stops

3. **Automatic Rollback** - Production only
   - Restores database from backup
   - Restarts containers
   - Logs error details

4. **Isolated Staging**
   - Separate database (`warehouse_staging`)
   - Separate network (`staging-network`)
   - Separate containers (`wms-staging-*`)
   - **No risk to production**

5. **Migration Safety**
   - Tested in staging first
   - Backup before applying
   - Fallback to `prisma db push` if fails

6. **No Direct Production Deploy**
   - Must go through staging
   - Manual approval required
   - Cannot skip safety checks

---

## 🗄️ DATABASE MANAGEMENT

### Prisma Migrations:

**Create new migration:**
```bash
# On localhost
cd backend
npx prisma migrate dev --name description_of_change
```

**Apply to staging (automatic in workflow):**
```bash
docker exec wms-staging-backend npx prisma migrate deploy
# Fallback: npx prisma db push --accept-data-loss
```

**Apply to production (automatic in workflow):**
```bash
docker exec wms-backend npx prisma migrate deploy
# Fallback: npx prisma db push --accept-data-loss
```

### Manual Database Backup:

**Staging:**
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
docker exec wms-staging-db mysqldump -ustaging_user -pstaging_pass_12345 warehouse_staging > "backups-staging/manual_backup_${TIMESTAMP}.sql"
```

**Production:**
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
docker exec wms-database mysqldump -uroot -prootpassword123 warehouse_wms > "backups-production/manual_backup_${TIMESTAMP}.sql"
```

### Manual Database Restore:

**Staging:**
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
docker exec -i wms-staging-db mysql -ustaging_user -pstaging_pass_12345 warehouse_staging < backups-staging/staging_backup_20250103_120000.sql
```

**Production (⚠️ CAREFUL!):**
```bash
ssh root@148.230.107.155
cd /root/NEW\ START
docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms < backups-production/prod_backup_20250103_120000.sql
docker-compose -f docker-compose.yml -f docker-compose.production.yml restart
```

---

## 🐳 DOCKER COMPOSE FILES

### File Purposes:

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base production configuration |
| `docker-compose.override.yml` | HTTP-only override (staging compatibility) |
| `docker-compose.production.yml` | Production HTTPS/SSL configuration |
| `docker-compose-staging-isolated.yml` | Isolated staging environment |
| `docker-compose.local.yml` | Local development overrides |

### Usage:

**Localhost:**
```bash
docker-compose up -d
# Uses: docker-compose.yml + docker-compose.override.yml
```

**Staging:**
```bash
docker-compose -f docker-compose-staging-isolated.yml up -d --build
```

**Production:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

---

## 🔄 ROLLBACK PROCEDURES

### Automatic Rollback (Production):
- Triggers automatically if production health checks fail
- Restores database from latest backup
- Restarts containers to previous state

### Manual Rollback:

**1. Check available backups:**
```bash
ssh root@148.230.107.155 "ls -lt /root/NEW\ START/backups-production/"
```

**2. Restore database:**
```bash
ssh root@148.230.107.155 "cd /root/NEW\ START && docker exec -i wms-database mysql -uroot -prootpassword123 warehouse_wms < backups-production/prod_backup_TIMESTAMP.sql"
```

**3. Restart containers:**
```bash
ssh root@148.230.107.155 "cd /root/NEW\ START && docker-compose -f docker-compose.yml -f docker-compose.production.yml restart"
```

**4. Verify health:**
```powershell
Invoke-WebRequest -Uri 'https://qgocargo.cloud/api/health'
```

---

## 📂 IMPORTANT FILES

### Documentation:
- `THREE-STAGE-DEPLOYMENT-GUIDE.md` - Complete deployment guide
- `AI-CONTEXT.md` - Context for AI assistants
- `AI-PERMANENT-CONTEXT-REQUIREMENTS.md` - Permanent AI instructions
- `AUTOMATED-WORKFLOW-GUIDE.md` - Auto-commit workflow

### Deployment:
- `.github/workflows/three-stage-safe-deployment.yml` - Main workflow
- `quick-commit.ps1` - Quick commit and push
- `auto-commit-watcher.ps1` - Auto-commit on changes

### Database:
- `create-staging-demo-users.sql` - Create staging demo users
- `fix-staging-passwords.sql` - Fix staging passwords
- `backend/prisma/schema.prisma` - Database schema
- `backend/prisma/migrations/` - Migration files

### Configuration:
- `.vscode/settings.json` - VS Code workspace settings (this file!)
- `.vscode/tasks.json` - VS Code tasks
- `backend/.env` - Backend environment variables
- `frontend/.env` - Frontend environment variables

---

## ⚠️ CRITICAL RULES FOR AI ASSISTANTS

### **NEVER DO THESE:**

1. ❌ **Delete or modify SSH keys** - They're already configured in GitHub Secrets
2. ❌ **Deploy directly to production** - Must go through staging first
3. ❌ **Skip database backups** - They're automatic for safety
4. ❌ **Modify the VPS path** - It's `/root/NEW START` (has space!)
5. ❌ **Change staging password** - It's `admin@demo.com / demo123`
6. ❌ **Delete `.github/workflows/` files** - They control deployments
7. ❌ **Keep more than 2 backups** - Storage safety (auto-cleanup enabled)

### **ALWAYS DO THESE:**

1. ✅ **Test on localhost first** - Before committing
2. ✅ **Test on staging before production** - Thoroughly
3. ✅ **Use GitHub Actions for deployments** - No manual VPS deployments
4. ✅ **Check health endpoints** - Before and after deployment
5. ✅ **Read logs if something fails** - `docker logs <container>`
6. ✅ **Keep staging isolated** - Separate DB, network, containers
7. ✅ **Monitor GitHub Actions** - Check workflow status

---

## 🛠️ COMMON COMMANDS

### Health Checks:
```powershell
# Staging
Invoke-WebRequest -Uri 'http://148.230.107.155:5001/api/health'
Invoke-WebRequest -Uri 'http://148.230.107.155:8080'

# Production
Invoke-WebRequest -Uri 'https://qgocargo.cloud/api/health'
Invoke-WebRequest -Uri 'https://qgocargo.cloud'
```

### Container Management:
```bash
# View containers
docker ps
docker ps --filter "name=staging"
docker ps --filter "name=wms"

# View logs
docker logs wms-staging-backend --tail 50 --follow
docker logs wms-backend --tail 50 --follow

# Restart
docker-compose restart wms-backend
docker-compose -f docker-compose-staging-isolated.yml restart

# Rebuild
docker-compose up -d --build
docker-compose -f docker-compose-staging-isolated.yml up -d --build
```

### Git Operations:
```powershell
# Quick commit (recommended)
.\quick-commit.ps1

# Manual
git add .
git commit -m "Description"
git push origin stable/prisma-mysql-production

# Check status
git status
git log --oneline -10
```

---

## 🔍 TROUBLESHOOTING

### Staging Issues:

**Login not working:**
```bash
# Recreate demo users
ssh root@148.230.107.155
cd /root/NEW\ START
docker exec -i wms-staging-db mysql -ustaging_user -pstaging_pass_12345 warehouse_staging < fix-staging-passwords.sql
```

**Containers not starting:**
```bash
# Check logs
docker logs wms-staging-backend --tail 100
docker logs wms-staging-frontend --tail 100

# Restart
docker-compose -f docker-compose-staging-isolated.yml restart
```

**Database connection issues:**
```bash
# Check if staging DB is running
docker ps --filter "name=staging-db"

# Check database exists
docker exec wms-staging-db mysql -ustaging_user -pstaging_pass_12345 -e "SHOW DATABASES;"
```

### Production Issues:

**Site not accessible:**
```bash
# Check containers
docker ps --filter "name=wms"

# Check nginx config
docker exec wms-frontend cat /etc/nginx/conf.d/default.conf

# Check SSL certificates
docker exec wms-frontend ls -la /etc/letsencrypt/live/qgocargo.cloud/
```

**Backend errors:**
```bash
# Check logs
docker logs wms-backend --tail 100

# Check database connection
docker exec wms-backend npx prisma db pull
```

### GitHub Actions Failures:

**Exit code 255 (SSH issue):**
- Check `STAGING_VPS_SSH_KEY` and `PRODUCTION_VPS_SSH_KEY` secrets exist
- Verify VPS is accessible: `ssh root@148.230.107.155`

**Build failures:**
- Check syntax errors in code
- Verify `npm install` works locally
- Check `frontend/package.json` and `backend/package.json`

**Deployment failures:**
- Check VPS disk space: `ssh root@148.230.107.155 "df -h"`
- Check Docker is running: `ssh root@148.230.107.155 "docker ps"`
- Review workflow logs: https://github.com/Akifbade/wms/actions

---

## 📊 PROJECT STRUCTURE

```
NEW START/
├── .github/
│   └── workflows/
│       └── three-stage-safe-deployment.yml  # Main deployment workflow
├── .vscode/
│   ├── settings.json                        # Workspace settings
│   └── tasks.json                           # VS Code tasks
├── frontend/                                # React + TypeScript
│   ├── src/
│   ├── public/
│   ├── nginx.conf                           # Nginx config
│   ├── staging.nginx.conf                   # Staging nginx
│   ├── nginx-ssl.conf                       # Production nginx (SSL)
│   └── Dockerfile
├── backend/                                 # Node.js + Express + Prisma
│   ├── src/
│   ├── prisma/
│   │   ├── schema.prisma                    # Database schema
│   │   └── migrations/                      # Migration files
│   ├── uploads/                             # Production uploads
│   ├── uploads-staging/                     # Staging uploads
│   └── Dockerfile
├── backups-staging/                         # Staging backups (max 2)
├── backups-production/                      # Production backups (max 2)
├── docker-compose.yml                       # Base config
├── docker-compose.override.yml              # HTTP override
├── docker-compose.production.yml            # Production SSL
├── docker-compose-staging-isolated.yml      # Staging isolated
├── quick-commit.ps1                         # Quick commit script
├── auto-commit-watcher.ps1                  # Auto-commit watcher
├── THREE-STAGE-DEPLOYMENT-GUIDE.md          # Deployment guide
├── AI-DEPLOYMENT-CONTEXT.md                 # This file!
└── VERSION.md                               # Current version
```

---

## 🔗 USEFUL LINKS

- **GitHub Repository:** https://github.com/Akifbade/wms
- **GitHub Actions:** https://github.com/Akifbade/wms/actions
- **Staging Frontend:** http://148.230.107.155:8080
- **Staging Backend:** http://148.230.107.155:5001/api/health
- **Production Frontend:** https://qgocargo.cloud
- **Production Backend:** https://qgocargo.cloud/api/health

---

## 📝 VERSION HISTORY

- **v2.1.125** - Added comprehensive AI context and deployment documentation
- **v2.1.124** - Fixed staging passwords, improved workflow
- **v2.1.123** - Added three-stage safe deployment guide
- **v2.1.122** - Implemented three-stage deployment with safety features
- **v2.1.121** - Created staging demo users
- **v2.1.120** - Fixed Prisma migration commands
- **v2.1.119** - Fixed nginx config for staging
- **v2.1.106** - Photo compression feature (ready, not deployed to production yet)

---

## 💡 TIPS FOR NEW AI SESSIONS

1. **Always read this file first** - It contains complete context
2. **Check `.vscode/settings.json`** - Has quick reference info
3. **Review `THREE-STAGE-DEPLOYMENT-GUIDE.md`** - For deployment details
4. **Test on localhost before committing** - Avoid breaking changes
5. **Use GitHub Actions** - Don't SSH to VPS manually for deployments
6. **Monitor workflow logs** - If deployment fails
7. **Ask user before major changes** - Especially SSH keys, Docker configs
8. **Keep documentation updated** - When making significant changes

---

**Last Updated:** November 3, 2025  
**Maintained By:** AI Assistant + User  
**For Support:** Check logs first, then troubleshooting section above
