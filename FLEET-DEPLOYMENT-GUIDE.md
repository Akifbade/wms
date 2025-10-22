# Fleet Management Module - Deployment Guide

**Version**: 1.0.0  
**Date**: October 14, 2025  
**Status**: Production Ready 🚀

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Rollback Procedure](#rollback-procedure)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript compilation errors resolved (`npx tsc --noEmit`)
- [ ] All tests passing (`npm test`)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Git repository clean (no uncommitted changes)

### Database
- [ ] Database migrations created and tested
- [ ] Seed data prepared (optional)
- [ ] Database backup created
- [ ] Schema validated in staging environment

### Configuration
- [ ] Environment variables documented
- [ ] API keys and secrets secured
- [ ] Feature flags configured
- [ ] CORS settings configured for production domains

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] GPS tracking tested with real devices
- [ ] Offline sync tested
- [ ] Performance testing completed

### Security
- [ ] JWT secret configured
- [ ] Database credentials secured
- [ ] API rate limiting enabled
- [ ] HTTPS certificates configured
- [ ] Security headers configured

---

## 🔐 Environment Variables

### Backend (.env)

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL="file:./dev.db"  # Use PostgreSQL in production
# Example PostgreSQL: 
# DATABASE_URL="postgresql://user:password@localhost:5432/wms_db"

# ============================================
# SERVER
# ============================================
PORT=5000
NODE_ENV=production

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# ============================================
# FLEET MANAGEMENT MODULE
# ============================================
# Feature toggle
FLEET_ENABLED=true

# GPS Configuration
FLEET_GPS_SAMPLE_MS=30000        # GPS sample interval (30 seconds)
FLEET_IDLE_SPEED_KMPH=5          # Speed threshold for idle detection
FLEET_IDLE_MIN=5                 # Minimum idle duration to track (minutes)

# Speed & Distance
FLEET_SPEED_MAX_KMPH=120         # Maximum allowed speed
FLEET_MAX_JUMP_METERS=500        # Max distance between GPS points (sanity check)

# Fuel & Card Management
FLEET_CARD_LIMIT_DEFAULT=2500.00 # Default monthly card limit (AED)
FLEET_CARD_ALERT_PERCENT=80      # Alert when card usage exceeds this %

# Background Jobs
FLEET_AUTO_END_MINS=20           # Auto-end trips after N minutes of inactivity

# Google Maps (optional - for enhanced features)
GOOGLE_MAPS_KEY=""               # Leave empty to use OpenStreetMap

# ============================================
# CORS (Frontend URLs)
# ============================================
CORS_ORIGIN="http://localhost:3000,https://your-domain.com"

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info  # debug, info, warn, error
```

### Frontend (.env)

```bash
# ============================================
# API Configuration
# ============================================
VITE_API_URL=http://localhost:5000  # Change to production URL
# Example: VITE_API_URL=https://api.your-domain.com

# ============================================
# Feature Flags
# ============================================
VITE_FLEET_ENABLED=true

# ============================================
# Google Maps (optional)
# ============================================
VITE_GOOGLE_MAPS_KEY=""  # Leave empty to use OpenStreetMap

# ============================================
# PWA Configuration
# ============================================
VITE_APP_NAME="WMS Fleet Manager"
VITE_APP_SHORT_NAME="Fleet"
VITE_APP_DESCRIPTION="Fleet Management & GPS Tracking"
```

---

## 🗄️ Database Setup

### Option 1: SQLite (Development/Small Scale)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Generate Prisma client
npx prisma generate

# 3. Run migrations
npx prisma migrate deploy

# 4. (Optional) Seed data
npx ts-node prisma/seeds/fleet.seed.ts
```

### Option 2: PostgreSQL (Production)

```bash
# 1. Create PostgreSQL database
createdb wms_production

# 2. Update DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/wms_production"

# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations
npx prisma migrate deploy

# 5. Verify database
npx prisma db pull
npx prisma validate

# 6. (Optional) Seed data
npx ts-node prisma/seeds/fleet.seed.ts
```

### Database Backup (Before Deployment)

```bash
# SQLite
cp backend/prisma/dev.db backend/prisma/dev.db.backup-$(date +%Y%m%d)

# PostgreSQL
pg_dump wms_production > backup-$(date +%Y%m%d).sql
```

---

