# 🚀 CI/CD Pipeline Setup Guide - WMS Project

## Overview

Your project now has a **3-stage CI/CD pipeline**:

1. **Local** → Development branch (`develop`)
2. **Staging** → Testing branch (`staging`) → VPS at `staging.qgocargo.cloud`
3. **Production** → Main branch (`main`) → VPS at `qgocargo.cloud`

---

## 📋 Git Workflow

### Branch Strategy (Git Flow)

```
main (Production) ← Pull Requests from staging
    ↑
staging (Staging) ← Pull Requests from develop
    ↑
develop (Development) ← Feature branches
    ↑
feature/* (Local Development)
```

### Workflow Steps

#### 1. **Create Feature Branch** (Local Development)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

Make your changes and test locally.

#### 2. **Commit & Push**

```bash
git add .
git commit -m "feat: description of changes"
git push origin feature/your-feature-name
```

#### 3. **Create Pull Request to `staging`**

- Go to GitHub → Create PR from `feature/your-feature-name` → `develop`
- Add description of changes
- Request code review (if team members)
- Merge to `develop`

#### 4. **Staging Deployment (Automatic via CI/CD)**

- PR merged to `develop` → automatically pushed to `staging` branch
- GitHub Actions workflow runs:
  - ✅ Tests & Build
  - ✅ Docker Image Build
  - ✅ Deploy to Staging VPS
  - ✅ Run Migrations
  - ✅ Health Checks
- Access at: `https://staging.qgocargo.cloud`

#### 5. **Testing in Staging**

- Test features in staging environment
- If issues found: Fix and re-deploy to staging
- When ready: Create PR to `main`

#### 6. **Production Deployment (Manual Approval)**

```bash
# Create PR from staging → main
# Request approval
# Once approved, GitHub Actions will:
# - Run all tests
# - Create backup of production
# - Deploy to production
# - Run health checks
# - If health check fails: Automatic rollback
```

---

## 🔧 Manual Deployment (If GitHub Actions Not Available)

### Deploy to Staging

```bash
bash scripts/deploy.sh staging staging
```

### Deploy to Production

```bash
bash scripts/deploy.sh production main
```

---

## 🔙 Rollback (If Something Breaks)

### Automatic Rollback
- GitHub Actions automatically rolls back if health checks fail

### Manual Rollback

```bash
# List available backups
ls -lh ./backups/

# Rollback to specific backup
bash scripts/rollback.sh staging ./backups/backup_staging_20251030_120000.tar.gz
```

---

## 🔐 GitHub Secrets Setup

To use the CI/CD pipeline, you need to add these secrets to your GitHub repository:

### 1. Go to GitHub → Settings → Secrets and Variables → Actions

### Add These Secrets:

**For Staging Deployment:**
```
STAGING_VPS_HOST       → 148.230.107.155 (or your staging VPS IP)
STAGING_VPS_USER       → staging (SSH user)
STAGING_VPS_SSH_KEY    → Your private SSH key (cat ~/.ssh/id_rsa)
STAGING_VPS_PORT       → 22
```

**For Production Deployment:**
```
PROD_VPS_HOST          → 148.230.107.155 (or your production VPS IP)
PROD_VPS_USER          → root (or your SSH user)
PROD_VPS_SSH_KEY       → Your private SSH key
PROD_VPS_PORT          → 22
```

**Optional (For Slack Notifications):**
```
SLACK_WEBHOOK          → Your Slack webhook URL
```

---

## 📊 Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer's Local                         │
│  Create feature branch → Commit → Push to GitHub             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions - Stage 1: TEST & BUILD          │
│  • Install deps   • Lint code   • Run tests   • Build app    │
└──────────────────────┬──────────────────────────────────────┘
                       │ ✅ Pass
                       ↓
┌─────────────────────────────────────────────────────────────┐
│           GitHub Actions - Stage 2: BUILD IMAGES            │
│  • Build backend image   • Build frontend image             │
│  • Push to Docker registry                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ ✅ Success
                       ↓
┌─────────────────────────────────────────────────────────────┐
│    GitHub Actions - Stage 3: DEPLOY TO STAGING (Auto)       │
│  • SSH to staging VPS   • Pull latest code                  │
│  • Create backup        • Deploy containers                 │
│  • Run migrations       • Health checks                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ ✅ Health checks pass
                       ↓
              🎉 Available at staging.qgocargo.cloud
                       │
        ┌──────────────┴────────────────┐
        │ Test & Verify in Staging      │
        └──────────────┬────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│      PR to Main Branch (Ready for Production)                │
│  • Code review   • Approval required   • CI/CD triggers      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴────────────────┐
        │ Manual Approval Required      │
        │ (Security check)              │
        └──────────────┬────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│   GitHub Actions - Stage 4: DEPLOY TO PRODUCTION (Manual)   │
