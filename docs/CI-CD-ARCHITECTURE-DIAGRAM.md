# 🎯 CI/CD Pipeline - Visual Architecture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DEVELOPER'S MACHINE                                 │
│                         (Your Local Computer)                                    │
│                                                                                  │
│  feature/my-feature ──[git push]──> GitHub Repository                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ↓
                           [GitHub Webhook Triggered]
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         GITHUB ACTIONS RUNNERS                                   │
│                      (Automated Cloud VMs)                                       │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │ JOB 1: TEST & BUILD (Ubuntu Latest)                                   │    │
│  │ ├─ Setup Node.js 18                                                   │    │
│  │ ├─ npm install (backend + frontend)                                   │    │
│  │ ├─ Start MySQL service                                                │    │
│  │ ├─ Prisma migrations                                                  │    │
│  │ ├─ npm lint                                                           │    │
│  │ ├─ npm test                                                           │    │
│  │ └─ npm build                                                          │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
│           │ ✅ Pass                                    │ ❌ Fail                │
│           ↓                                           ↓                        │
│  ┌─────────────────────────┐                  ❌ Notify Developer             │
│  │ JOB 2: BUILD IMAGES     │                  (Email/Slack)                   │
│  │ ├─ Backend Docker image │                  (Stop Pipeline)                 │
│  │ ├─ Frontend Docker      │                                                  │
│  │ └─ Push to registry     │                                                  │
│  └────────────────────────────────────────────────────────────────────────┘    │
│           │ ✅ Push OK                                                         │
│           ↓                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │ JOB 3: DEPLOY STAGING (If merge to develop)                        │       │
│  │ ├─ SSH to staging VPS (148.230.107.155:22)                         │       │
│  │ ├─ Create backup (database + files)                                │       │
│  │ ├─ git pull origin staging                                         │       │
│  │ ├─ docker compose pull                                             │       │
│  │ ├─ docker compose up -d                                            │       │
│  │ ├─ npx prisma migrate deploy                                       │       │
│  │ └─ curl health check                                               │       │
│  └────────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                          ✅ deploy-staging job complete
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STAGING VPS                                              │
│                    (staging.qgocargo.cloud)                                      │
│                                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐         │
│  │  Backend        │    │  Frontend        │    │  Database        │         │
│  │  Port: 5001     │    │  Port: 8080      │    │  Port: 3306      │         │
│  │  Docker         │    │  Docker (Nginx)  │    │  Docker (MySQL)  │         │
│  │  Container      │    │  Container       │    │  Container       │         │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘         │
│                                                                                  │
│  Backups: /root/NEW\ START/backups/                                            │
│  - database dumps                                                               │
│  - docker config                                                                │
│  - Keep last 5                                                                  │
│                                                                                  │
│  Accessible at: https://staging.qgocargo.cloud:8080                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                         🧪 TEAM TESTS & VERIFIES
                                      │
                          [Once Approved for Production]
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS (Production Deploy)                           │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │ JOB 4: MANUAL APPROVAL REQUIRED                                    │       │
│  │ (Team lead must approve in GitHub UI)                              │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│           │ 👤 Approved                       │ ❌ Rejected                    │
│           ↓                                   ↓                               │
│  ┌──────────────────────────────┐   Stop here (No deployment)               │
│  │ JOB 5: DEPLOY PRODUCTION    │                                            │
│  │ ├─ SSH to prod VPS          │                                            │
│  │ ├─ Create FULL backup       │   ← Critical for rollback                 │
│  │ ├─ git pull origin main     │                                            │
│  │ ├─ docker compose pull      │                                            │
│  │ ├─ docker compose up -d     │                                            │
│  │ ├─ Prisma migrations        │                                            │
│  │ └─ Health checks            │                                            │
│  └──────────────────────────────┘                                            │
│           │                                │                                │
│      ✅ Passed             ❌ Failed (health check)                         │
│           │                                │                                │
│           ↓                                ↓                               │
│    ✅ PRODUCTION LIVE     🔙 AUTO-ROLLBACK                                │
│    qgocargo.cloud         (Restore backup)                                │
│                           (Notify team)                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION VPS                                            │
│                     (qgocargo.cloud)                                            │
│                                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐         │
│  │  Backend        │    │  Frontend        │    │  Database        │         │
│  │  Port: 5000     │    │  Port: 80/443    │    │  Port: 3306      │         │
│  │  Docker         │    │  Docker (Nginx)  │    │  Docker (MySQL)  │         │
│  │  Container      │    │  with SSL        │    │  Container       │         │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘         │
│                                                                                  │
│  Backups: /root/NEW\ START/backups/                                            │
│  - Full database dumps                                                          │
│  - docker config                                                                │
│  - Keep last 5                                                                  │
│                                                                                  │
│  SSL: Let's Encrypt (Certbot)                                                  │
│  Accessible at: https://qgocargo.cloud                                         │
│                 https://www.qgocargo.cloud                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Flow Example

### Timeline: Deploying New Feature

