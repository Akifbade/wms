# 🚀 CI/CD Quick Reference Card

## 🔄 Git Workflow Commands

### Create & Work on Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
# ... make changes ...
git add .
git commit -m "feat: description"
git push origin feature/my-feature
```

### After Testing - Merge to Staging

```bash
# Create PR on GitHub: feature/my-feature → develop
# Get approval & merge

# This auto-triggers deployment to staging
# Check at: staging.qgocargo.cloud
```

### Ready for Production - Merge to Main

```bash
# Create PR on GitHub: develop → main
# Request approval
# Once approved, auto-deploys to production
# Check at: qgocargo.cloud
```

---

## 📊 Pipeline Stages

| Stage | Trigger | What Happens | Time |
|-------|---------|--------------|------|
| **Test & Build** | Any push/PR | Tests, linting, build | 5-10 min |
| **Build Images** | After tests pass | Docker images created | 5 min |
| **Deploy Staging** | Merge to `develop` | Auto deploys to staging | 3-5 min |
| **Deploy Prod** | Merge to `main` | Needs approval, then deploys | 3-5 min |

---

## 🚨 Emergency Procedures

### If Staging Breaks

```bash
# SSH to staging VPS
ssh staging@148.230.107.155

cd /root/NEW\ START

# Automatic rollback (restart last working version)
bash scripts/rollback.sh staging ./backups/backup_staging_LATEST.tar.gz
```

### If Production Breaks

```bash
# SSH to production VPS
ssh root@148.230.107.155

cd /root/NEW\ START

# CRITICAL: Immediate rollback
bash scripts/rollback.sh production ./backups/backup_production_LATEST.tar.gz

# Notify team on Slack/email
```

---

## 🔍 Check Deployment Status

### On GitHub

1. Go to your repo
2. Click "Actions" tab
3. See all running/completed workflows
4. Click on a workflow to see detailed logs

### On VPS (Staging)

```bash
ssh staging@148.230.107.155
cd /root/NEW\ START
docker compose logs -n 50 backend
docker compose logs -n 50 frontend
curl http://localhost:8080  # Health check
```

### On VPS (Production)

```bash
ssh root@148.230.107.155
cd /root/NEW\ START
docker compose logs -n 50 backend
docker compose logs -n 50 frontend
curl http://localhost:80  # Health check
```

---

## 📋 Before Deployment Checklist

- [ ] All tests pass in CI/CD
- [ ] Code reviewed by team member
- [ ] Database migrations tested
- [ ] Backup created automatically
- [ ] No uncommitted changes
- [ ] Branch is up to date with main/develop

---

## 🔑 GitHub Secrets Required

**Add in:** Settings → Secrets and Variables → Actions

```
STAGING_VPS_HOST          = your-staging-ip
STAGING_VPS_USER          = staging-user
STAGING_VPS_SSH_KEY       = your-ssh-private-key
STAGING_VPS_PORT          = 22

PROD_VPS_HOST             = your-production-ip
PROD_VPS_USER             = root
PROD_VPS_SSH_KEY          = your-ssh-private-key
PROD_VPS_PORT             = 22

SLACK_WEBHOOK             = (optional)
```

---

## 💾 Backup Management

### View Backups

```bash
ls -lh ./backups/
```

### Backup Storage Location

```
./backups/backup_staging_20251030_120000.tar.gz
./backups/backup_production_20251030_130000.tar.gz
```

### What's Backed Up

- ✅ Database (SQL dump)
- ✅ Docker configuration
- ✅ Uploaded files
- ✅ Application logs

### Backup Retention

- Automatic: Keep last 5 backups
- Manual: Kept indefinitely

---

## 🎯 Daily Scenarios

### Scenario 1: Deploy New Feature to Staging

```
1. Create feature branch
2. Make changes
3. Push to GitHub
4. Create PR → develop
5. Wait for CI/CD ✅
6. Merge to develop
7. Auto-deploys to staging
8. Test at staging.qgocargo.cloud
```

### Scenario 2: Deploy to Production

```
1. Feature tested in staging ✅
2. Create PR → main
3. Request approval
4. Approved ✅
5. Merge to main
6. GitHub Actions auto-deploys
7. Creates backup first
8. Deploys to production
9. Health checks ✅
10. Live at qgocargo.cloud
```

### Scenario 3: Emergency Rollback

```
1. Problem detected in production 🚨
2. SSH to VPS
3. Run: bash scripts/rollback.sh production [backup-file]
4. Confirm rollback
5. Previous version restored in 2-3 mins
6. Check: curl http://localhost
7. Notify team
```

---

## 🔐 Branch Protection Rules

### Protected Branches

| Branch | Rule |
|--------|------|
| `main` | Require 1 approval + tests pass + up-to-date |
| `staging` | Require tests pass |
| `develop` | Require tests pass |

---

## 📱 Notifications

### Slack Alerts (When Configured)

- ✅ Deployment started
- ✅ Tests passed/failed
- ✅ Deployment succeeded
- ✅ Deployment failed
- ✅ Rollback triggered

---

## ⚡ Manual Commands (If Needed)

### Manual Deploy to Staging

```bash
bash scripts/deploy.sh staging staging
```

### Manual Deploy to Production

```bash
bash scripts/deploy.sh production main
```

### Manual Rollback

```bash
bash scripts/rollback.sh staging ./backups/backup_staging_TIMESTAMP.tar.gz
```

### Check Backend Health

```bash
docker compose exec backend curl http://localhost:5000
```

### Check Database

```bash
docker compose exec database mysql -u wms_user -pwmspassword123 warehouse_wms -e "SELECT * FROM users LIMIT 1;"
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Health check fails | Check logs: `docker compose logs backend` |
| SSH denied | Verify SSH key in GitHub secrets |
| Database migration fails | Check Prisma schema vs DB: `DESCRIBE users;` |
| Deployment hangs | Kill process: `Ctrl+C`, check GitHub Actions |
| Can't access staging URL | Check DNS/VPS firewall |
| Backup not found | Check: `ls ./backups/` |

---

## 📞 Important Contacts

- **DevOps Lead:** [Name]
- **Database Admin:** [Name]
- **QA Team:** [Email]
- **Emergency:** [Contact]

---

## 📚 Learn More

- Full guide: `CI-CD-SETUP-GUIDE.md`
- Branch protection: GitHub → Settings → Branches
- Secrets setup: GitHub → Settings → Secrets
- Actions logs: GitHub → Actions tab

---

**Last Updated:** October 30, 2025  
**Status:** ✅ Ready to Use