│  • Create FULL backup   • Deploy to prod VPS                │
│  • Run migrations       • Health checks                      │
│  • If fails → AUTO ROLLBACK to previous backup              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴────────────────┐
        │ 🎉 Live at qgocargo.cloud     │
        │ Slack notification sent       │
        └───────────────────────────────┘
```

---

## ⚙️ Configuration Files

### `.github/workflows/ci-cd-pipeline.yml`
- Main CI/CD workflow definition
- Defines all stages and jobs

### `scripts/deploy.sh`
- Deployment script with automatic backup/rollback
- Can be run manually if needed

### `scripts/rollback.sh`
- Emergency rollback script
- Restores from backup in case of issues

### `docker-compose.staging.yml`
- Staging-specific docker compose config
- Different ports, environment variables

### `docker-compose.yml`
- Production docker compose config

---

## 📱 Branch Protection Rules (Recommended)

### Set up in GitHub → Settings → Branches

1. **Main Branch (`main`)**
   - ✅ Require pull request reviews (1 approval)
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators in restrictions

2. **Staging Branch (`staging`)**
   - ✅ Require pull request reviews (at least 1)
   - ✅ Require status checks to pass
   - ✅ Include administrators in restrictions

3. **Develop Branch (`develop`)**
   - ✅ Require status checks to pass

---

## 🚨 Troubleshooting

### Issue: Deployment fails with "Permission denied"

**Solution:**
```bash
# Make scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/rollback.sh

git add scripts/
git commit -m "Make deployment scripts executable"
git push
```

### Issue: Health check fails after deployment

**Solution:** Check logs
```bash
# SSH to VPS
ssh root@148.230.107.155

# Check logs
cd /root/NEW\ START
docker compose logs -n 100 backend
docker compose logs -n 100 frontend
```

### Issue: Database migration fails

**Solution:**
```bash
# SSH to VPS and manually check
docker compose exec database mysql -u wms_user -pwmspassword123 warehouse_wms -e "SHOW TABLES;"

# If needed, rollback
bash scripts/rollback.sh production ./backups/backup_production_TIMESTAMP.tar.gz
```

### Issue: Can't SSH to VPS (GitHub Actions fails)

**Solution:** Verify SSH key
```bash
# On your local machine
# Generate SSH key if not exists
ssh-keygen -t rsa -b 4096 -f ~/.ssh/deploy_key

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/deploy_key.pub root@148.230.107.155

# Test connection
ssh -i ~/.ssh/deploy_key root@148.230.107.155

# Then add to GitHub secrets:
cat ~/.ssh/deploy_key | base64  # Copy output to STAGING_VPS_SSH_KEY
```

---

## 📝 Daily Workflow Example

### Day 1: Develop Feature

```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/new-dashboard

# Make changes
# Test locally with: docker compose up

git add .
git commit -m "feat: create new dashboard component"
git push origin feature/new-dashboard
```

### Day 1: Create PR to Staging

- Go to GitHub
- Create PR: `feature/new-dashboard` → `develop`
- Add description
- Wait for CI/CD to pass
- Merge to `develop`

### Day 2: Staging Auto-Deploys

- CI/CD automatically runs
- Deploys to `staging.qgocargo.cloud`
- Access and test

### Day 3: If Approved, Create PR to Production

- Create PR: `develop` → `main`
- Request approval
- Once approved, CI/CD deploys to production
- Slack notification sent

### If Emergency Rollback Needed

```bash
# SSH to VPS
ssh root@148.230.107.155

cd /root/NEW\ START

# Rollback to previous state
bash scripts/rollback.sh production ./backups/backup_production_20251029_150000.tar.gz
```

---

## ✅ Checklist Before Going Live

- [ ] All secrets added to GitHub
- [ ] SSH key configured for VPS access
- [ ] Branch protection rules enabled
- [ ] Staging environment tested thoroughly
- [ ] Database backups verified
- [ ] SSL certificates renewed (automatic via Certbot)
- [ ] Team trained on deployment process
- [ ] Rollback procedure documented
- [ ] Slack notifications configured
- [ ] Production database backed up

---

## 🎯 Best Practices

1. **Always test in staging first**
2. **Never force push to main/staging**
3. **Use descriptive commit messages**
4. **Keep feature branches small**
5. **Review code before merging**
6. **Monitor health checks after deployment**
7. **Keep backups for at least 2 weeks**
8. **Document any manual changes made to production**
9. **Test rollback procedure regularly**
10. **Have emergency contact list ready**

---

## 📞 Support & Help

If you need help:

1. Check GitHub Actions logs
2. Check VPS logs: `docker compose logs -n 100`
3. Check database: `docker compose exec database mysql -u wms_user -pwmspassword123`
4. Rollback if needed: `bash scripts/rollback.sh`
5. Contact team lead

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Prisma Migrations](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate)
- [SSH Key Setup](https://github.com/settings/keys)

---

**Created:** October 30, 2025  
**Version:** 1.0  
**Status:** Ready for use ✅
