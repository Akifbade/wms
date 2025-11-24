# 🚀 CI/CD Pipeline Setup Guide

## Overview
Automated deployment pipeline for WMS system using GitHub Actions.

**Production Environment:**
- **OS**: Rocky Linux 9.x (RHEL-based, NOT Ubuntu)
- **Server IP**: 148.230.107.155
- **Domain**: qgocargo.cloud (HTTP only)
- **Path**: `/root/NEW START/` (note the space in directory name)
- **Container Engine**: Docker + Docker Compose
- **Web Server**: nginx:alpine

## Architecture
```
[Local Changes] → [Push to GitHub] → [GitHub Actions Runner (Ubuntu)] 
    ↓
[Build Frontend with Vite] → [Create Artifacts]
    ↓
[SSH/SCP to Rocky Linux Server] → [Copy dist/ files]
    ↓
[Docker Compose Restart] → [Health Checks] → [Live on qgocargo.cloud]
```

## Prerequisites

### 1. GitHub Repository Secrets
Navigate to: `Settings > Secrets and variables > Actions > New repository secret`

Add the following secrets:

#### Required Secrets:
```bash
PROD_VPS_HOST=148.230.107.155
PROD_VPS_USER=root
PROD_VPS_SSH_KEY=<your-private-ssh-key>
PROD_VPS_PORT=22
```

### 2. Generate SSH Key for GitHub Actions

On your local machine:
```powershell
# Generate new SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key

# View private key (add this to GitHub Secrets as PROD_VPS_SSH_KEY)
Get-Content ~/.ssh/github_actions_key

# View public key (add this to server)
Get-Content ~/.ssh/github_actions_key.pub
```

### 3. Add Public Key to Rocky Linux Server

Connect to server and add the public key:
```bash
ssh root@148.230.107.155

# Verify OS (should show Rocky Linux)
cat /etc/os-release

# Add public key to authorized_keys
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Test SSH key (from local machine)
ssh -i ~/.ssh/github_actions_key root@148.230.107.155 "echo 'SSH key working!'"
```

**Rocky Linux Specific Notes:**
- Uses `firewalld` for firewall (not `ufw` like Ubuntu)
- Package manager is `dnf` (not `apt`)
- SELinux may be enabled (check with `getenforce`)
- Docker commands are identical to Ubuntu

## Workflow Files

### 1. **production-deploy.yml** (New - Simplified)
- **Trigger**: Push to `stable/prisma-mysql-production` or manual trigger
- **Steps**:
  1. Build frontend (`npm run build`)
  2. Upload build artifacts
  3. Deploy to production server
  4. Restart containers
  5. Verify deployment

### 2. **ci-cd-pipeline.yml** (Existing - Full pipeline)
- **Trigger**: Push to `main`, `staging`, or `develop`
- **Features**: Full CI/CD with Docker builds, tests, staging deployment

## Deployment Process

### Automatic Deployment (Recommended)

1. **Make your changes locally**
   ```powershell
   # Edit files
   code frontend/src/pages/Racks/Racks.tsx
   
   # Test locally
   cd frontend
   npm run dev
   ```

2. **Commit and push to GitHub**
   ```powershell
   git add frontend/src/pages/Racks/Racks.tsx
   git commit -m "feat: Update Racks UI - fix icons and text sizes"
   git push origin stable/prisma-mysql-production
   ```

3. **GitHub Actions will automatically**:
   - ✅ Build frontend
   - ✅ Run tests
   - ✅ Deploy to server
   - ✅ Restart containers
   - ✅ Verify deployment

4. **Monitor deployment**:
   - Go to: `https://github.com/Akifbade/wms/actions`
   - Watch the workflow progress
   - Check logs if any issues

### Manual Deployment (Backup Method)

If CI/CD fails, you can still deploy manually:
```powershell
# Build locally
cd frontend
npm run build

# Deploy to server
scp -r dist/* root@148.230.107.155:"/root/NEW START/frontend/dist/"

# Restart container
ssh root@148.230.107.155 "docker restart wms-frontend"
```

## Directory Structure on Rocky Linux Server

