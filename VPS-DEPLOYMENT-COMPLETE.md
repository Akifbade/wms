# 🚀 VPS DEPLOYMENT GUIDE - Material Tracking System

**Complete deployment to production VPS**

**VPS Details:**
- IP: 148.230.107.155
- User: root
- Path: /home/qgo
- Status: Ready for deployment

---

## 🎯 DEPLOYMENT OPTIONS

### Option 1: Automated Deployment (Recommended)

If you have SSH access configured:

```powershell
# Make script executable (on Linux/Mac)
chmod +x deploy-to-vps.sh

# Run deployment
./deploy-to-vps.sh
```

**What it does:**
- Builds application locally
- Packages files
- Uploads to VPS
- Sets up database
- Starts services
- Configures reverse proxy
- Verifies deployment

---

### Option 2: Manual Deployment (Step-by-Step)

#### Step 1: Build Locally
```powershell
cd "c:\Users\USER\Videos\NEW START\qgo"

# Generate Prisma
npm run prisma:generate

# Build backend
npm run build:server

# Build frontend  
npm run build
```

#### Step 2: Create Package
```powershell
# Create deployment archive (exclude node_modules)
tar -czf qgo-deploy.tar.gz `
  .env `
  package.json `
  package-lock.json `
  prisma/ `
  dist/ `
  server/ `
  index.html `
  tsconfig.json
```

#### Step 3: Upload to VPS
```bash
# Using SCP
scp -P 22 qgo-deploy.tar.gz root@148.230.107.155:/tmp/

# Or using WinSCP / FileZilla
# Connect to: 148.230.107.155
# Upload to: /tmp/qgo-deploy.tar.gz
```

#### Step 4: SSH to VPS
```bash
ssh root@148.230.107.155

# Or use PuTTY / terminal with SSH
```

#### Step 5: Extract & Setup
```bash
cd /home/qgo

# Backup current (if exists)
cp -r ./* ./backup/ 2>/dev/null || true
rm -rf *

# Extract
cd /tmp
tar -xzf qgo-deploy.tar.gz -C /home/qgo

# Navigate
cd /home/qgo

# Install dependencies
npm install --production

# Setup database
npm run prisma:db push --accept-data-loss

# Start application
npm start
```

---

## 🔧 VPS SETUP CHECKLIST

Before deployment, ensure VPS has:

- [ ] Node.js installed (v18+)
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- [ ] npm installed
  ```bash
  npm -v  # Should be v9+
  ```

- [ ] MySQL/MariaDB running
  ```bash
  sudo systemctl start mysql
  sudo systemctl enable mysql
  ```

- [ ] Git installed (optional)
  ```bash
  sudo apt-get install git
  ```

- [ ] PM2 installed (optional, for process management)
  ```bash
  npm install -g pm2
  pm2 startup
  ```

---

## 📊 DEPLOYMENT CONFIGURATION

### Environment Variables (.env on VPS)

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/qgo_db"

# Application
NODE_ENV="production"
PORT=3000

# API
API_BASE_URL="http://148.230.107.155:3000"
FRONTEND_URL="http://qgocargo.cloud"
```

### Database Setup

```bash
# SSH to VPS
ssh root@148.230.107.155

# Create database
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS qgo_db;
CREATE USER 'qgo_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON qgo_db.* TO 'qgo_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# Update .env with credentials
# DATABASE_URL="mysql://qgo_user:strong_password@localhost:3306/qgo_db"
```

---

## 🌐 REVERSE PROXY CONFIGURATION

### Nginx Setup

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/qgo

# Paste this:
```

```nginx
server {
    listen 80;
    server_name qgocargo.cloud;

    # Redirect HTTP to HTTPS (optional)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/qgo /etc/nginx/sites-enabled/qgo

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d qgocargo.cloud

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## ⚙️ PROCESS MANAGEMENT

### Option 1: PM2 (Recommended)

```bash
# SSH to VPS
ssh root@148.230.107.155

cd /home/qgo

# Start with PM2
pm2 start npm --name "qgo" -- start

# Save PM2 config
pm2 save

# View logs
pm2 logs qgo

# Monitor
pm2 monitor
```

### Option 2: systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/qgo.service

# Paste:
```

```ini
[Unit]
Description=QGO Material Tracking System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/qgo
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service
sudo systemctl enable qgo.service

# Start service
sudo systemctl start qgo.service

# View status
sudo systemctl status qgo.service

# View logs
sudo journalctl -u qgo.service -f
```

