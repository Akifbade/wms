# 🚀 Three-Stage Deployment Guide

## Overview
**Proper deployment workflow with manual control at each stage.**

```
[Local Dev] → [Test Locally] → [Deploy to Staging] → [Test Staging] → [Deploy to Production]
     ↓              ↓                    ↓                   ↓                    ↓
  Make changes  npm run dev      Manual trigger      Verify works        Manual approval
```

---

## Stage 1: Local Development & Testing

### 1. Make Changes
```powershell
# Edit files
code frontend/src/pages/Racks/Racks.tsx

# Run locally
cd frontend
npm run dev
```

### 2. Test Locally
- Open: http://localhost:5173
- Test all features thoroughly
- Check console for errors
- Verify UI looks good

### 3. Commit Changes
```powershell
git add frontend/src/pages/Racks/Racks.tsx
git commit -m "feat: Update Racks page UI"
git push origin stable/prisma-mysql-production
```

---

## Stage 2: Deploy to Staging VPS

### 1. Trigger Staging Deployment
1. Go to: https://github.com/Akifbade/wms/actions
2. Click: **"Three-Stage Deployment Pipeline"**
3. Click: **"Run workflow"** button
4. Select: **"staging"** from dropdown
5. Click: **"Run workflow"** (green button)

### 2. Monitor Deployment
- Watch the workflow progress
- Build takes ~1-2 minutes
- Deployment takes ~30 seconds

### 3. Test on Staging
- **Staging URL**: http://148.230.107.155:8080
- Test all functionality
- Verify UI changes
- Check API calls work
- Test on mobile view
- Clear cache: Ctrl + Shift + R

### 4. If Staging Has Issues
- Check logs in GitHub Actions
- SSH to server: `ssh root@148.230.107.155`
- View logs: `docker logs wms-staging-frontend`
- Fix issues and redeploy to staging

---

## Stage 3: Deploy to Production

### ⚠️ ONLY if Staging is Perfect!

### 1. Trigger Production Deployment
1. Go to: https://github.com/Akifbade/wms/actions
2. Click: **"Three-Stage Deployment Pipeline"**
3. Click: **"Run workflow"** button
4. Select: **"production"** from dropdown
5. Click: **"Run workflow"** (green button)

### 2. Manual Approval Required
- GitHub will pause and ask for approval
- Go to: https://github.com/Akifbade/wms/actions
- Click on the running workflow
- Click: **"Review deployments"** button
- Select: **"production"** checkbox
- Click: **"Approve and deploy"**

### 3. Monitor Production Deployment
- Workflow will copy from staging → production
- Creates automatic backup before deployment
- Restarts production container
- Runs health checks

### 4. Verify Production
- **Production URL**: http://qgocargo.cloud
- **Clear browser cache**: Ctrl + Shift + R (multiple times!)
- **Or use Incognito**: Ctrl + Shift + N
- Test all features
- Verify changes are live

---

## Quick Commands Reference

### Local Development
```powershell
# Start dev server
cd frontend
npm run dev

# Build for production
npm run build

# Check for errors
npm run lint
```

### Manual Staging Deployment (Backup Method)
```powershell
# Build locally
cd frontend
npm run build

# Deploy to staging
scp -r dist "root@148.230.107.155:/root/NEW START/frontend/staging-dist/"

# Update staging container
ssh root@148.230.107.155 "docker cp '/root/NEW START/frontend/staging-dist/.' wms-staging-frontend:/usr/share/nginx/html/ && docker exec wms-staging-frontend nginx -s reload"
```

### Manual Production Deployment (Emergency)
```powershell
# Copy from staging to production on server
ssh root@148.230.107.155 "cd '/root/NEW START' && docker cp wms-staging-frontend:/usr/share/nginx/html/. /tmp/staging-prod/ && docker cp /tmp/staging-prod/. wms-frontend:/usr/share/nginx/html/ && docker-compose restart frontend && rm -rf /tmp/staging-prod"
```

### Rollback Production
```powershell
# SSH to server
ssh root@148.230.107.155

# Find backups
ls -lht "/root/NEW START/backups/frontend/"

# Restore backup (replace YYYYMMDD-HHMMSS with actual backup)
docker cp "/root/NEW START/backups/frontend/backup-YYYYMMDD-HHMMSS/." wms-frontend:/usr/share/nginx/html/

# Restart
docker-compose restart frontend
```

---

## Troubleshooting

### Staging deployment failed
1. Check GitHub Actions logs
2. SSH to server: `ssh root@148.230.107.155`
3. Check container status: `docker ps`
4. View logs: `docker logs wms-staging-frontend`
5. Restart if needed: `docker-compose -f docker-compose.staging.yml restart`

### Production shows old version
1. **Clear browser cache aggressively**:
   - Press Ctrl + Shift + Delete
   - Select "All time"
   - Check "Cached images and files"
   - Clear data
2. **Hard refresh**: Ctrl + Shift + R (3-4 times)
3. **Try Incognito mode**: Ctrl + Shift + N
4. **Different browser**: Chrome, Edge, Firefox
5. **Mobile**: Clear app cache or reinstall

### Changes not visible after deployment
```powershell
# Verify files on server
ssh root@148.230.107.155 "docker exec wms-frontend ls -lh /usr/share/nginx/html/ | head -10"

# Check file modification date (should be recent)
ssh root@148.230.107.155 "docker exec wms-frontend stat /usr/share/nginx/html/index.html"

# Force reload nginx
ssh root@148.230.107.155 "docker exec wms-frontend nginx -s reload"
```

---

## Environment URLs

- 🖥️  **Local**: http://localhost:5173
- 🧪 **Staging**: http://148.230.107.155:8080
- 🌐 **Production**: http://qgocargo.cloud
- 🔧 **Portainer**: https://148.230.107.155:9443

---

## GitHub Secrets Required

Make sure these secrets are set at:
https://github.com/Akifbade/wms/settings/secrets/actions

- `PROD_VPS_HOST`: 148.230.107.155
- `PROD_VPS_USER`: root
- `PROD_VPS_SSH_KEY`: (SSH private key)

---

## Best Practices

1. ✅ **Always test locally first** before staging
2. ✅ **Always test staging thoroughly** before production
3. ✅ **Never skip staging** - it catches issues
4. ✅ **Clear browser cache** after every deployment
5. ✅ **Keep backups** - automatic before production deploy
6. ✅ **Check logs** if something goes wrong
7. ✅ **Communicate** with team before production deploy
8. ✅ **Deploy during low-traffic** hours if possible

---

**Last Updated**: October 30, 2025  
**Workflow Status**: ✅ Active  
**Production Branch**: `stable/prisma-mysql-production`