```
/root/NEW START/                    # ⚠️ Note: Space in directory name!
├── frontend/
│   ├── dist/                       # Built frontend files (served by nginx)
│   │   ├── index.html              # Main HTML entry point
│   │   └── assets/                 # JS, CSS, images
│   ├── src/                        # Source code (React + TypeScript)
│   │   └── pages/Racks/Racks.tsx  # Example: Our recent changes
│   ├── nginx-http-only.conf        # nginx config (no SSL redirect)
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── src/                        # Node.js/Express source
│   ├── prisma/                     # Database schema & migrations
│   ├── uploads/                    # User uploaded files
│   │   └── company-logos/
│   ├── logs/                       # Application logs
│   └── package.json
├── docker-compose.yml              # Production compose file
├── docker-compose.staging.yml      # Staging environment
├── backups/                        # Automated database backups
│   └── pre-deploy-*.sql           # Pre-deployment backups
└── .github/
    └── workflows/
        └── production-deploy.yml   # This CI/CD pipeline
```

**Important Rocky Linux Paths:**
- Docker data: `/var/lib/docker/`
- Docker logs: `docker logs <container>`
- System logs: `journalctl -u docker`

## Container Management

### View Container Status
```bash
ssh root@148.230.107.155

# Show Rocky Linux version
cat /etc/os-release | grep PRETTY_NAME

# List all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check specific container
docker inspect wms-frontend --format='{{.State.Status}}'

# View resource usage
docker stats --no-stream
```

### Restart Containers (Rocky Linux)
```bash
# Navigate to project directory (⚠️ has space in name)
cd "/root/NEW START"

# Restart frontend only
docker restart wms-frontend

# Restart all containers
docker-compose restart

# Full rebuild (if needed - slow!)
docker-compose up -d --build frontend

# Restart Docker service (if containers stuck)
systemctl restart docker
```

### Rocky Linux Specific Commands
```bash
# Check firewall status
firewall-cmd --list-all

# Open port if needed
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload

# Check SELinux status (may affect file permissions)
getenforce

# Temporarily disable SELinux if causing issues
setenforce 0

# View system logs
journalctl -xe
```

### View Logs
```bash
# Frontend logs
docker logs wms-frontend -f

# Backend logs
docker logs wms-backend -f

# All logs
docker-compose logs -f
```

## Troubleshooting

### Issue: Deployment fails with "Permission denied"
**Solution**: Check SSH key is correctly added to secrets and server

### Issue: Build fails with "Module not found"
**Solution**: Run `npm ci` to clean install dependencies

### Issue: Container unhealthy after deployment
**Solution**: Check nginx config and restart container
```bash
ssh root@148.230.107.155
docker exec wms-frontend nginx -t
docker restart wms-frontend
```

### Issue: Changes not visible on production
**Solution**: Clear browser cache or hard refresh (Ctrl + Shift + R)

### Issue: Git conflicts
**Solution**: 
```powershell
git pull --rebase origin stable/prisma-mysql-production
git push origin stable/prisma-mysql-production
```

## Production URLs

- 🌐 **Main Site**: http://qgocargo.cloud
- 🌐 **Direct IP**: http://148.230.107.155
- 🔧 **Portainer**: https://148.230.107.155:9443 (user: akif)
- 📊 **API**: http://qgocargo.cloud/api

## Monitoring

### Health Checks
```bash
# Check if site is up
curl -I http://qgocargo.cloud

# Check container health
ssh root@148.230.107.155 "docker ps --filter 'name=wms-frontend'"

# Check nginx config
ssh root@148.230.107.155 "docker exec wms-frontend nginx -t"
```

### Database Backups
Automatic backups are created before each deployment in `/root/NEW START/backups/`

To restore a backup:
```bash
ssh root@148.230.107.155
cd "/root/NEW START"
docker exec -i wms-database mysql -u root -prootpassword warehouse_wms < backups/backup-file.sql
```

## Rollback Process

If deployment breaks production:

1. **Quick Rollback** (from server):
   ```bash
   ssh root@148.230.107.155
   cd "/root/NEW START"
   
   # Restore previous dist files
   cp -r frontend/dist.backup/* frontend/dist/
   docker restart wms-frontend
   ```

