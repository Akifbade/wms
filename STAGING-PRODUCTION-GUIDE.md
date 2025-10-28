# 🚀 STAGING → PRODUCTION DEPLOYMENT GUIDE

## Overview
```
LOCAL (Development)
      ↓ (Deploy)
STAGING (Test/Pre-Prod)
      ↓ (Verify & Approve)
PRODUCTION (LIVE System)
```

---

## 🏗️ Architecture

### Separate Environments
```
┌─────────────────────────────────────────────────────┐
│ STAGING (Testing/Pre-Production)                    │
│ ├─ Port 8080 (HTTP Frontend)                       │
│ ├─ Port 8443 (HTTPS Frontend)                      │
│ ├─ Port 5001 (Backend API)                         │
│ ├─ Port 3308 (MySQL Database)                      │
│ ├─ Database: warehouse_wms_staging                 │
│ └─ Network: staging-network                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PRODUCTION (LIVE System)                            │
│ ├─ Port 80/443 (HTTPS Frontend)                    │
│ ├─ Port 5000 (Backend API)                         │
│ ├─ Port 3307 (MySQL Database)                      │
│ ├─ Database: warehouse_wms                         │
│ └─ Network: production-network                     │
└─────────────────────────────────────────────────────┘
```

### Isolated Data & Services
- ✅ Separate MySQL databases (staging vs production)
- ✅ Separate Node.js backends (port 5001 vs 5000)
- ✅ Separate nginx frontends (port 8080 vs 80)
- ✅ Isolated Docker networks
- ✅ Independent volume management

---

## 📋 Pre-Deployment Setup

### Step 1: Copy Files to VPS
```bash
# Copy all deployment files
scp docker-compose-dual-env.yml root@148.230.107.155:/root/NEW\ START/
scp frontend/staging.nginx.conf root@148.230.107.155:/root/NEW\ START/frontend/
scp deploy.sh root@148.230.107.155:/root/NEW\ START/
```

### Step 2: Create .env File
```bash
# Create on VPS
ssh root@148.230.107.155 "cat > '/root/NEW START/.env.dual' << 'EOF'
# STAGING Environment
STAGING_DB_ROOT_PASSWORD=stagingroot
STAGING_DB_NAME=warehouse_wms_staging
STAGING_DB_USER=staging_user
STAGING_DB_PASSWORD=stagingpass123
STAGING_DB_PORT=3308
STAGING_BACKEND_PORT=5001
STAGING_FRONTEND_PORT_HTTP=8080
STAGING_FRONTEND_PORT_HTTPS=8443
STAGING_JWT_SECRET=staging-secret-key-12345

# PRODUCTION Environment
PROD_DB_ROOT_PASSWORD=prodroot
PROD_DB_NAME=warehouse_wms
PROD_DB_USER=wms_user
PROD_DB_PASSWORD=wmspassword123
PROD_DB_PORT=3307
PROD_BACKEND_PORT=5000
PROD_FRONTEND_PORT_HTTP=80
PROD_FRONTEND_PORT_HTTPS=443
PROD_JWT_SECRET=production-secret-key-12345
EOF"
```

---

## 🚀 Deployment Workflow

### Option 1: From Windows (Using PowerShell)

#### Deploy to Staging (Testing)
```powershell
# SSH into your VPS first, OR run locally
.\deploy.ps1 staging

# Wait 5-10 seconds for containers to start
# Then access: http://localhost:8080
```

**What happens:**
- ✅ Git commits all changes
- ✅ Builds staging frontend & backend
- ✅ Creates staging database (fresh)
- ✅ Starts all staging services
- ✅ Ready for testing!

#### Login to Staging
```
Email:    admin@demo.com
Password: demo123
```

#### Test Everything
- ✅ User login/logout
- ✅ CRUD operations
- ✅ File uploads
- ✅ API endpoints
- ✅ Database operations

#### Deploy to Production (LIVE)
```powershell
.\deploy.ps1 production

# Confirm by typing: CONFIRM
# This will:
#  1. Backup production database
#  2. Commit changes
#  3. Push to git
#  4. Stop old production services
#  5. Build new production images
#  6. Start production services
```

---

### Option 2: From Linux/Bash (On VPS)

#### Deploy to Staging
```bash
cd '/root/NEW START'
bash deploy.sh staging
```

#### Deploy to Production
```bash
bash deploy.sh production
# Type: CONFIRM
```

---

## 📊 Environment Comparison

| Feature | Staging | Production |
|---------|---------|-----------|
| Frontend Port | 8080 | 80/443 |
| Backend Port | 5001 | 5000 |
| Database | warehouse_wms_staging | warehouse_wms |
| DB Port | 3308 | 3307 |
| SSL/HTTPS | Optional (8443) | Yes (443) |
| Header | X-Environment: staging | X-Environment: production |
| Data Isolation | Yes | Yes |
| Backup | Manual | Auto-backup before deploy |

