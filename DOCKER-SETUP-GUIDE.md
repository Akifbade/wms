# 🐳 Docker Setup & Deployment Guide

Complete guide for running your WMS application in Docker with auto-commit functionality and easy VPS deployment.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start (Development)](#quick-start-development)
- [Production Setup](#production-setup)
- [Auto Git Commits](#auto-git-commits)
- [VPS Deployment](#vps-deployment)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Windows (Your Local Machine)
- ✅ Docker Desktop installed and running
- ✅ Git installed
- ✅ PowerShell 5.1+

### VPS Server (For Deployment)
- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum (4GB recommended)
- 20GB disk space minimum
- Root or sudo access

---

## 🚀 Quick Start (Development)

### 1. One-Command Startup

```powershell
# Start development environment
.\scripts\docker-start.ps1 -Dev

# Or with fresh build
.\scripts\docker-start.ps1 -Dev -Build
```

### 2. What Happens?
- ✅ MySQL database starts on port 3306
- ✅ Backend API starts on port 5000
- ✅ Frontend dev server starts on port 3000
- ✅ Auto Git commit watcher starts (commits every 5 minutes)

### 3. Access Your Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:3306

### 4. Stop Containers

```powershell
.\scripts\docker-stop.ps1 -Dev
```

---

## 🏭 Production Setup

### 1. Configure Environment

```powershell
# Copy environment template
Copy-Item .env.docker .env

# Edit with your production values
notepad .env
```

**Important variables to change:**
```env
DB_ROOT_PASSWORD=your-secure-password
DB_PASSWORD=your-secure-db-password
JWT_SECRET=your-long-random-secret-key
FRONTEND_PORT=80
```

### 2. Build Production Images

```powershell
.\scripts\docker-start.ps1 -Prod -Build
```

### 3. Start Production

```powershell
.\scripts\docker-start.ps1 -Prod
```

### 4. Access
- **Application**: http://localhost
- **Backend API**: http://localhost:5000

---

## 🔄 Auto Git Commits

### How It Works
A Docker container watches your files and automatically commits changes every 5 minutes (configurable).

### Configuration

Edit `.env` file:
```env
GIT_AUTO_COMMIT=true
GIT_COMMIT_INTERVAL=300  # seconds (5 minutes)
GIT_USER_NAME="WMS Auto Commit"
GIT_USER_EMAIL="auto-commit@wms.local"
```

### Enable Auto-Push to GitHub

1. **Setup Git Remote:**
```powershell
git remote add origin https://github.com/yourusername/warehouse-wms.git
```

2. **Enable Auto-Push:**
Edit `.env`:
```env
GIT_AUTO_PUSH=true
```

3. **Configure GitHub Token:**
```powershell
# Store credentials (one-time)
git config credential.helper store
git push origin main  # Enter your GitHub token when prompted
```

### View Commit Logs

```powershell
# View auto-commit container logs
docker logs -f wms-git-watcher-dev

# View Git commit history
git log --oneline -10
```

### Manual Commit Trigger

```powershell
# Execute immediate commit
docker exec wms-git-watcher-dev sh -c "cd /workspace && git add -A && git commit -m 'Manual checkpoint'"
```

---

## 🌐 VPS Deployment

### Method 1: Automated Script (Recommended)

1. **Upload deployment script to VPS:**
```bash
scp scripts/vps-deploy.sh user@your-vps-ip:/tmp/
```

2. **SSH into VPS:**
```bash
ssh user@your-vps-ip
```

3. **Run deployment:**
```bash
sudo chmod +x /tmp/vps-deploy.sh
sudo /tmp/vps-deploy.sh
```

4. **Configure your domain and environment:**
```bash
cd /opt/warehouse-wms
sudo nano .env
```

5. **Restart:**
```bash
sudo systemctl restart warehouse-wms
```

### Method 2: Manual Deployment

#### Step 1: Install Docker on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Enable Docker
sudo systemctl enable docker
sudo systemctl start docker
```

#### Step 2: Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/warehouse-wms
cd /opt/warehouse-wms

# Clone your repository
sudo git clone https://github.com/yourusername/warehouse-wms.git .
```

#### Step 3: Configure Environment

```bash
# Copy environment template
sudo cp .env.docker .env

# Edit with production values
sudo nano .env
```

**Critical production settings:**
```env
DB_ROOT_PASSWORD=super-secure-random-password
DB_PASSWORD=another-secure-password
JWT_SECRET=very-long-random-secret-key-here
FRONTEND_PORT=80
BACKEND_PORT=5000
```

#### Step 4: Deploy

```bash
# Build and start
sudo docker-compose -f docker-compose.yml build
sudo docker-compose -f docker-compose.yml up -d

# Check status
sudo docker-compose ps
```

#### Step 5: Setup Nginx (Optional - for domain)

```bash
# Install Nginx
sudo apt install nginx -y

# Create config
sudo nano /etc/nginx/sites-available/wms
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 100M;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: Setup SSL (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🛠️ Common Commands

### Development

```powershell
# Start all services
.\scripts\docker-start.ps1 -Dev

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker logs -f wms-backend-dev
docker logs -f wms-frontend-dev
docker logs -f wms-database-dev

# Restart a service
docker-compose -f docker-compose.dev.yml restart backend

# Execute command in container
docker exec -it wms-backend-dev sh
docker exec -it wms-database-dev mysql -u root -p

# Run Prisma migrations
docker exec wms-backend-dev npx prisma migrate dev

# Stop all
.\scripts\docker-stop.ps1 -Dev

# Clean everything (removes volumes)
.\scripts\docker-stop.ps1 -Dev -Clean
```

### Production

```powershell
# Start
.\scripts\docker-start.ps1 -Prod

# Update application
git pull
docker-compose -f docker-compose.yml up -d --build

# View logs
docker-compose -f docker-compose.yml logs -f

# Database backup
docker exec wms-database mysqldump -u root -p warehouse_wms > backup.sql

# Restore database
docker exec -i wms-database mysql -u root -p warehouse_wms < backup.sql

# Stop
.\scripts\docker-stop.ps1 -Prod
```

---

## 🔍 Troubleshooting

### Issue: "Docker is not running"
**Solution:**
```powershell
# Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait for Docker to start, then retry
```

### Issue: Port already in use
**Solution:**
```powershell
# Find process using port
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Or change port in .env
FRONTEND_PORT=3001
```

### Issue: Database connection failed
**Solution:**
```powershell
# Check database is running
docker ps | findstr database

# Check database logs
docker logs wms-database-dev

# Reset database
docker-compose down -v
docker-compose up -d
```

### Issue: Auto-commit not working
**Solution:**
```bash
# Check git-watcher logs
docker logs wms-git-watcher-dev

# Verify Git config
docker exec wms-git-watcher-dev git config --list

# Restart watcher
docker restart wms-git-watcher-dev
```

### Issue: Frontend can't connect to backend
**Solution:**
1. Check both containers are running:
```powershell
docker ps
```

2. Check network connectivity:
```powershell
docker exec wms-frontend-dev ping backend
```

3. Verify backend is responding:
```powershell
curl http://localhost:5000/api/health
```

---

## 📊 Monitoring

### View Resource Usage

```powershell
# All containers
docker stats

# Specific container
docker stats wms-backend-dev
```

### Health Checks

```powershell
# Check container health
docker ps --filter "health=healthy"

# Backend health endpoint
curl http://localhost:5000/api/health

# Database health
docker exec wms-database mysqladmin ping -h localhost -u root -p
```

---

## 🔄 Update Workflow

### Local Development
1. Make changes to code
2. Auto-commit will create checkpoint every 5 minutes
3. Changes reflect immediately (hot reload)

### Deploy to VPS
```bash
# On VPS
cd /opt/warehouse-wms
sudo git pull
sudo docker-compose -f docker-compose.yml up -d --build
```

---

## 🎯 Best Practices

### Security
- ✅ Change all default passwords in `.env`
- ✅ Use strong JWT secret (32+ random characters)
- ✅ Enable firewall on VPS
- ✅ Use SSL certificate for production
- ✅ Regular database backups

### Performance
- ✅ Use production build for deployment
- ✅ Enable Nginx caching for static assets
- ✅ Monitor container resource usage
- ✅ Regular Docker cleanup: `docker system prune`

### Backups
```bash
# Database backup (run daily)
docker exec wms-database mysqldump -u root -p warehouse_wms > backup-$(date +%Y%m%d).sql

# Uploads backup
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz backend/uploads/

# Full backup script
./scripts/backup.sh
```

---

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify all containers are running: `docker ps`
3. Check this troubleshooting guide
4. Review Docker and application logs

---

**🎉 You're all set! Your WMS application is now running in Docker with automatic Git commits and is ready for easy VPS deployment!**
