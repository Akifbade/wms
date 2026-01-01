# GitHub Actions Deployment Guide

## 🚀 Automated Deployment to VPS

This project uses GitHub Actions to automatically build and deploy to the VPS when code is pushed.

---

## 📋 Prerequisites

### 1. GitHub Repository Setup
Your repository must be on GitHub with this code.

### 2. GitHub Secrets Configuration
Go to: **Repository → Settings → Secrets and variables → Actions**

Add the following secret:
- **Name**: `VPS_PASSWORD`
- **Value**: `Qgocargo@123`

---

## 🔧 How It Works

### Workflow File
Location: `.github/workflows/deploy-vps-optimized.yml`

### Trigger Events
Deployment runs automatically on:
- Push to `main` branch
- Push to `production` branch
- Manual trigger (workflow_dispatch)

### Deployment Process

#### Step 1: Build Backend (GitHub Actions)
```yaml
- Checkout code
- Build optimized Docker image (compiled TypeScript)
- Push to GitHub Container Registry (ghcr.io)
- Save image as tar.gz
- Upload to VPS at /tmp/
```

#### Step 2: Deploy to VPS (SSH)
```yaml
- Load Docker image from tar.gz
- Run vps-deploy-optimized.sh
- Start backend with:
  - Compiled JavaScript (not ts-node)
  - 30% CPU limit
  - IP-based database connection
  - Health checks enabled
- Restore upload files
- Restart frontend for DNS refresh
```

#### Step 3: Verify Deployment
```yaml
- Check container status
- Test backend health endpoint
- Verify compiled JS (not ts-node)
- Check memory usage
```

---

## 📦 What Gets Deployed

### Backend Container
- **Image**: `ghcr.io/[your-username]/qgo-wms/wms-backend:latest`
- **Command**: `node dist/index.js` (compiled JavaScript)
- **Memory**: ~125MB (optimized)
- **CPU Limit**: 30%
- **Environment**:
  - `NODE_ENV=production`
  - `DATABASE_URL=mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms`
  - `PORT=5000`

### Database Container
- Reuses existing MySQL container on VPS
- No rebuild required
- Volume persisted: `mysql_prod_data`

### Uploads
- Automatically restored from backup
- Source: `/root/NEW START/backend/uploads/` or latest backup

---

## 🖥️ Manual Deployment

If you need to deploy manually without GitHub Actions:

### Option 1: Run Deployment Script on VPS
```bash
ssh root@148.230.107.155

# Pull latest code (if repo exists on VPS)
cd /root/qgo-wms
git pull origin main

# Run deployment script
chmod +x vps-deploy-optimized.sh
./vps-deploy-optimized.sh
```

### Option 2: Build and Deploy Locally
```powershell
# On your local PC

# Build backend image
cd "C:\Users\USER\Music\QGO WMS\backend"
docker build -t wms-backend:compiled .

# Save image
docker save wms-backend:compiled | gzip > wms-backend.tar.gz

# Transfer to VPS
$env:Path += ";C:\Program Files\PuTTY"
pscp -pw Qgocargo@123 wms-backend.tar.gz root@148.230.107.155:/tmp/

# SSH to VPS and load image
plink -batch -pw Qgocargo@123 root@148.230.107.155

# On VPS:
gunzip -c /tmp/wms-backend.tar.gz | docker load
docker tag wms-backend:compiled ghcr.io/[your-username]/qgo-wms/wms-backend:latest

# Run deployment script
bash /root/vps-deploy-optimized.sh
```

---

## 🔍 Monitoring Deployment

### View GitHub Actions Logs
1. Go to repository on GitHub
2. Click **Actions** tab
3. Click on the latest workflow run
4. View detailed logs for each step