```
10:00 AM - Developer starts work
├─ git checkout -b feature/dashboard
├─ Make changes
└─ Test locally: docker compose up

10:45 AM - Ready to push
├─ git add .
├─ git commit -m "feat: create dashboard"
├─ git push origin feature/dashboard
└─ Create PR on GitHub

10:47 AM - GitHub Actions starts
├─ CI/CD Job 1: Test & Build starts
│  └─ Takes ~10 minutes
├─ CI/CD Job 2: Build Docker Images (in parallel)
│  └─ Takes ~5 minutes
└─ Both complete in ~15 minutes total

11:02 AM - All checks pass ✅
├─ Merge button available
├─ Click "Merge Pull Request"
└─ PR merged to develop

11:03 AM - Auto-deploy to Staging
├─ GitHub Actions Job 3 starts automatically
├─ SSH to staging VPS
├─ Creates backup (1 min)
├─ Deploys containers (2 min)
├─ Runs migrations (1 min)
└─ Completed in ~5 minutes

11:08 AM - Available in Staging ✅
├─ Team tests at staging.qgocargo.cloud:8080
├─ Verifies feature works
└─ Approves for production

11:25 AM - Create PR to Main
├─ Create new PR: develop → main
├─ Wait for CI/CD to pass (~15 min)
├─ All tests pass ✅
└─ Ready for production approval

11:40 AM - Request Approval
├─ Assign to: Team Lead / DevOps
├─ Add comment: "Ready for production"
└─ Wait for approval...

12:00 PM - Team Lead Reviews & Approves
├─ Reviews changes: ✅ Looks good
├─ Approves deployment in GitHub UI
└─ Auto-deployment to production starts

12:02 PM - Production Deployment
├─ Create full backup (2 min) ← Critical!
├─ Deploy to production VPS (2 min)
├─ Run migrations (1 min)
├─ Health checks (1 min)
└─ All pass ✅

12:06 PM - 🎉 LIVE IN PRODUCTION
├─ Available at qgocargo.cloud
├─ Slack notification sent
└─ Feature is now live for customers!

---

TOTAL TIME: ~2 hours (with testing)
ACTUAL DEPLOYMENT TIME: ~10 minutes
HUMAN TIME REQUIRED: ~5 minutes (create PR, wait for approval)
```

---

## 📊 Data Flow During Deployment

```
Source Code → GitHub → GitHub Actions → VPS
    ↓           ↓            ↓           ↓
  .ts/.jsx   Webhooks   Test + Build   SSH Deploy
   files      trigger    Docker Build   Container
                          Images        Start
                            │
                            ↓
                    Container Registry
                    (ghcr.io)
                            │
                            ↓
                    Pull & Run on VPS
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────┐
│  Developer's Local Machine          │
│  (Create & Test Feature)            │
└─────────────────┬───────────────────┘
                  │
                  ↓ (git push)
         ╔════════════════╗
         ║  GitHub Repo   ║
         ╚════════╤═══════╝
                  │
                  ↓ (Webhook → Actions)
         ╔════════════════════╗
         ║  GitHub Actions    ║
         ║  - Verify tests    ║
         ║  - Check linting   ║
         ║  - Build images    ║
         ╚════════╤═══════════╝
                  │
                  ↓ (SSH Key - Secret)
         ╔════════════════════╗
         ║  Staging VPS       ║
         ║  - Private network │
         ║  - Backup before   ║
         ║  - Health checks   ║
         ╚════════╤═══════════╝
                  │
      [Team tests & approves]
                  │
                  ↓ (Manual approval required)
         ╔════════════════════╗
         ║  Production VPS    ║
         ║  - Full backup     ║
         ║  - Deploy          ║
         ║  - Health checks   ║
         ║  - Auto-rollback   ║
         ╚════════════════════╝
```

---

## 💾 Backup Strategy

```
Every deployment creates backups:

/backups/
├── backup_staging_20251030_100000.tar.gz
│   ├── db_backup_20251030_100000.sql    (MySQL dump)
│   ├── docker_config_20251030_100000.yml
│   ├── backend/uploads/                  (User files)
│   └── backend/logs/                     (App logs)
│
├── backup_staging_20251030_110000.tar.gz  (5 hours later)
├── backup_staging_20251030_120000.tar.gz  (5 hours later)
├── backup_production_20251030_100000.tar.gz
└── ...

Retention: Last 5 per environment
Auto-cleanup: Older backups deleted automatically
Manual restore: bash scripts/rollback.sh env backup_file
```

---

## 🎯 Key Takeaways

| Component | Purpose | Safety |
|-----------|---------|--------|
| **Tests** | Catch bugs early | ✅ Required to proceed |
| **Docker Images** | Consistent deployment | ✅ Built only once |
| **Staging Deploy** | Test before production | ✅ Automatic |
| **Manual Approval** | Human review before prod | ✅ Prevents mistakes |
| **Backups** | Restore on failure | ✅ Automatic rollback |
| **Health Checks** | Verify deployment worked | ✅ Required to finish |
| **Slack Alerts** | Team notification | ✅ Optional |

---

**This architecture ensures safe, automated, and traceable deployments!** 🚀