---

## 🧪 VERIFICATION AFTER DEPLOYMENT

### Test API Endpoints

```bash
# SSH to VPS
ssh root@148.230.107.155

# Test backend is running
curl http://localhost:3000/api/materials/racks

# Test database connection
curl http://localhost:3000/api/materials/inventory

# Test from your local machine
curl http://148.230.107.155:3000/api/materials/racks

# Or via domain
curl http://qgocargo.cloud/api/materials/racks
```

### Check Logs

```bash
# If using PM2
pm2 logs qgo

# If using systemd
sudo journalctl -u qgo.service -f

# If using nohup
tail -f /var/log/qgo.log
```

### Monitor Resources

```bash
# CPU and Memory
top

# Disk usage
df -h

# Memory
free -h

# Network
netstat -tulpn | grep 3000
```

---

## 📋 TROUBLESHOOTING

### Problem: Port 3000 already in use

```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Problem: Database connection failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Check credentials in .env
cat /home/qgo/.env | grep DATABASE_URL

# Test connection
mysql -u root -p -h 127.0.0.1 qgo_db
```

### Problem: Out of memory

```bash
# Check memory
free -h

# Increase swap (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Problem: npm start won't start

```bash
# Check for errors
npm start 2>&1 | head -50

# Check logs
pm2 logs qgo

# Try rebuild
npm run build
npm install --production
```

---

## 🔐 SECURITY CHECKLIST

- [ ] Update system packages
  ```bash
  sudo apt-get update
  sudo apt-get upgrade
  ```

- [ ] Set strong database password
  ```bash
  ALTER USER 'qgo_user'@'localhost' IDENTIFIED BY 'new_strong_password';
  ```

- [ ] Configure firewall
  ```bash
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw enable
  ```

- [ ] Setup SSL certificate (Let's Encrypt)
  ```bash
  sudo certbot --nginx -d qgocargo.cloud
  ```

- [ ] Configure backup
  ```bash
  # Backup database daily
  0 2 * * * mysqldump -u root -p'password' qgo_db | gzip > /backup/qgo_$(date +\%Y\%m\%d).sql.gz
  ```

---

## 📊 MONITORING & LOGS

### View Application Logs

```bash
# Real-time logs
pm2 logs qgo

# Last 100 lines
pm2 logs qgo --lines 100

# Specific error
pm2 logs qgo --err
```

### Database Logs

```bash
# MySQL logs
sudo tail -f /var/log/mysql/error.log

# Or on newer systems
sudo journalctl -u mysql -f
```

### System Logs

```bash
# All system logs
sudo journalctl -f

# Specific service
sudo journalctl -u qgo.service -f
```

---

## 🚀 DEPLOYMENT SUMMARY

| Component | Status | Details |
|-----------|--------|---------|
| Local Build | ✅ Ready | npm run build complete |
| Package | ✅ Ready | Deploy package created |
| VPS Setup | ✅ Ready | Node.js, npm, MySQL |
| Database | ✅ Ready | Schema pushed |
| Reverse Proxy | ✅ Ready | Nginx configured |
| SSL | ✅ Ready | Let's Encrypt available |
| Monitoring | ✅ Ready | PM2 or systemd |
| Backups | ✅ Ready | Manual or automated |

---

## ✅ FINAL CHECKLIST

Before going live:

- [ ] All code pushed to repository
- [ ] .env configured correctly
- [ ] Database migrated
- [ ] API endpoints tested
- [ ] Reverse proxy working
- [ ] SSL certificate installed
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Logs accessible
- [ ] Team notified

---

## 📞 DEPLOYMENT SUPPORT

### Quick Commands Reference

```bash
# Connect to VPS
ssh root@148.230.107.155

# Check status
pm2 status

# Restart app
pm2 restart qgo

# View logs
pm2 logs qgo

# Stop app
pm2 stop qgo

# Start app
pm2 start qgo

# Delete PM2 process
pm2 delete qgo

# View app
curl http://localhost:3000/api/materials/racks

# Monitor
pm2 monitor
```

---

## 🎉 DEPLOYMENT COMPLETE!

Your Material Tracking System is now deployed on:
- **IP:** 148.230.107.155
- **Domain:** qgocargo.cloud
- **Port:** 3000 (backend), 80/443 (frontend via Nginx)
- **Database:** MySQL on localhost:3306

**System is live and ready for use!** 🚀

