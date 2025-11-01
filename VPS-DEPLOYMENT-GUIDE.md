# VPS DEPLOYMENT GUIDE - Warehouse Management System

## ✅ BACKUP COMPLETED
**Backup Location**: `C:\Users\USER\Videos\NEW_START_BACKUP_2025-10-14_222634`

Your entire system has been backed up (excluding node_modules, dist, build, .git to save space).

---

## 🚀 VPS DEPLOYMENT STEPS

### Prerequisites on VPS:
- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Minimum 2GB RAM, 20GB storage
- Domain name (optional but recommended)

---

## STEP 1: Prepare Your VPS

SSH into your VPS and run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (web server)
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

---

## STEP 2: Setup MySQL Database

```bash
# Secure MySQL installation
sudo mysql_secure_installation
# Answer: Y to all questions, set a strong root password

# Create database and user
sudo mysql -u root -p

# Inside MySQL prompt:
CREATE DATABASE wms_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wms_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON wms_production.* TO 'wms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## STEP 3: Upload Your Code to VPS

### Option A: Using Git (Recommended)
```bash
# On your local machine, push to GitHub/GitLab first
cd "C:\Users\USER\Videos\NEW START"
git init
git add .
git commit -m "Initial commit for VPS deployment"
git remote add origin YOUR_GIT_REPO_URL
git push -u origin main

# On VPS, clone the repository
cd /var/www
sudo git clone YOUR_GIT_REPO_URL wms
sudo chown -R $USER:$USER /var/www/wms
cd /var/www/wms
```

### Option B: Using SCP (Direct Upload)
```bash
# On your local machine (PowerShell)
scp -r "C:\Users\USER\Videos\NEW START" root@YOUR_VPS_IP:/var/www/wms
```

---

## STEP 4: Setup Backend

```bash
cd /var/www/wms/backend

# Install dependencies
npm install

# Create production .env file
nano .env
```

Add this to `.env`:
```env
# Database
DATABASE_URL="mysql://wms_user:YOUR_STRONG_PASSWORD_HERE@localhost:3306/wms_production"

# Server
NODE_ENV=production
PORT=5000

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long

# CORS (your domain)
CORS_ORIGIN=https://yourdomain.com

# Fleet disabled
FLEET_ENABLED=false
```

```bash
# Update Prisma schema for MySQL
nano prisma/schema.prisma
```

Change datasource from SQLite to MySQL:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

```bash
# Run migrations
npx prisma generate
npx prisma migrate deploy

# Test backend
npm run build
npm start

# If works, stop it (Ctrl+C) and setup PM2
pm2 start npm --name "wms-backend" -- start
pm2 save
pm2 startup
```

---

## STEP 5: Setup Frontend

```bash
cd /var/www/wms/frontend

# Install dependencies
npm install

# Create production .env file
nano .env.production
```

Add this:
```env
VITE_API_URL=https://yourdomain.com/api
```

```bash
# Build for production
npm run build

# The build will be in /var/www/wms/frontend/dist
```

---

## STEP 6: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/wms
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /var/www/wms/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload files
    location /uploads {
        alias /var/www/wms/backend/public/uploads;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/wms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## STEP 7: Setup SSL (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
# Test renewal:
sudo certbot renew --dry-run
```

---

## STEP 8: Setup Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## STEP 9: Create Admin User

```bash
cd /var/www/wms/backend
node -e "
const bcrypt = require('bcrypt');
const password = 'YourAdminPassword123!';
bcrypt.hash(password, 10, (err, hash) => {
  console.log('Hashed password:', hash);
  console.log('Use this in MySQL INSERT statement');
});
"
```

Then insert admin user:
```bash
mysql -u wms_user -p wms_production

INSERT INTO users (id, email, password, name, role, companyId, isActive, createdAt, updatedAt)
VALUES (
  'admin001',
  'admin@yourdomain.com',
  'PASTE_HASHED_PASSWORD_HERE',
  'Admin User',
  'ADMIN',
  'company001',
  1,
  NOW(),
  NOW()
);

INSERT INTO companies (id, name, email, isActive, createdAt, updatedAt)
VALUES (
  'company001',
  'Your Company Name',
  'admin@yourdomain.com',
  1,
  NOW(),
  NOW()
);

EXIT;
```

---

## STEP 10: Test Your Deployment

1. Visit `https://yourdomain.com`
2. Login with your admin credentials
3. Test all features:
   - Create shipment
   - Scan QR code
   - Generate invoice
   - Check dashboard

---

## Maintenance Commands

```bash
# View backend logs
pm2 logs wms-backend

# Restart backend
pm2 restart wms-backend

# Update code from Git
cd /var/www/wms
git pull
cd backend && npm install && npx prisma migrate deploy && pm2 restart wms-backend
cd ../frontend && npm install && npm run build

# Backup database
mysqldump -u wms_user -p wms_production > backup_$(date +%Y%m%d).sql

# Monitor system
pm2 monit
htop
```

---

## Troubleshooting

### Backend not starting:
```bash
pm2 logs wms-backend
# Check .env file
# Check MySQL connection
```

### Frontend not loading:
```bash
sudo nginx -t
sudo systemctl status nginx
# Check frontend build: ls -la /var/www/wms/frontend/dist
```

### Database connection error:
```bash
mysql -u wms_user -p wms_production
# Test connection
# Check DATABASE_URL in .env
```

---

## Security Checklist

- ✅ Change all default passwords
- ✅ Setup SSL (HTTPS)
- ✅ Enable firewall
- ✅ Setup automatic MySQL backups
- ✅ Keep system updated: `sudo apt update && sudo apt upgrade`
- ✅ Use strong JWT_SECRET (32+ characters)
- ✅ Restrict MySQL to localhost only
- ✅ Setup PM2 auto-restart on crash

---

## Next Steps

1. Point your domain DNS to your VPS IP
2. Wait for DNS propagation (5-30 minutes)
3. Access your app at https://yourdomain.com
4. Setup automatic database backups (cron job)
5. Setup monitoring (optional: UptimeRobot, Datadog)

---

**Your system is backed up and ready for deployment! 🚀**
