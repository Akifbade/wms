# 🤖 GitHub Copilot Instructions (AUTO-READ)

> ⚠️ **THIS FILE IS AUTOMATICALLY READ BY GITHUB COPILOT IN EVERY SESSION**

---

## 🚨🚨🚨 CRITICAL DEPLOYMENT RULE 🚨🚨🚨

### ❌ FORBIDDEN ACTIONS (NEVER DO THESE):
```
❌ plink -pw ... root@148.230.107.155 "any deploy command"
❌ pscp ... root@148.230.107.155:/path
❌ docker build on VPS
❌ docker cp to VPS containers
❌ ANY direct deployment to VPS
Use if user allow you to do or he ask you yo do via plink or putty on vps
```

### ✅ CORRECT DEPLOYMENT FLOW (ALWAYS DO THIS):
```powershell
# Step 1: Build locally
cd frontend
npm run build

# Step 2: Commit to Git
git add -A
git commit --no-verify -m "your message"

# Step 3: Push (GitHub Actions deploys automatically)
git push origin stable/prisma-mysql-production

# DONE! GitHub Actions handles VPS deployment
```

### 📍 VPS ACCESS ONLY FOR:
- Checking logs: `plink ... "docker logs wms-backend --tail 50"`
- Database queries: `plink ... "docker exec wms-database mysql ..."`
- Debugging container issues

---

## 📋 Project Quick Reference

| Property | Value |
|----------|-------|
| **Branch** | `stable/prisma-mysql-production` |
| **VPS IP** | `148.230.107.155` |
| **Domain** | `qgocargo.cloud` |
| **Frontend** | React + Vite + Tailwind |
| **Backend** | Node.js + Express + Prisma |
| **Database** | MySQL 8.0 |

---

## 🐳 Docker Containers

| Container | Port | Purpose |
|-----------|------|---------|
| `wms-frontend` | 80, 443 | Nginx + React |
| `wms-backend` | 5000 | Node.js API |
| `wms-database` | 3306 | MySQL |

---

## 📁 Key Directories

```
frontend/src/pages/     → React pages
frontend/src/components/ → React components
backend/src/routes/     → API routes
backend/prisma/         → Database schema
.github/workflows/      → CI/CD pipelines
```

---

## 🔧 Common Commands

### Build Frontend
```powershell
cd frontend
npm run build
```

### Deploy (Git Flow)
```powershell
git add -A
git commit --no-verify -m "v2.x.x: Description"
git push origin stable/prisma-mysql-production
```

### Check VPS (Emergency Only)
```powershell
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker ps"
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker logs wms-backend --tail 50"
```

---

## ⚠️ VPS Access (EMERGENCY ONLY)

Only use VPS direct access for:
- Checking logs
- Database queries
- Debugging issues

```powershell
# VPS SSH via plink
plink -batch -pw Qgocargo@123 root@148.230.107.155 "command"

# Database query
plink -batch -pw Qgocargo@123 root@148.230.107.155 "docker exec wms-database mysql -u wms_user -pwmspassword123 warehouse_wms -e 'YOUR_QUERY'"
```

---

## 📖 For Full Context

Read `.vscode/AI-PROJECT-CONTEXT.md` for complete project documentation.