## 🚀 Backend Deployment

### Step 1: Build TypeScript

```bash
cd backend

# Install dependencies
npm ci --production=false

# Build TypeScript to JavaScript
npm run build

# Output will be in: dist/
```

### Step 2: Start Production Server

#### Option A: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name "wms-backend" --instances 2 --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# View logs
pm2 logs wms-backend

# Monitor
pm2 monit
```

#### Option B: Docker

```dockerfile
# Dockerfile (backend)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "dist/index.js"]
```

```bash
# Build image
docker build -t wms-backend:1.0.0 .

# Run container
docker run -d \
  --name wms-backend \
  -p 5000:5000 \
  --env-file .env \
  wms-backend:1.0.0
```

#### Option C: Systemd Service

```ini
# /etc/systemd/system/wms-backend.service
[Unit]
Description=WMS Fleet Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/wms-backend
Environment="NODE_ENV=production"
EnvironmentFile=/var/www/wms-backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable wms-backend
sudo systemctl start wms-backend
sudo systemctl status wms-backend

# View logs
sudo journalctl -u wms-backend -f
```

### Step 3: Configure Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/wms-api
server {
    listen 80;
    server_name api.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/wms-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🌐 Frontend Deployment

### Step 1: Build React App

```bash
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Output will be in: dist/
```

### Step 2: Deploy Static Files

#### Option A: Nginx (Static Hosting)

```nginx
# /etc/nginx/sites-available/wms-frontend
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /var/www/wms-frontend/dist;
    index index.html;

    # PWA cache headers
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker should not be cached
    location /sw.js {
        add_header Cache-Control "no-cache";
        expires 0;
    }

    # Manifest should not be cached
    location /manifest.json {
        add_header Cache-Control "no-cache";
        expires 0;
    }

    # React Router - all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Copy build files