---

## 🔄 Complete Workflow Example

### Day 1: Initial Setup
```bash
# On VPS, run once:
docker-compose -f docker-compose-dual-env.yml up -d staging-database staging-backend staging-frontend
```

### Day 2: Make Changes & Test
```bash
# On local machine, make code changes
# Edit: frontend/, backend/, or prisma/

# Deploy to staging for testing
.\deploy.ps1 staging

# Test at: http://localhost:8080
# Login: admin@demo.com / demo123

# Test all features, make more changes if needed
```

### Day 3: Promote to Production
```bash
# When satisfied with staging tests
.\deploy.ps1 production

# Confirm: CONFIRM
# System is now LIVE!
```

---

## ⚠️ Safety Features

### 1. Automatic Backup Before Production Deploy
```bash
# File: backups/production-backup-20251028_091234.sql
# Created automatically before each production deployment
```

### 2. Production Confirmation
```
"WARNING: You are about to deploy to PRODUCTION"
"Type 'CONFIRM' to proceed"
```

### 3. Isolated Networks & Volumes
- Staging cannot access production data
- Production cannot access staging data
- Complete data separation

### 4. Rollback Capability
```bash
# If something goes wrong:
.\deploy.ps1 rollback

# Enter backup timestamp
# Database is restored instantly
```

---

## 📝 Advanced Commands

### Check Status of Both Environments
```bash
.\deploy.ps1 status

# Shows:
# STAGING: running/stopped services
# PRODUCTION: running/stopped services
```

### View Logs
```bash
# Staging backend logs
docker logs wms-staging-backend -f

# Production backend logs
docker logs wms-production-backend -f

# Staging database logs
docker logs wms-staging-db -f

# Production database logs
docker logs wms-production-db -f
```

### Access Databases

#### Staging
```bash
docker exec -it wms-staging-db mysql -u staging_user -pstagingpass123 warehouse_wms_staging
```

#### Production
```bash
docker exec -it wms-production-db mysql -u wms_user -pwmspassword123 warehouse_wms
```

### Manual Rollback
```bash
# List available backups
ls -lh backups/

# Restore from specific backup
.\deploy.ps1 rollback
# Enter: 20251028_091234 (the timestamp)
```

---

## 🐛 Troubleshooting

### Staging not accessible?
```bash
# Check if services are running
docker-compose -f docker-compose-dual-env.yml ps staging-*

# Check logs
docker logs wms-staging-backend
docker logs wms-staging-frontend

# Restart staging
docker-compose -f docker-compose-dual-env.yml restart staging-frontend
```

### Production having issues?
```bash
# Check services
docker-compose -f docker-compose-dual-env.yml ps production-*

# Rollback to previous backup
.\deploy.ps1 rollback

# Check production backend logs
docker logs wms-production-backend -f
```

### Port conflicts?
```bash
# Check what's using ports
netstat -tuln | grep -E '8080|5001|3308'  # Staging
netstat -tuln | grep -E '80|5000|3307'    # Production

# Change ports in .env file if needed
STAGING_FRONTEND_PORT_HTTP=9080  # Change from 8080
PROD_FRONTEND_PORT_HTTP=8000     # Change from 80
```

---

## 🎯 Best Practices

### ✅ Do:
- Test on staging first, always
- Keep backups organized
- Document changes before production
- Use git commits with clear messages
- Monitor logs after production deployment
- Have a rollback plan

### ❌ Don't:
- Deploy directly to production without staging test
- Skip the CONFIRM step
- Delete backup files immediately
- Make database schema changes without testing staging first
- Deploy during peak usage hours

---

## 📞 Quick Reference

| Action | Command |
|--------|---------|
| Deploy to staging | `.\deploy.ps1 staging` |
| Deploy to production | `.\deploy.ps1 production` |
| Check status | `.\deploy.ps1 status` |
| Rollback production | `.\deploy.ps1 rollback` |
| View backups | `ls backups/` |
| Stop staging | `docker-compose -f docker-compose-dual-env.yml stop staging-*` |
| Stop production | `docker-compose -f docker-compose-dual-env.yml stop production-*` |

---

## 🔐 Security Notes

- Staging has different credentials than production
- Each environment has isolated JWT secrets
- Database passwords separate for each environment
- Network isolation prevents cross-environment access
- Backups encrypted recommendation (add backup encryption)
- Change default passwords in production

---

Created: October 28, 2025
Version: 1.0
Status: PRODUCTION READY