### Check VPS Status
```bash
ssh root@148.230.107.155

# Check containers
docker ps

# Check backend logs
docker logs wms-backend --tail 50 -f

# Check health
curl http://localhost:5000/health

# Verify compiled JS (not ts-node)
docker exec wms-backend ps aux | grep node
# Should show: node dist/index.js

# Check memory usage
docker stats --no-stream wms-backend
```

---

## 🐛 Troubleshooting

### Deployment Failed on GitHub Actions

**Check VPS_PASSWORD secret**:
- Settings → Secrets → Actions
- Ensure `VPS_PASSWORD` = `Qgocargo@123`

**Check VPS SSH access**:
```bash
ssh root@148.230.107.155
# Password: Qgocargo@123
```

**View workflow logs**:
- GitHub → Actions → Click failed run → View errors

### Backend Not Starting After Deployment

**Check container logs**:
```bash
docker logs wms-backend --tail 100
```

**Common issues**:
1. **Database not reachable**: Check DB_IP in deployment script
2. **Upload files missing**: Run restore command manually
3. **Old image cached**: Remove and reload image

**Rollback to backup**:
```bash
# Stop current container
docker stop wms-backend
docker rm wms-backend

# List backup images
docker images | grep backup

# Start from backup
docker run -d --name wms-backend \
  --network fleet-network \
  --cpus=0.3 \
  -p 5000:5000 \
  -e DATABASE_URL='mysql://wms_user:wmspassword123@172.20.0.5:3306/warehouse_wms' \
  -e NODE_ENV=production \
  wms-backend:backup-20260101_070000

# Restore uploads
docker cp /root/backups/deploy_20260101_070000/uploads/. wms-backend:/app/uploads/
```

---

## ✅ Post-Deployment Verification

After successful deployment, verify:

### 1. Container Running
```bash
docker ps | grep wms-backend
# Status should be "Up" and "healthy"
```

### 2. Health Check
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok"}
```

### 3. Compiled JS (Not ts-node)
```bash
docker exec wms-backend ps aux | grep node | grep -v grep
# Should show: node dist/index.js
# Should NOT show: ts-node or npx
```

### 4. Memory Usage
```bash
docker stats --no-stream wms-backend
# Should be around 125MB (not 194MB)
```

### 5. CPU Limit
```bash
docker inspect wms-backend --format '{{.HostConfig.NanoCpus}}'
# Should show: 300000000 (30%)
```

### 6. Upload Files
```bash
docker exec wms-backend find /app/uploads -type f | wc -l
# Should show: 294 (or current count)
```

### 7. Frontend Access
Visit: https://qgocargo.cloud
- Should load without errors
- Images should be visible
- Login should work (no 502 error)

---

## 📝 Deployment Checklist

Before deploying:
- [ ] Code changes tested locally
- [ ] Database migrations applied
- [ ] Environment variables updated
- [ ] VERSION.md updated
- [ ] Committed and pushed to main/production branch

After deployment:
- [ ] GitHub Actions workflow completed successfully
- [ ] Backend container running
- [ ] Health check passing
- [ ] Compiled JS verified (not ts-node)
- [ ] Memory usage ~125MB
- [ ] CPU limit 30%
- [ ] Upload files present
- [ ] Frontend accessible
- [ ] No errors in logs

---

## 🔐 Security Notes

1. **Never commit VPS password** to repository
2. **Use GitHub Secrets** for sensitive data
3. **Rotate passwords** periodically
4. **Monitor container logs** for suspicious activity
5. **Run weekly security check**: `bash /root/check`

---

## 📞 Support

If deployment fails:
1. Check GitHub Actions logs
2. SSH to VPS and check `docker logs wms-backend`
3. Review [INSTRUCTIONS.md](./INSTRUCTIONS.md) troubleshooting section
4. Check [OPTIMIZATION_LOG.md](./OPTIMIZATION_LOG.md) for known issues

---

**Last Updated**: January 1, 2026  
**Deployment Method**: GitHub Actions → VPS (Optimized)  
**Status**: ✅ Automated & Optimized