sudo cp -r dist/* /var/www/wms-frontend/

# Enable site
sudo ln -s /etc/nginx/sites-available/wms-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Option B: Docker

```dockerfile
# Dockerfile (frontend)
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build image
docker build -t wms-frontend:1.0.0 .

# Run container
docker run -d \
  --name wms-frontend \
  -p 80:80 \
  wms-frontend:1.0.0
```

#### Option C: Vercel/Netlify (Easiest)

```bash
# Vercel
npm install -g vercel
vercel --prod

# Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

---

## ✅ Post-Deployment Verification

### 1. Backend Health Check

```bash
# Test API endpoint
curl https://api.your-domain.com/api/health

# Expected response:
# { "status": "ok", "fleet": true }
```

### 2. Frontend Access

```bash
# Open in browser
https://your-domain.com

# Check console for errors (F12)
# Verify:
# - No 404 errors
# - No CORS errors
# - Service worker registered
# - API calls working
```

### 3. Fleet Module Tests

```bash
# Login to admin dashboard
https://your-domain.com/login

# Navigate to Fleet section
https://your-domain.com/fleet

# Verify:
# - Dashboard loads with stats
# - Vehicles list loads
# - Drivers list loads
# - Live tracking map loads
# - No console errors
```

### 4. Driver PWA Test

```bash
# Open driver app
https://your-domain.com/driver

# On mobile device:
# - Open in Chrome/Safari
# - Menu → "Add to Home Screen"
# - Install PWA
# - Open installed app
# - Test starting trip
# - Test GPS tracking
# - Test offline mode (turn off wifi)
```

### 5. Background Jobs Verification

```bash
# Check PM2 logs
pm2 logs wms-backend

# Look for:
# "🚛 Fleet Jobs: Background jobs active!"
# "[Fleet Jobs] Trip Auto-End: Checking for stale trips..."

# Verify trips auto-end after 20 minutes of inactivity
```

---

## 📊 Monitoring & Maintenance

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs wms-backend --lines 100

# Restart if needed
pm2 restart wms-backend

# Check memory/CPU usage
pm2 show wms-backend
```

### Database Monitoring

```bash
# SQLite - check file size
ls -lh backend/prisma/dev.db

# PostgreSQL - monitor active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -U postgres -c "SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

### Log Rotation

```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Daily Backups

```bash
# Create backup script: /usr/local/bin/backup-wms.sh
#!/bin/bash

BACKUP_DIR="/var/backups/wms"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump wms_production > "$BACKUP_DIR/db_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/db_$DATE.sql"

# Keep last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-wms.sh >> /var/log/wms-backup.log 2>&1
```

---

## ⏪ Rollback Procedure

### If Deployment Fails

#### Backend Rollback

```bash
# PM2 rollback to previous version
cd /var/www/wms-backend
git checkout previous-tag  # or specific commit
npm ci
npm run build
pm2 restart wms-backend

# Verify
curl https://api.your-domain.com/api/health
```

#### Database Rollback

```bash
# Restore from backup
psql wms_production < /var/backups/wms/db_YYYYMMDD_HHMMSS.sql

# Or use Prisma migration rollback
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

#### Frontend Rollback

```bash
# Restore previous build
cd /var/www/wms-frontend
rm -rf dist
git checkout previous-tag
npm ci
npm run build
sudo cp -r dist/* /var/www/wms-frontend/
sudo systemctl reload nginx
```

---

## 🔧 Troubleshooting

### Issue: Backend not starting

**Check:**
```bash
# View logs
pm2 logs wms-backend

# Check port availability
sudo netstat -tulpn | grep :5000

# Check environment variables
pm2 env wms-backend
```

**Solution:**
```bash
# Kill process on port
sudo kill -9 $(lsof -t -i:5000)

# Restart
pm2 restart wms-backend
```

### Issue: Database connection failed

**Check:**
```bash
# Test database connection
npx prisma db pull

# Check DATABASE_URL
echo $DATABASE_URL
```

**Solution:**
```bash
# Fix DATABASE_URL in .env
# Regenerate Prisma client
npx prisma generate

# Restart backend
pm2 restart wms-backend
```

### Issue: GPS not tracking

**Check:**
1. Browser console for errors
2. HTTPS is enabled (geolocation requires HTTPS)
3. User granted location permissions
4. `/api/fleet/trips/:id/track` endpoint working

**Solution:**
```bash
# Test GPS endpoint
curl -X POST https://api.your-domain.com/api/fleet/trips/TRIP_ID/track \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":25.2048,"lng":55.2708,"speedKmph":45,"accuracy":10}'
```

### Issue: Service Worker not updating

**Solution:**
```bash
# Clear cache and unregister
# In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(r => r.unregister());
});

# Hard refresh
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Issue: 500 errors on trip endpoints

**Check:**
```bash
# Backend logs
pm2 logs wms-backend

# Common causes:
# - Prisma relation errors
# - Missing environment variables
# - Database connection issues
```

**Solution:**
- Check `FLEET-ISSUES-FIXED.md` for known issues
- Verify all Prisma includes don't reference optional relations
- Check backend error logs for stack trace

---

## 📱 Mobile App Considerations

### PWA Installation

1. **Android (Chrome)**:
   - Open https://your-domain.com/driver
   - Menu → "Add to Home screen"
   - Accept prompt

2. **iOS (Safari)**:
   - Open https://your-domain.com/driver
   - Share button → "Add to Home Screen"
   - Name app and add

### HTTPS Requirement

- Geolocation API requires HTTPS
- Service Workers require HTTPS
- Use Let's Encrypt for free SSL certificates

### Offline Functionality

- GPS points queued in IndexedDB
- Synced when connection restored
- Trip data cached locally

---

## 📝 Post-Deployment Tasks

- [ ] Update DNS records if needed
- [ ] Configure SSL certificates auto-renewal
- [ ] Setup monitoring alerts (Sentry, LogRocket)
- [ ] Schedule daily database backups
- [ ] Train users on new system
- [ ] Create user documentation
- [ ] Schedule maintenance windows
- [ ] Setup error tracking
- [ ] Configure analytics (optional)
- [ ] Test disaster recovery procedure

---

## 🎉 Deployment Complete!

Your Fleet Management Module is now live and ready for use!

**Key URLs**:
- Frontend: https://your-domain.com
- API: https://api.your-domain.com
- Driver PWA: https://your-domain.com/driver
- Admin Dashboard: https://your-domain.com/fleet

**Support**:
- Documentation: `FLEET-MODULE-IMPLEMENTATION.md`
- User Guides: `DRIVER-APP-USER-GUIDE.md`
- Troubleshooting: `LIVE-TRACKING-TROUBLESHOOTING.md`

---

**Deployed by**: [Your Name]  
**Deployment Date**: October 14, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