2. **Git Rollback**:
   ```powershell
   # Find previous working commit
   git log --oneline
   
   # Reset to that commit
   git reset --hard <commit-hash>
   git push -f origin stable/prisma-mysql-production
   ```

## Best Practices

1. ✅ **Always test locally first** (`npm run dev`)
2. ✅ **Use descriptive commit messages**
3. ✅ **Monitor GitHub Actions after pushing**
4. ✅ **Keep dependencies updated** (`npm update`)
5. ✅ **Clear browser cache after deployment**
6. ✅ **Check container health after changes**
7. ✅ **Keep backups before major changes**

## Quick Commands Reference

```powershell
# Local Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Check code quality

# Git Operations
git status           # Check changes
git add .            # Stage all changes
git commit -m "msg"  # Commit changes
git push            # Push to GitHub (triggers CI/CD)

# Server Management
ssh root@148.230.107.155                    # Connect to server
docker ps                                    # List containers
docker logs wms-frontend -f                  # View logs
docker restart wms-frontend                  # Restart container
cd "/root/NEW START" && docker-compose up -d # Restart all
```

## Testing the Pipeline

### First Time Setup
1. **Add GitHub Secrets** (if not already done)
   - Go to: https://github.com/Akifbade/wms/settings/secrets/actions
   - Add: `PROD_VPS_SSH_KEY`, `PROD_VPS_HOST`, `PROD_VPS_USER`

2. **Test with small change**
   ```powershell
   # Make a small visible change
   code frontend/src/pages/Racks/Racks.tsx
   
   # Commit and push
   git add frontend/src/pages/Racks/Racks.tsx
   git commit -m "test: CI/CD pipeline test"
   git push origin stable/prisma-mysql-production
   ```

3. **Monitor deployment**
   - Go to: https://github.com/Akifbade/wms/actions
   - Click on latest workflow run
   - Watch each step complete
   - Check for any errors in logs

4. **Verify on production**
   - Wait 2-3 minutes after pipeline completes
   - Visit: http://qgocargo.cloud
   - Clear cache: Ctrl + Shift + R
   - Verify your changes are visible

### Manual Trigger (For Testing)
```bash
# Trigger pipeline manually without code changes
# Go to: https://github.com/Akifbade/wms/actions/workflows/production-deploy.yml
# Click "Run workflow" button
```

## Troubleshooting Rocky Linux Issues

### Issue: SELinux blocking file access
```bash
ssh root@148.230.107.155
# Check SELinux status
getenforce

# If "Enforcing", temporarily disable
setenforce 0

# Or set proper contexts
chcon -R -t container_file_t "/root/NEW START/frontend/dist"
```

### Issue: Firewall blocking connections
```bash
# Check if port 80 is open
firewall-cmd --list-ports

# Open port 80 (HTTP)
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```

### Issue: Docker service not starting
```bash
# Check Docker status
systemctl status docker

# Restart Docker
systemctl restart docker

# Enable auto-start
systemctl enable docker
```

### Issue: Path with space causing issues
```bash
# Always quote paths in Rocky Linux
cd "/root/NEW START"        # ✅ Correct
cd /root/NEW START          # ❌ Wrong - will fail

# In scripts, use quotes
scp file.txt root@server:"/root/NEW START/"  # ✅ Correct
```

## Next Steps

1. ✅ Setup GitHub Secrets (PROD_VPS_SSH_KEY, etc.)
2. ✅ Test deployment with small change
3. ✅ Monitor GitHub Actions workflow at github.com/Akifbade/wms/actions
4. ✅ Verify production site works at http://qgocargo.cloud
5. ✅ Setup SSL certificates (optional - for HTTPS with Let's Encrypt)
6. ✅ Configure SELinux properly for production security
7. ✅ Setup automated backups with retention policy

---

**Last Updated**: October 30, 2025  
**Pipeline Status**: ✅ Ready to Deploy  
**Production OS**: Rocky Linux 9.x (RHEL-based)  
**Production Branch**: `stable/prisma-mysql-production`  
**Server IP**: 148.230.107.155  
**Domain**: qgocargo.cloud
